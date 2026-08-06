import { describe, expect, it } from "vitest";
import { computeGoalsPlan } from "../../../src/domain/planner/goalsPlan";
import { localDate } from "../../../src/domain/dates";
import { cents } from "../../../src/domain/money";
import type { Category, Goal, Transaction } from "../../../src/domain/types";

const TODAY = localDate("2026-03-15");
const ACCOUNT_CREATED = localDate("2025-01-01");

function goal(partial: Partial<Goal> & Pick<Goal, "id" | "priority">): Goal {
  return {
    name: partial.id,
    iconKey: "flag",
    targetCents: cents(100000),
    status: "active",
    createdAt: ACCOUNT_CREATED,
    ...partial,
  };
}

const WANT_CAT: Category = {
  id: "cat-dining",
  name: "Dining",
  iconKey: "utensils",
  colorToken: "cat-4",
  kind: "want",
  isArchived: false,
};

let txCounter = 0;
function expense(categoryId: string, amount: number, date: string): Transaction {
  txCounter += 1;
  return {
    id: `tx-${txCounter}`,
    type: "expense",
    amountCents: cents(amount),
    categoryId,
    date: localDate(date),
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
  };
}

describe("computeGoalsPlan - feasible case", () => {
  it("fully allocates every goal's requirement when free cash flow covers it", () => {
    const goals = [
      goal({ id: "A", priority: "high", targetCents: cents(300000), targetDate: localDate("2026-06-15") }), // needs 100000/mo
      goal({ id: "B", priority: "medium", targetCents: cents(200000), targetDate: localDate("2026-05-15") }), // needs 100000/mo
    ];
    const plan = computeGoalsPlan(goals, [], [], cents(300000), ACCOUNT_CREATED, TODAY, "USD");

    expect(plan.totalRequiredMonthlyCents).toBe(200000);
    expect(plan.isFeasible).toBe(true);
    expect(plan.tradeOffs).toEqual([]);
    const a = plan.items.find((i) => i.goalId === "A");
    const b = plan.items.find((i) => i.goalId === "B");
    expect(a?.allocatedMonthlyCents).toBe(100000);
    expect(a?.isFullyFunded).toBe(true);
    expect(b?.allocatedMonthlyCents).toBe(100000);
    expect(b?.isFullyFunded).toBe(true);
  });
});

describe("computeGoalsPlan - infeasible case: priority waterfall", () => {
  it("fully funds higher priority before partially funding lower priority", () => {
    const goals = [
      goal({ id: "A", priority: "high", targetCents: cents(300000), targetDate: localDate("2026-06-15") }), // needs 100000/mo
      goal({ id: "B", priority: "medium", targetCents: cents(600000), targetDate: localDate("2026-05-15") }), // needs 300000/mo
    ];
    // Only 250000 available - not enough for both (400000 total required).
    const plan = computeGoalsPlan(goals, [], [], cents(250000), ACCOUNT_CREATED, TODAY, "USD");

    expect(plan.isFeasible).toBe(false);
    expect(plan.totalRequiredMonthlyCents).toBe(400000);

    const a = plan.items.find((i) => i.goalId === "A");
    const b = plan.items.find((i) => i.goalId === "B");
    expect(a?.allocatedMonthlyCents).toBe(100000); // fully funded first
    expect(a?.isFullyFunded).toBe(true);
    expect(b?.allocatedMonthlyCents).toBe(150000); // whatever's left over
    expect(b?.isFullyFunded).toBe(false);

    // Only the underfunded goal gets a trade-off suggestion.
    expect(plan.tradeOffs).toHaveLength(1);
    expect(plan.tradeOffs[0]?.goalId).toBe("B");
    // shortfall = required(300000) - allocated(150000) = 150000 = $1,500.00
    expect(plan.tradeOffs[0]?.message).toContain("$1,500.00");
  });

  it("breaks a priority tie by earlier target date", () => {
    const goals = [
      goal({ id: "SOON", priority: "high", targetCents: cents(100000), targetDate: localDate("2026-04-15") }), // 1mo away -> needs 100000/mo
      goal({ id: "LATER", priority: "high", targetCents: cents(300000), targetDate: localDate("2026-06-15") }), // 3mo away -> needs 100000/mo
    ];
    // Only enough for one of the two equally-required, equal-priority goals.
    const plan = computeGoalsPlan(goals, [], [], cents(100000), ACCOUNT_CREATED, TODAY, "USD");

    const soon = plan.items.find((i) => i.goalId === "SOON");
    const later = plan.items.find((i) => i.goalId === "LATER");
    expect(soon?.allocatedMonthlyCents).toBe(100000);
    expect(soon?.isFullyFunded).toBe(true);
    expect(later?.allocatedMonthlyCents).toBe(0);
    expect(later?.isFullyFunded).toBe(false);
  });

  it("trade-off message names a discretionary category when one has real spend history", () => {
    const goals = [goal({ id: "A", priority: "high", targetCents: cents(300000), targetDate: localDate("2026-06-15") })];
    const transactions = [
      expense(WANT_CAT.id, 20000, "2026-01-05"),
      expense(WANT_CAT.id, 20000, "2026-02-05"),
      expense(WANT_CAT.id, 20000, "2026-03-05"),
    ];
    const plan = computeGoalsPlan(goals, transactions, [WANT_CAT], cents(0), ACCOUNT_CREATED, TODAY, "USD");
    expect(plan.tradeOffs[0]?.message).toContain("Dining");
    expect(plan.tradeOffs[0]?.categoryId).toBe(WANT_CAT.id);
  });

  it("falls back to a simpler message with no category history to suggest trimming", () => {
    const goals = [goal({ id: "A", priority: "high", targetCents: cents(300000), targetDate: localDate("2026-06-15") })];
    const plan = computeGoalsPlan(goals, [], [], cents(0), ACCOUNT_CREATED, TODAY, "USD");
    expect(plan.tradeOffs[0]?.message).not.toContain("trim");
    expect(plan.tradeOffs[0]?.categoryId).toBeUndefined();
  });
});

describe("computeGoalsPlan - goals without a target date", () => {
  it("gets no required/allocated amount and counts as trivially fully funded", () => {
    const goals = [goal({ id: "A", priority: "high", targetDate: undefined })];
    const plan = computeGoalsPlan(goals, [], [], cents(500000), ACCOUNT_CREATED, TODAY, "USD");
    const a = plan.items.find((i) => i.goalId === "A");
    expect(a?.requiredMonthlyCents).toBe(0);
    expect(a?.allocatedMonthlyCents).toBe(0);
    expect(a?.isFullyFunded).toBe(true);
  });
});

describe("computeGoalsPlan - non-active goals", () => {
  it("excludes paused and completed goals from the plan entirely", () => {
    const goals = [
      goal({ id: "PAUSED", priority: "high", status: "paused", targetDate: localDate("2026-06-15") }),
      goal({ id: "DONE", priority: "high", status: "completed", targetDate: localDate("2026-06-15") }),
    ];
    const plan = computeGoalsPlan(goals, [], [], cents(500000), ACCOUNT_CREATED, TODAY, "USD");
    expect(plan.items).toEqual([]);
  });
});
