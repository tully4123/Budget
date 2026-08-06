import type { LocalDate } from "../dates";
import { sum } from "../money";
import type { Budget, Category, Goal, IncomeSource, Transaction, UserProfile } from "../types";
import { computeFreeCashFlow } from "./freeCashFlow";
import { computeGoalsPlan } from "./goalsPlan";
import { computeInsights } from "./insights";
import { computeSafeToSpend } from "./safeToSpend";
import { computeSuggestedBudgets } from "./suggestedBudgets";
import type { PlannerResult } from "./types";

export interface PlannerInput {
  profile: UserProfile;
  incomeSources: readonly IncomeSource[];
  categories: readonly Category[];
  transactions: readonly Transaction[];
  budgets: readonly Budget[];
  goals: readonly Goal[];
  today: LocalDate;
}

/**
 * The whole Planner Engine, composed from the independently-tested pieces
 * in this folder. Pure - same inputs always produce the same PlannerResult.
 */
export function computePlannerResult(input: PlannerInput): PlannerResult {
  const { profile, incomeSources, categories, transactions, budgets, goals, today } = input;

  const freeCashFlow = computeFreeCashFlow(incomeSources, categories, transactions, profile.createdAt, today);

  const goalsPlan = computeGoalsPlan(
    goals,
    transactions,
    categories,
    freeCashFlow.freeCashFlowCents,
    profile.createdAt,
    today,
    profile.currency,
  );

  const suggestedBudgets = computeSuggestedBudgets(
    categories,
    transactions,
    freeCashFlow.monthlyIncomeCents,
    goalsPlan.totalRequiredMonthlyCents,
    freeCashFlow.freeCashFlowCents,
    profile.createdAt,
    today,
    profile.currency,
  );

  const totalAllocatedToGoals = sum(goalsPlan.items.map((i) => i.allocatedMonthlyCents));
  const safeToSpend = computeSafeToSpend(budgets, transactions, totalAllocatedToGoals, today);

  const insights = computeInsights(budgets, transactions, goals, goalsPlan, today, profile.currency);

  return { asOf: today, freeCashFlow, goalsPlan, suggestedBudgets, safeToSpend, insights };
}

/**
 * The planner sits behind this interface so a future AIAdvisor
 * (LLM-backed) can be swapped in without touching call sites - the
 * Dashboard/Budgets/Goals screens depend on Advisor, never on
 * RuleBasedAdvisor or computePlannerResult directly.
 */
export interface Advisor {
  getPlan(input: PlannerInput): PlannerResult;
}

export class RuleBasedAdvisor implements Advisor {
  getPlan(input: PlannerInput): PlannerResult {
    return computePlannerResult(input);
  }
}
