import { computeDailyAllowance } from "../budgets/budgets";
import { daysInMonth, daysRemainingInWeek, type LocalDate } from "../dates";
import { clampToZero, multiply, subtract, type Cents } from "../money";
import type { Budget, Transaction } from "../types";
import type { SafeToSpend } from "./types";

/**
 * Safe-to-spend today and this week: the Budgets screen's daily
 * allowance (remaining budget headroom / days left in month), minus a
 * day's share of what the goals plan needs set aside - the planner's
 * job is to protect goal contributions from looking like "spare" money.
 * "This week" is today's rate carried across the days left in the week.
 */
export function computeSafeToSpend(
  budgets: readonly Budget[],
  transactions: readonly Transaction[],
  goalsAllocatedMonthlyCents: Cents,
  today: LocalDate,
): SafeToSpend {
  const dailyAllowance = computeDailyAllowance(budgets, transactions, today);
  const goalsDailyShare = multiply(goalsAllocatedMonthlyCents, 1 / daysInMonth(today));
  const todayCents = clampToZero(subtract(dailyAllowance, goalsDailyShare));
  const thisWeekCents = multiply(todayCents, daysRemainingInWeek(today));
  return { todayCents, thisWeekCents };
}
