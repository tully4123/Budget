import { addMonths, diffInMonths, isSameOrBefore, type LocalDate } from "../dates";
import { multiply, subtract, sum, ZERO_CENTS, type Cents } from "../money";
import type { Goal, GoalWithProgress, Id, Transaction } from "../types";

/** Sums every goalContribution transaction filed against this goal - the
 * only source of truth for "funded" (rule 4: never stored, always
 * recomputed from the ledger). */
export function computeFundedCents(goalId: Id, transactions: readonly Transaction[]): Cents {
  return sum(
    transactions.filter((t) => t.type === "goalContribution" && t.goalId === goalId).map((t) => t.amountCents),
  );
}

export function withProgress(goal: Goal, transactions: readonly Transaction[]): GoalWithProgress {
  return { ...goal, fundedCents: computeFundedCents(goal.id, transactions) };
}

/**
 * Average monthly contribution over a trailing window (default 3 months,
 * matching the 3-month lookback used elsewhere), or since the goal was
 * created if that's more recent. Returns 0 if there's no history to
 * average yet, or no elapsed months (created this month).
 */
export function computeAverageMonthlyContribution(
  goal: Goal,
  transactions: readonly Transaction[],
  today: LocalDate,
  windowMonths = 3,
): Cents {
  const windowStart = addMonths(today, -windowMonths);
  const effectiveStart = isSameOrBefore(goal.createdAt, windowStart) ? windowStart : goal.createdAt;
  const elapsedMonths = Math.max(diffInMonths(effectiveStart, today), 1);

  const contributed = sum(
    transactions
      .filter(
        (t) =>
          t.type === "goalContribution" &&
          t.goalId === goal.id &&
          isSameOrBefore(effectiveStart, t.date) &&
          isSameOrBefore(t.date, today),
      )
      .map((t) => t.amountCents),
  );
  return multiply(contributed, 1 / elapsedMonths);
}

/**
 * Projected completion date at the current contribution pace. Null when
 * there's no meaningful projection to make: already complete, or no
 * pace to extrapolate from (average monthly contribution is zero).
 */
export function projectedCompletionDate(
  goal: Goal,
  transactions: readonly Transaction[],
  today: LocalDate,
): LocalDate | null {
  const funded = computeFundedCents(goal.id, transactions);
  if (funded >= goal.targetCents) return null;

  const avgMonthly = computeAverageMonthlyContribution(goal, transactions, today);
  if (avgMonthly <= ZERO_CENTS) return null;

  const remaining = subtract(goal.targetCents, funded);
  const monthsNeeded = Math.ceil(remaining / avgMonthly);
  return addMonths(today, monthsNeeded);
}

/**
 * Monthly contribution required to hit the goal's target date. Null if
 * the goal has no target date. Months remaining is floored at 1 - a
 * due-this-month or overdue goal still needs a concrete "put in this
 * much" number, not a divide-by-zero or a negative one.
 */
export function requiredMonthlyForTargetDate(
  goal: Goal,
  transactions: readonly Transaction[],
  today: LocalDate,
): Cents | null {
  if (!goal.targetDate) return null;
  const funded = computeFundedCents(goal.id, transactions);
  const remaining = subtract(goal.targetCents, funded);
  if (remaining <= ZERO_CENTS) return ZERO_CENTS;

  const monthsRemaining = Math.max(diffInMonths(today, goal.targetDate), 1);
  return multiply(remaining, 1 / monthsRemaining);
}

export const MILESTONE_THRESHOLDS = [25, 50, 75, 100] as const;
export type MilestoneThreshold = (typeof MILESTONE_THRESHOLDS)[number];

/**
 * Which milestone percentages became newly crossed by a funded-amount
 * change (e.g. a big contribution can cross more than one at once).
 * Cross-multiplies rather than dividing, so this is exact integer
 * arithmetic - no floating-point percent comparison near a threshold.
 */
export function detectNewlyCrossedMilestones(
  beforeCents: Cents,
  afterCents: Cents,
  targetCents: Cents,
): MilestoneThreshold[] {
  if (targetCents <= ZERO_CENTS) return [];
  return MILESTONE_THRESHOLDS.filter((threshold) => {
    const wasCrossed = beforeCents * 100 >= targetCents * threshold;
    const isCrossed = afterCents * 100 >= targetCents * threshold;
    return isCrossed && !wasCrossed;
  });
}
