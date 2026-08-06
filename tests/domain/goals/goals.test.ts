import { describe, expect, it } from "vitest";
import { localDate } from "../../../src/domain/dates";
import { cents } from "../../../src/domain/money";
import {
  computeAverageMonthlyContribution,
  computeFundedCents,
  detectNewlyCrossedMilestones,
  projectedCompletionDate,
  requiredMonthlyForTargetDate,
  withProgress,
} from "../../../src/domain/goals/goals";
import type { Goal, Transaction } from "../../../src/domain/types";

const GOAL_ID = "goal-1";
const OTHER_GOAL_ID = "goal-2";

let txCounter = 0;
function contribution(goalId: string, amount: number, date: string): Transaction {
  txCounter += 1;
  return {
    id: `tx-${txCounter}`,
    type: "goalContribution",
    amountCents: cents(amount),
    categoryId: "system-savings",
    goalId,
    date: localDate(date),
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
  };
}

function goal(partial: Partial<Goal>): Goal {
  return {
    id: GOAL_ID,
    name: "Test goal",
    iconKey: "flag",
    targetCents: cents(100000),
    priority: "medium",
    status: "active",
    createdAt: localDate("2025-01-01"),
    ...partial,
  };
}

describe("computeFundedCents / withProgress", () => {
  const transactions: Transaction[] = [
    contribution(GOAL_ID, 5000, "2026-01-01"),
    contribution(GOAL_ID, 3000, "2026-02-01"),
    contribution(OTHER_GOAL_ID, 9999, "2026-01-01"), // different goal - excluded
  ];

  it("sums only goalContribution transactions for this goal", () => {
    expect(computeFundedCents(GOAL_ID, transactions)).toBe(8000);
  });

  it("withProgress attaches the derived fundedCents without mutating other fields", () => {
    const g = goal({});
    const result = withProgress(g, transactions);
    expect(result.fundedCents).toBe(8000);
    expect(result.name).toBe(g.name);
    expect(result.targetCents).toBe(g.targetCents);
  });
});

describe("computeAverageMonthlyContribution", () => {
  it("averages over the trailing 3-month window when the goal predates it", () => {
    const g = goal({ createdAt: localDate("2025-01-01") });
    const transactions = [
      contribution(GOAL_ID, 10000, "2026-01-10"),
      contribution(GOAL_ID, 20000, "2026-02-10"),
      contribution(GOAL_ID, 30000, "2026-03-10"),
      // outside the trailing window (before 2025-12-15) - excluded
      contribution(GOAL_ID, 99999, "2025-11-01"),
    ];
    // window: [2025-12-15, 2026-03-15], 3 elapsed months, 60000 total -> 20000/mo
    const avg = computeAverageMonthlyContribution(g, transactions, localDate("2026-03-15"));
    expect(avg).toBe(20000);
  });

  it("uses the goal's creation date as the window start when younger than the window", () => {
    const g = goal({ createdAt: localDate("2026-02-01") });
    const transactions = [contribution(GOAL_ID, 15000, "2026-02-15")];
    // effective start = 2026-02-01, 1 elapsed month to 2026-03-15 -> 15000/mo
    const avg = computeAverageMonthlyContribution(g, transactions, localDate("2026-03-15"));
    expect(avg).toBe(15000);
  });

  it("floors elapsed months at 1 for a goal created this same month", () => {
    const g = goal({ createdAt: localDate("2026-03-01") });
    const transactions = [contribution(GOAL_ID, 5000, "2026-03-05")];
    const avg = computeAverageMonthlyContribution(g, transactions, localDate("2026-03-15"));
    expect(avg).toBe(5000);
  });

  it("returns zero with no contributions in the window", () => {
    const g = goal({ createdAt: localDate("2025-01-01") });
    expect(computeAverageMonthlyContribution(g, [], localDate("2026-03-15"))).toBe(0);
  });
});

describe("projectedCompletionDate", () => {
  it("projects forward at the current average monthly pace", () => {
    const g = goal({ createdAt: localDate("2025-01-01"), targetCents: cents(100000) });
    const transactions = [
      contribution(GOAL_ID, 10000, "2026-01-10"),
      contribution(GOAL_ID, 10000, "2026-02-10"),
      contribution(GOAL_ID, 10000, "2026-03-10"),
    ];
    // funded=30000, avg=10000/mo, remaining=70000 -> ceil(70000/10000)=7 months
    const projected = projectedCompletionDate(g, transactions, localDate("2026-03-15"));
    expect(projected).toBe("2026-10-15");
  });

  it("returns null when already fully funded", () => {
    const g = goal({ targetCents: cents(1000) });
    const transactions = [contribution(GOAL_ID, 1000, "2026-01-01")];
    expect(projectedCompletionDate(g, transactions, localDate("2026-03-15"))).toBe(null);
  });

  it("returns null when there's no contribution pace to extrapolate from", () => {
    const g = goal({ targetCents: cents(1000) });
    expect(projectedCompletionDate(g, [], localDate("2026-03-15"))).toBe(null);
  });
});

describe("requiredMonthlyForTargetDate", () => {
  it("divides remaining by months left until the target date", () => {
    const g = goal({ targetCents: cents(120000), targetDate: localDate("2026-08-15") });
    const transactions = [contribution(GOAL_ID, 20000, "2026-01-01")];
    // remaining=100000, 5 months from 2026-03-15 to 2026-08-15 -> 20000/mo
    const required = requiredMonthlyForTargetDate(g, transactions, localDate("2026-03-15"));
    expect(required).toBe(20000);
  });

  it("returns null when there's no target date", () => {
    const g = goal({ targetDate: undefined });
    expect(requiredMonthlyForTargetDate(g, [], localDate("2026-03-15"))).toBe(null);
  });

  it("returns zero once fully funded, even with a target date", () => {
    const g = goal({ targetCents: cents(1000), targetDate: localDate("2026-08-15") });
    const transactions = [contribution(GOAL_ID, 1000, "2026-01-01")];
    expect(requiredMonthlyForTargetDate(g, transactions, localDate("2026-03-15"))).toBe(0);
  });

  it("floors months-remaining at 1 for an overdue target date", () => {
    const g = goal({ targetCents: cents(50000), targetDate: localDate("2026-01-01") });
    const required = requiredMonthlyForTargetDate(g, [], localDate("2026-03-15"));
    expect(required).toBe(50000); // full remaining amount, not divided by a negative/zero months count
  });
});

describe("detectNewlyCrossedMilestones", () => {
  const target = cents(100000);

  it("detects a single newly crossed threshold", () => {
    expect(detectNewlyCrossedMilestones(cents(20000), cents(30000), target)).toEqual([25]);
  });

  it("detects multiple thresholds crossed at once by a large contribution", () => {
    expect(detectNewlyCrossedMilestones(cents(10000), cents(100000), target)).toEqual([25, 50, 75, 100]);
  });

  it("does not re-report a threshold already crossed before this change", () => {
    expect(detectNewlyCrossedMilestones(cents(60000), cents(70000), target)).toEqual([]);
  });

  it("treats landing exactly on a threshold as crossed", () => {
    expect(detectNewlyCrossedMilestones(cents(20000), cents(25000), target)).toEqual([25]);
  });

  it("returns nothing for a zero target", () => {
    expect(detectNewlyCrossedMilestones(cents(0), cents(500), cents(0))).toEqual([]);
  });
});
