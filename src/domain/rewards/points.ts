import { cents, type Cents } from "../money";
import { points, type Points } from "../types/rewards";

/**
 * The whole points table in one place, per the spec. All values are
 * plain integers (converted to Points at the call site) so this stays
 * easy to eyeball and tune.
 */
export const POINTS_TABLE = {
  perLoggedTransaction: 5,
  maxLoggingPointsPerDay: 15,
  underAllowanceDay: 10,
  allCategoriesOnPaceWeek: 50,
  perTenDollarsContributed: 1,
  maxContributionPointsPerEvent: 100,
  milestoneBonus: { 25: 100, 50: 150, 75: 200, 100: 500 } as Record<25 | 50 | 75 | 100, number>,
  /** Streak length bonuses, applied once each time the logging streak's
   * run-length first reaches these thresholds. Not specified numerically
   * by the spec - chosen to scale with the milestone bonuses above. */
  streakBonus: { 7: 50, 30: 200, 100: 750 } as Record<7 | 30 | 100, number>,
} as const;

export function loggingPointsForDay(transactionCountThatDay: number): Points {
  if (transactionCountThatDay <= 0) return points(0);
  const raw = transactionCountThatDay * POINTS_TABLE.perLoggedTransaction;
  return points(Math.min(raw, POINTS_TABLE.maxLoggingPointsPerDay));
}

export function contributionPoints(amountCents: Cents): Points {
  const tenDollarUnits = Math.floor(amountCents / 1000);
  const raw = tenDollarUnits * POINTS_TABLE.perTenDollarsContributed;
  return points(Math.min(raw, POINTS_TABLE.maxContributionPointsPerEvent));
}

export function milestonePoints(threshold: 25 | 50 | 75 | 100): Points {
  return points(POINTS_TABLE.milestoneBonus[threshold]);
}

export function streakBonusPoints(length: 7 | 30 | 100): Points {
  return points(POINTS_TABLE.streakBonus[length]);
}

/** $10 in cents, spelled out for callers comparing against the
 * contribution-points threshold without hardcoding the magic number. */
export const TEN_DOLLARS: Cents = cents(1000);
