import { describe, expect, it } from "vitest";
import { computeRewardState, type RewardsInput } from "../../../src/domain/rewards/rewards";
import { localDate, type MonthKey } from "../../../src/domain/dates";
import { cents } from "../../../src/domain/money";
import type { Budget, Goal, Transaction } from "../../../src/domain/types";

const ACCOUNT_CREATED = localDate("2026-03-01");

let txCounter = 0;
function tx(type: Transaction["type"], categoryId: string, amount: number, date: string, goalId?: string): Transaction {
  txCounter += 1;
  return {
    id: `tx-${txCounter}`,
    type,
    amountCents: cents(amount),
    categoryId,
    goalId,
    date: localDate(date),
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
  };
}

function baseInput(overrides: Partial<RewardsInput> = {}): RewardsInput {
  return {
    accountCreatedAt: ACCOUNT_CREATED,
    today: ACCOUNT_CREATED,
    nowIso: "2026-03-01T12:00:00.000Z",
    transactions: [],
    events: [],
    budgets: [],
    goals: [],
    previousBadges: [],
    ...overrides,
  };
}

describe("computeRewardState - points composition", () => {
  it("awards logging points, capped at 15/day", () => {
    const today = ACCOUNT_CREATED;
    const transactions = [
      tx("expense", "cat", 100, "2026-03-01"),
      tx("expense", "cat", 100, "2026-03-01"),
      tx("expense", "cat", 100, "2026-03-01"),
      tx("expense", "cat", 100, "2026-03-01"), // 4th transaction same day - still capped
    ];
    const state = computeRewardState(baseInput({ today, transactions }));
    expect(state.totalPoints).toBe(15);
  });

  it("awards contribution points and a milestone bonus on the crossing contribution", () => {
    const today = localDate("2026-03-05");
    const goal: Goal = {
      id: "g1",
      name: "Trip",
      iconKey: "flag",
      targetCents: cents(10000), // $100
      priority: "medium",
      status: "active",
      createdAt: ACCOUNT_CREATED,
    };
    // $50 contribution crosses 25% and 50% (100000... wait target is 10000 cents = $100)
    const transactions = [tx("goalContribution", "sys-savings", 5000, "2026-03-01", "g1")];
    const state = computeRewardState(baseInput({ today, transactions, goals: [goal] }));
    // contribution points: floor(5000/1000)=5. Milestone: crosses 25 (100) and 50 (150).
    // The contribution is also a logged transaction that day: +5 daily logging points.
    expect(state.totalPoints).toBe(5 + 100 + 150 + 5);
  });

  it("awards the under-allowance day bonus only when a budget exists and is respected", () => {
    const today = ACCOUNT_CREATED;
    const budget: Budget = { id: "b1", categoryId: "cat", month: "2026-03" as MonthKey, limitCents: cents(310000) };
    const smallSpend = [tx("expense", "cat", 1000, "2026-03-01")];
    const withBudget = computeRewardState(baseInput({ today, transactions: smallSpend, budgets: [budget] }));
    const withoutBudget = computeRewardState(baseInput({ today, transactions: smallSpend, budgets: [] }));
    // withBudget: 5 (logging) + 10 (under allowance) = 15. withoutBudget: 5 only.
    expect(withBudget.totalPoints).toBe(15);
    expect(withoutBudget.totalPoints).toBe(5);
  });

  it("awards a streak bonus exactly once when the logging run first reaches 7 days", () => {
    const dates = ["03-01", "03-02", "03-03", "03-04", "03-05", "03-06", "03-07"].map((d) => `2026-${d}`);
    const transactions = dates.map((d) => tx("expense", "cat", 100, d));
    const today = localDate("2026-03-07");
    const state = computeRewardState(baseInput({ today, transactions }));
    // 7 days x 5 logging points (35) + streak-7 bonus (50) = 85
    expect(state.totalPoints).toBe(35 + 50);
  });
});

describe("computeRewardState - badges", () => {
  it("never drops a previously-earned badge even if its criteria would no longer hold", () => {
    const today = ACCOUNT_CREATED;
    // previousBadges already has "first-goal" earned, but the current
    // goals list is empty (e.g. the goal was later deleted).
    const state = computeRewardState(
      baseInput({ today, goals: [], previousBadges: [{ badgeId: "first-goal", earnedAt: "2026-02-01T00:00:00.000Z" }] }),
    );
    expect(state.badges.some((b) => b.badgeId === "first-goal")).toBe(true);
  });

  it("adds a newly-earned badge exactly once, stamped with the supplied timestamp", () => {
    const today = ACCOUNT_CREATED;
    const goal: Goal = {
      id: "g1",
      name: "Trip",
      iconKey: "flag",
      targetCents: cents(10000),
      priority: "medium",
      status: "active",
      createdAt: ACCOUNT_CREATED,
    };
    const state = computeRewardState(baseInput({ today, goals: [goal], nowIso: "2026-03-01T09:00:00.000Z" }));
    const earned = state.badges.find((b) => b.badgeId === "first-goal");
    expect(earned).toBeDefined();
    expect(earned?.earnedAt).toBe("2026-03-01T09:00:00.000Z");
  });

  it("does not re-earn (duplicate) a badge already present in previousBadges", () => {
    const today = ACCOUNT_CREATED;
    const goal: Goal = {
      id: "g1",
      name: "Trip",
      iconKey: "flag",
      targetCents: cents(10000),
      priority: "medium",
      status: "active",
      createdAt: ACCOUNT_CREATED,
    };
    const state = computeRewardState(
      baseInput({
        today,
        goals: [goal],
        previousBadges: [{ badgeId: "first-goal", earnedAt: "2026-01-15T00:00:00.000Z" }],
      }),
    );
    const matches = state.badges.filter((b) => b.badgeId === "first-goal");
    expect(matches).toHaveLength(1);
    expect(matches[0]?.earnedAt).toBe("2026-01-15T00:00:00.000Z"); // original timestamp preserved
  });
});

describe("computeRewardState - determinism (rule 4)", () => {
  it("identical input produces an identical result", () => {
    const input = baseInput({ transactions: [tx("expense", "cat", 100, "2026-03-01")] });
    const a = computeRewardState(input);
    const b = computeRewardState(input);
    expect(a).toEqual(b);
  });

  it("recomputes a lower total after a transaction is deleted", () => {
    const today = localDate("2026-03-02");
    const withBoth = [tx("expense", "cat", 100, "2026-03-01"), tx("expense", "cat", 100, "2026-03-02")];
    const before = computeRewardState(baseInput({ today, transactions: withBoth }));
    const after = computeRewardState(baseInput({ today, transactions: [withBoth[1]!] }));
    expect(after.totalPoints).toBeLessThan(before.totalPoints);
  });
});
