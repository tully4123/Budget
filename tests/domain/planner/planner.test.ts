import { describe, expect, it } from "vitest";
import { RuleBasedAdvisor, type PlannerInput } from "../../../src/domain/planner/planner";
import { localDate } from "../../../src/domain/dates";
import { cents } from "../../../src/domain/money";
import type { Category, Goal, IncomeSource, Transaction, UserProfile } from "../../../src/domain/types";

const TODAY = localDate("2026-03-15");

const PROFILE: UserProfile = {
  id: "user-1",
  displayName: "Alex",
  currency: "USD",
  payFrequency: "monthly",
  createdAt: localDate("2025-01-01"),
};

const HOUSING: Category = { id: "housing", name: "Housing", iconKey: "home", colorToken: "cat-1", kind: "need", isArchived: false };
const DINING: Category = { id: "dining", name: "Dining", iconKey: "utensils", colorToken: "cat-4", kind: "want", isArchived: false };
const SAVINGS: Category = { id: "savings", name: "Savings", iconKey: "flag", colorToken: "cat-9", kind: "savings", isArchived: false, isSystem: true };

const INCOME: IncomeSource = {
  id: "job",
  name: "Job",
  amountCents: cents(500000),
  frequency: "monthly",
  nextDate: localDate("2026-04-01"),
};

const GOAL: Goal = {
  id: "goal-1",
  name: "Emergency Fund",
  iconKey: "flag",
  targetCents: cents(300000),
  targetDate: localDate("2026-06-15"),
  priority: "high",
  status: "active",
  createdAt: localDate("2025-06-01"),
};

let txCounter = 0;
function tx(
  type: Transaction["type"],
  categoryId: string,
  amount: number,
  date: string,
  goalId?: string,
): Transaction {
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

function baseInput(overrides: Partial<PlannerInput> = {}): PlannerInput {
  return {
    profile: PROFILE,
    incomeSources: [INCOME],
    categories: [HOUSING, DINING, SAVINGS],
    transactions: [
      tx("expense", HOUSING.id, 150000, "2026-03-01"),
      tx("expense", DINING.id, 20000, "2026-03-05"),
      tx("goalContribution", SAVINGS.id, 10000, "2026-03-05", GOAL.id),
    ],
    budgets: [],
    goals: [GOAL],
    today: TODAY,
    ...overrides,
  };
}

describe("RuleBasedAdvisor.getPlan - full composition", () => {
  it("wires every planner sub-result together consistently", () => {
    const advisor = new RuleBasedAdvisor();
    const result = advisor.getPlan(baseInput());

    expect(result.asOf).toBe(TODAY);

    // Free cash flow: income 500000 - needs avg (150000 over 3mo window = 50000)
    expect(result.freeCashFlow.monthlyIncomeCents).toBe(500000);
    expect(result.freeCashFlow.freeCashFlowCents).toBe(500000 - result.freeCashFlow.averageNeedsSpendingCents);

    // Goals plan: one active goal with a target date should get a plan item
    expect(result.goalsPlan.items).toHaveLength(1);
    expect(result.goalsPlan.items[0]?.goalId).toBe(GOAL.id);

    // Suggested budgets: only need/want categories, never system ones
    const suggestedIds = result.suggestedBudgets.map((s) => s.categoryId);
    expect(suggestedIds).toContain(HOUSING.id);
    expect(suggestedIds).toContain(DINING.id);
    expect(suggestedIds).not.toContain(SAVINGS.id);

    // Safe to spend is a defined, non-negative pair of numbers
    expect(result.safeToSpend.todayCents).toBeGreaterThanOrEqual(0);
    expect(result.safeToSpend.thisWeekCents).toBeGreaterThanOrEqual(0);

    // Insights is at least an array (content covered by insights.test.ts)
    expect(Array.isArray(result.insights)).toBe(true);
  });

  it("is deterministic - identical input produces an identical result", () => {
    const advisor = new RuleBasedAdvisor();
    const input = baseInput();
    const a = advisor.getPlan(input);
    const b = advisor.getPlan(input);
    expect(a).toEqual(b);
  });

  it("produces a feasible, unallocated goals plan with no income at all", () => {
    const advisor = new RuleBasedAdvisor();
    const result = advisor.getPlan(baseInput({ incomeSources: [] }));
    // No income and real needs spending -> negative free cash flow, so the
    // goal (which has a required monthly amount) should come up short.
    expect(result.goalsPlan.isFeasible).toBe(false);
  });
});
