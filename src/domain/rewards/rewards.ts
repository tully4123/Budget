import { addDays, isSameOrBefore, weekKey, type LocalDate } from "../dates";
import { detectNewlyCrossedMilestones } from "../goals/goals";
import { add, ZERO_CENTS, type Cents } from "../money";
import { isOnBudgetDay, loggedDaysSet, computeLoggingStreak } from "../streaks/streaks";
import type { AppEvent, Budget, EarnedBadge, Goal, RewardState, Transaction } from "../types";
import { points } from "../types/rewards";
import { BADGE_CATALOG, type BadgeContext } from "./badges";
import { computeLevel } from "./levels";
import { contributionPoints, loggingPointsForDay, milestonePoints, POINTS_TABLE, streakBonusPoints } from "./points";

export interface RewardsInput {
  accountCreatedAt: LocalDate;
  today: LocalDate;
  /** Timestamp stamped onto any newly-earned badge this computation finds -
   * supplied by the caller (store/UI layer) so this module stays pure. */
  nowIso: string;
  transactions: readonly Transaction[];
  events: readonly AppEvent[];
  budgets: readonly Budget[];
  goals: readonly Goal[];
  previousBadges: readonly EarnedBadge[];
}

function weekFullyOnBudget(
  weekMonday: LocalDate,
  budgets: readonly Budget[],
  transactions: readonly Transaction[],
): boolean {
  for (let i = 0; i < 7; i++) {
    if (!isOnBudgetDay(addDays(weekMonday, i), budgets, transactions)) return false;
  }
  return true;
}

/** +5 per logged transaction that day (max +15/day) - real transactions
 * only; a no-spend check-in keeps the logging streak alive but doesn't
 * itself earn "logged a transaction" points. Plus +10 for any day that
 * stayed on-budget (see isOnBudgetDay's day-scoped, no-hindsight math). */
function computeDailyPoints(input: RewardsInput): number {
  let total = 0;
  let day = input.accountCreatedAt;
  while (isSameOrBefore(day, input.today)) {
    const transactionsThatDay = input.transactions.filter((t) => t.date === day).length;
    total += loggingPointsForDay(transactionsThatDay);
    if (isOnBudgetDay(day, input.budgets, input.transactions)) {
      total += POINTS_TABLE.underAllowanceDay;
    }
    day = addDays(day, 1);
  }
  return total;
}

/** +50 for each fully-completed week where every budgeted category stayed
 * on-pace every day - in-progress weeks are never checked, so this can't
 * award (or un-award) points as "today" moves through a live week. */
function computeWeeklyPoints(input: RewardsInput): number {
  let total = 0;
  let week = weekKey(input.accountCreatedAt);
  while (isSameOrBefore(addDays(week, 6), input.today)) {
    if (weekFullyOnBudget(week, input.budgets, input.transactions)) {
      total += POINTS_TABLE.allCategoriesOnPaceWeek;
    }
    week = addDays(week, 7);
  }
  return total;
}

/** +1 per $10 contributed (capped per contribution), plus milestone
 * bonuses - replays each goal's contributions in chronological order so
 * milestone crossings are detected exactly once, at the contribution
 * that actually crossed them. */
function computeGoalPoints(input: RewardsInput): number {
  let total = 0;
  for (const goal of input.goals) {
    const contributions = input.transactions
      .filter((t) => t.type === "goalContribution" && t.goalId === goal.id)
      .slice()
      .sort((a, b) => a.date.localeCompare(b.date) || a.createdAt.localeCompare(b.createdAt));

    let fundedSoFar: Cents = ZERO_CENTS;
    for (const c of contributions) {
      total += contributionPoints(c.amountCents);
      const after = add(fundedSoFar, c.amountCents);
      for (const threshold of detectNewlyCrossedMilestones(fundedSoFar, after, goal.targetCents)) {
        total += milestonePoints(threshold);
      }
      fundedSoFar = after;
    }
  }
  return total;
}

/** One-time bonus the first time the logging streak's run-length reaches
 * 7/30/100 - a same-day run length ending exactly at each day, not the
 * grace-period "current" streak, so this can't fire twice for one run. */
function computeStreakBonusPoints(input: RewardsInput): number {
  const logged = loggedDaysSet(input.transactions, input.events);
  let total = 0;
  let runLength = 0;
  const awarded = { 7: false, 30: false, 100: false };
  let day = input.accountCreatedAt;
  while (isSameOrBefore(day, input.today)) {
    if (logged.has(day)) {
      runLength += 1;
      if (runLength === 7 && !awarded[7]) {
        total += streakBonusPoints(7);
        awarded[7] = true;
      }
      if (runLength === 30 && !awarded[30]) {
        total += streakBonusPoints(30);
        awarded[30] = true;
      }
      if (runLength === 100 && !awarded[100]) {
        total += streakBonusPoints(100);
        awarded[100] = true;
      }
    } else {
      runLength = 0;
    }
    day = addDays(day, 1);
  }
  return total;
}

function computeTotalPoints(input: RewardsInput): number {
  return (
    computeDailyPoints(input) + computeWeeklyPoints(input) + computeGoalPoints(input) + computeStreakBonusPoints(input)
  );
}

function computeEarnedBadges(
  ctx: BadgeContext,
  previousBadges: readonly EarnedBadge[],
  nowIso: string,
): EarnedBadge[] {
  const alreadyEarnedIds = new Set(previousBadges.map((b) => b.badgeId));
  const result = [...previousBadges];
  for (const badge of BADGE_CATALOG) {
    if (alreadyEarnedIds.has(badge.id)) continue;
    if (badge.criteria(ctx)) {
      result.push({ badgeId: badge.id, earnedAt: nowIso });
    }
  }
  return result;
}

/**
 * The whole Rewards engine: replays the ledger + event log into a fresh
 * totalPoints and level every time (rule 4 - fully derived, so editing or
 * deleting a past transaction can never leave points stale or corrupt),
 * and merges in any newly-earned badges without ever dropping a
 * previously-earned one (rule 4's one exception).
 */
export function computeRewardState(input: RewardsInput): RewardState {
  const totalPoints = points(computeTotalPoints(input));
  const loggingStreak = computeLoggingStreak(input.accountCreatedAt, input.today, input.transactions, input.events);
  const badgeCtx: BadgeContext = {
    goals: input.goals,
    transactions: input.transactions,
    events: input.events,
    budgets: input.budgets,
    loggingStreak,
    accountCreatedAt: input.accountCreatedAt,
    today: input.today,
  };
  const badges = computeEarnedBadges(badgeCtx, input.previousBadges, input.nowIso);

  return { totalPoints, level: computeLevel(totalPoints), badges };
}
