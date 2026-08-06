import {
  dayOfMonth,
  daysInMonth,
  daysRemainingInMonth,
  monthKey,
  type LocalDate,
  type MonthKey,
} from "../dates";
import { clampToZero, multiply, subtract, sum, ZERO_CENTS, type Cents } from "../money";
import type { Budget, Id, Transaction } from "../types";

/**
 * Total spent against one category in one month. Only "expense"
 * transactions count - income and goalContribution transactions are
 * tracked elsewhere (income sources, goals) and never count against a
 * spending budget, even if a goalContribution happens to be filed under
 * the system Savings category.
 */
export function computeSpent(
  categoryId: Id,
  month: MonthKey,
  transactions: readonly Transaction[],
): Cents {
  return sum(
    transactions
      .filter((t) => t.type === "expense" && t.categoryId === categoryId && monthKey(t.date) === month)
      .map((t) => t.amountCents),
  );
}

export type BudgetPace = "on-pace" | "over-pace" | null;

export interface BudgetStatus {
  budget: Budget;
  spentCents: Cents;
  /** limitCents - spentCents. Not clamped - goes negative when over budget,
   * which is exactly the signal an over-budget category needs to show. */
  remainingCents: Cents;
  /** spent / limit * 100, uncapped (can exceed 100 when over budget). 0 if
   * the limit is 0 (avoids a divide-by-zero). */
  percentUsed: number;
  /** Only meaningful for the month `today` actually falls in - null for
   * any other month, since "pace" is a forward-looking, in-progress-month
   * concept. */
  pace: BudgetPace;
}

export function computeBudgetStatus(
  budget: Budget,
  transactions: readonly Transaction[],
  today: LocalDate,
): BudgetStatus {
  const spentCents = computeSpent(budget.categoryId, budget.month, transactions);
  const remainingCents = subtract(budget.limitCents, spentCents);
  const percentUsed = budget.limitCents > 0 ? (spentCents / budget.limitCents) * 100 : 0;

  let pace: BudgetPace = null;
  if (budget.limitCents > 0 && monthKey(today) === budget.month) {
    const expectedFraction = dayOfMonth(today) / daysInMonth(today);
    const actualFraction = spentCents / budget.limitCents;
    pace = actualFraction > expectedFraction ? "over-pace" : "on-pace";
  }

  return { budget, spentCents, remainingCents, percentUsed, pace };
}

/**
 * Today's remaining discretionary budget divided by the days left in the
 * month (today counts as one of them). Sums headroom (limit - spent)
 * across every budgeted category for today's month - an overspent
 * category legitimately drags the total down, since it really does mean
 * tighter days ahead - then floors the total at zero before dividing, so
 * an already-blown budget reads as "$0/day left", not a negative number.
 */
export function computeDailyAllowance(
  budgets: readonly Budget[],
  transactions: readonly Transaction[],
  today: LocalDate,
): Cents {
  const thisMonth = monthKey(today);
  const monthBudgets = budgets.filter((b) => b.month === thisMonth);
  if (monthBudgets.length === 0) return ZERO_CENTS;

  const totalRemaining = clampToZero(
    sum(
      monthBudgets.map((b) => subtract(b.limitCents, computeSpent(b.categoryId, b.month, transactions))),
    ),
  );
  const daysLeft = daysRemainingInMonth(today);
  return multiply(totalRemaining, 1 / daysLeft);
}

/**
 * Whether the user should be prompted to roll budgets forward: true only
 * when the given month has no budgets yet but the prior month did (so
 * there's something meaningful to copy or base a suggestion on).
 */
export function needsRolloverDecision(month: MonthKey, budgets: readonly Budget[]): boolean {
  const hasCurrentMonth = budgets.some((b) => b.month === month);
  if (hasCurrentMonth) return false;
  return budgets.some((b) => b.month < month);
}

/** The most recent month (strictly before `month`) that has any budgets set. */
export function findPriorBudgetMonth(month: MonthKey, budgets: readonly Budget[]): MonthKey | null {
  const priorMonths = [...new Set(budgets.map((b) => b.month))].filter((m) => m < month);
  if (priorMonths.length === 0) return null;
  return priorMonths.sort().at(-1) ?? null;
}

/**
 * Builds new Budget drafts (no ids yet) that copy every limit from
 * `fromMonth` forward into `toMonth`. Pure - the caller assigns ids and
 * writes them to the store.
 */
export function copyBudgetsForward(
  fromMonth: MonthKey,
  toMonth: MonthKey,
  budgets: readonly Budget[],
): Array<Omit<Budget, "id">> {
  return budgets
    .filter((b) => b.month === fromMonth)
    .map((b) => ({ categoryId: b.categoryId, month: toMonth, limitCents: b.limitCents }));
}
