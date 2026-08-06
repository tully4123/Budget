import { computeBudgetStatus } from "../budgets/budgets";
import { dayOfMonth, daysInMonth, monthKey, type LocalDate } from "../dates";
import { formatCents, multiply, subtract, ZERO_CENTS } from "../money";
import type { Budget, Goal, GoalPriority, Transaction } from "../types";
import type { GoalsPlan, PlannerInsight } from "./types";

const PRIORITY_RANK: Record<GoalPriority, number> = { high: 0, medium: 1, low: 2 };

/** Below this fraction of expected pace, a category counts as
 * comfortably under budget rather than just "not yet over". */
const UNDERSPEND_THRESHOLD = 0.7;
/** Don't suggest reallocating headroom until at least half the month's
 * data is in - too early, and "under pace" is just "early in the month". */
const MIN_MONTH_FRACTION_FOR_POSITIVE_INSIGHT = 0.5;

function overspendWarnings(
  budgets: readonly Budget[],
  transactions: readonly Transaction[],
  today: LocalDate,
  currency: string,
): PlannerInsight[] {
  const currentMonthBudgets = budgets.filter((b) => b.month === monthKey(today));
  const insights: PlannerInsight[] = [];

  for (const budget of currentMonthBudgets) {
    const status = computeBudgetStatus(budget, transactions, today);
    if (status.pace !== "over-pace") continue;

    const day = dayOfMonth(today);
    const daysTotal = daysInMonth(today);
    const projectedTotal = multiply(status.spentCents, daysTotal / day);
    const overBy = subtract(projectedTotal, budget.limitCents);
    if (overBy <= ZERO_CENTS) continue;

    insights.push({
      id: `overspend-pace:${budget.categoryId}`,
      severity: "warning",
      message: `On pace to exceed this category's budget by ${formatCents(overBy, currency)}.`,
      categoryId: budget.categoryId,
    });
  }
  return insights;
}

function underspendPositives(
  budgets: readonly Budget[],
  transactions: readonly Transaction[],
  goals: readonly Goal[],
  today: LocalDate,
  currency: string,
): PlannerInsight[] {
  const day = dayOfMonth(today);
  const daysTotal = daysInMonth(today);
  if (day / daysTotal < MIN_MONTH_FRACTION_FOR_POSITIVE_INSIGHT) return [];

  const topGoal = [...goals]
    .filter((g) => g.status === "active")
    .sort((a, b) => PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority])
    .at(0);

  const currentMonthBudgets = budgets.filter((b) => b.month === monthKey(today));
  const insights: PlannerInsight[] = [];

  for (const budget of currentMonthBudgets) {
    const status = computeBudgetStatus(budget, transactions, today);
    if (status.pace !== "on-pace" || budget.limitCents <= ZERO_CENTS) continue;

    const expectedFraction = day / daysTotal;
    const actualFraction = status.spentCents / budget.limitCents;
    if (actualFraction >= expectedFraction * UNDERSPEND_THRESHOLD) continue;

    const headroom = subtract(multiply(budget.limitCents, expectedFraction), status.spentCents);
    if (headroom <= ZERO_CENTS) continue;

    const suggestion = topGoal
      ? ` Consider moving ${formatCents(headroom, currency)} to ${topGoal.name}.`
      : "";
    insights.push({
      id: `underspend-headroom:${budget.categoryId}`,
      severity: "positive",
      message: `Comfortably under budget this month.${suggestion}`,
      categoryId: budget.categoryId,
      goalId: topGoal?.id,
    });
  }
  return insights;
}

function goalFeasibilityFlags(goalsPlan: GoalsPlan, goals: readonly Goal[], currency: string): PlannerInsight[] {
  const insights: PlannerInsight[] = [];

  if (!goalsPlan.isFeasible) {
    insights.push({
      id: "goals-infeasible",
      severity: "warning",
      message: `Your goals need ${formatCents(goalsPlan.totalRequiredMonthlyCents, currency)}/mo total, more than you have free - see the trade-offs on your goals.`,
    });
  }

  for (const item of goalsPlan.items) {
    if (item.isFullyFunded) continue;
    const goal = goals.find((g) => g.id === item.goalId);
    if (!goal) continue;
    const shortfall = subtract(item.requiredMonthlyCents, item.allocatedMonthlyCents);
    insights.push({
      id: `goal-shortfall:${goal.id}`,
      severity: "warning",
      message: `${goal.name} is short ${formatCents(shortfall, currency)}/mo to hit its target date at the current plan.`,
      goalId: goal.id,
    });
  }
  return insights;
}

export function computeInsights(
  budgets: readonly Budget[],
  transactions: readonly Transaction[],
  goals: readonly Goal[],
  goalsPlan: GoalsPlan,
  today: LocalDate,
  currency: string,
): PlannerInsight[] {
  return [
    ...overspendWarnings(budgets, transactions, today, currency),
    ...goalFeasibilityFlags(goalsPlan, goals, currency),
    ...underspendPositives(budgets, transactions, goals, today, currency),
  ];
}
