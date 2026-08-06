import { describe, expect, it } from "vitest";
import { computeInsights } from "../../../src/domain/planner/insights";
import { localDate, type MonthKey } from "../../../src/domain/dates";
import { cents } from "../../../src/domain/money";
import type { Budget, Goal, Transaction } from "../../../src/domain/types";
import type { GoalsPlan } from "../../../src/domain/planner/types";

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

function budget(categoryId: string, limit: number, month = "2026-03"): Budget {
  return { id: `b-${categoryId}`, categoryId, month: month as MonthKey, limitCents: cents(limit) };
}

const EMPTY_GOALS_PLAN: GoalsPlan = {
  items: [],
  totalRequiredMonthlyCents: cents(0),
  isFeasible: true,
  tradeOffs: [],
};

function goal(partial: Partial<Goal> & Pick<Goal, "id">): Goal {
  return {
    name: partial.id,
    iconKey: "flag",
    targetCents: cents(100000),
    priority: "medium",
    status: "active",
    createdAt: localDate("2025-01-01"),
    ...partial,
  };
}

describe("computeInsights - overspend pace warnings", () => {
  it("warns when a category is projected to exceed its limit at the current rate", () => {
    const today = localDate("2026-03-05"); // day 5 of 31
    const budgets = [budget("dining", 100000)];
    const transactions = [expense("dining", 50000, "2026-03-01")];
    const insights = computeInsights(budgets, transactions, [], EMPTY_GOALS_PLAN, today, "USD");
    const warning = insights.find((i) => i.id === "overspend-pace:dining");
    expect(warning).toBeDefined();
    expect(warning?.severity).toBe("warning");
    // projected 310000, limit 100000 -> over by 210000
    expect(warning?.message).toContain("$2,100.00");
  });

  it("does not warn when spending is on pace", () => {
    const today = localDate("2026-03-20"); // ~64% through the month
    const budgets = [budget("dining", 100000)];
    const transactions = [expense("dining", 30000, "2026-03-01")]; // well under pace
    const insights = computeInsights(budgets, transactions, [], EMPTY_GOALS_PLAN, today, "USD");
    expect(insights.find((i) => i.id === "overspend-pace:dining")).toBeUndefined();
  });
});

describe("computeInsights - underspend positive nudges", () => {
  it("suggests moving headroom to the top-priority goal once past mid-month", () => {
    const today = localDate("2026-03-20"); // day 20 of 31 - past the halfway point
    const budgets = [budget("dining", 100000)];
    const transactions = [expense("dining", 20000, "2026-03-01")];
    const goals = [
      goal({ id: "low-goal", priority: "low" }),
      goal({ id: "high-goal", priority: "high" }),
    ];
    const insights = computeInsights(budgets, transactions, goals, EMPTY_GOALS_PLAN, today, "USD");
    const positive = insights.find((i) => i.id === "underspend-headroom:dining");
    expect(positive).toBeDefined();
    expect(positive?.severity).toBe("positive");
    expect(positive?.goalId).toBe("high-goal"); // top priority, not the low one
  });

  it("does not fire before the halfway point of the month", () => {
    const today = localDate("2026-03-05"); // day 5 of 31 - too early
    const budgets = [budget("dining", 100000)];
    const transactions = [expense("dining", 1000, "2026-03-01")]; // way under budget
    const insights = computeInsights(budgets, transactions, [], EMPTY_GOALS_PLAN, today, "USD");
    expect(insights.find((i) => i.id === "underspend-headroom:dining")).toBeUndefined();
  });
});

describe("computeInsights - goal feasibility flags", () => {
  it("flags an infeasible goals plan and each underfunded goal", () => {
    const today = localDate("2026-03-15");
    const plan: GoalsPlan = {
      items: [
        { goalId: "funded", requiredMonthlyCents: cents(10000), allocatedMonthlyCents: cents(10000), isFullyFunded: true, projectedCompletionDate: null },
        { goalId: "short", requiredMonthlyCents: cents(30000), allocatedMonthlyCents: cents(10000), isFullyFunded: false, projectedCompletionDate: null },
      ],
      totalRequiredMonthlyCents: cents(40000),
      isFeasible: false,
      tradeOffs: [],
    };
    const goals = [goal({ id: "funded" }), goal({ id: "short" })];
    const insights = computeInsights([], [], goals, plan, today, "USD");

    expect(insights.find((i) => i.id === "goals-infeasible")).toBeDefined();
    expect(insights.find((i) => i.id === "goal-shortfall:short")).toBeDefined();
    expect(insights.find((i) => i.id === "goal-shortfall:funded")).toBeUndefined();
  });

  it("produces no goal-related insights for a feasible plan", () => {
    const insights = computeInsights([], [], [], EMPTY_GOALS_PLAN, localDate("2026-03-15"), "USD");
    expect(insights.find((i) => i.id === "goals-infeasible")).toBeUndefined();
  });
});

describe("computeInsights - ranking", () => {
  it("orders warnings before positive insights", () => {
    const today = localDate("2026-03-20");
    const budgets = [budget("dining", 100000), budget("groceries", 50000)];
    const transactions = [
      expense("dining", 90000, "2026-03-01"), // over-pace -> warning
      expense("groceries", 1000, "2026-03-01"), // way under -> positive
    ];
    const insights = computeInsights(budgets, transactions, [], EMPTY_GOALS_PLAN, today, "USD");
    const warningIndex = insights.findIndex((i) => i.severity === "warning");
    const positiveIndex = insights.findIndex((i) => i.severity === "positive");
    expect(warningIndex).toBeGreaterThanOrEqual(0);
    expect(positiveIndex).toBeGreaterThan(warningIndex);
  });
});
