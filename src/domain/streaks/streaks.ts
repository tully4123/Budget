import { addDays, dayOfMonth, daysInMonth, diffInDays, isSameOrBefore, monthKey, weekKey, type LocalDate } from "../dates";
import type { AppEvent, Budget, Streak, Transaction } from "../types";

/**
 * Walks every period (day or week, per stepDays) from firstPeriodStart to
 * currentPeriodStart inclusive, returning whether each one qualified -
 * the shared primitive both computePeriodStreak and the "had a break"
 * check for the Comeback badge are built on.
 */
function periodQualifications(
  firstPeriodStart: LocalDate,
  currentPeriodStart: LocalDate,
  stepDays: number,
  qualifies: (periodStart: LocalDate) => boolean,
): boolean[] {
  const results: boolean[] = [];
  let period = firstPeriodStart;
  while (isSameOrBefore(period, currentPeriodStart)) {
    results.push(qualifies(period));
    period = addDays(period, stepDays);
  }
  return results;
}

function periodStreakFromQualifications(
  qualifications: readonly boolean[],
  firstPeriodStart: LocalDate,
  currentPeriodStart: LocalDate,
  stepDays: number,
): Streak {
  let best = 0;
  let runLength = 0;
  let lastQualifiedIndex = -1;

  qualifications.forEach((qualified, i) => {
    if (qualified) {
      runLength += 1;
      lastQualifiedIndex = i;
      if (runLength > best) best = runLength;
    } else {
      runLength = 0;
    }
  });

  if (lastQualifiedIndex === -1) {
    return { type: "logging", current: 0, best: 0, lastQualifiedDate: null };
  }

  const lastQualifiedDate = addDays(firstPeriodStart, lastQualifiedIndex * stepDays);
  const gapPeriods = diffInDays(lastQualifiedDate, currentPeriodStart) / stepDays;
  // Grace period: the most recent qualifying period can be the current
  // one or the one just before it and the streak still counts as "alive" -
  // otherwise a user mid-way through today (which hasn't qualified yet)
  // would see yesterday's real streak reported as already broken.
  const runLengthAtLastQualified = (() => {
    let len = 0;
    for (let i = lastQualifiedIndex; i >= 0 && qualifications[i]; i--) len += 1;
    return len;
  })();
  const current = gapPeriods <= 1 ? runLengthAtLastQualified : 0;

  return { type: "logging", current, best, lastQualifiedDate };
}

function computePeriodStreak(
  firstPeriodStart: LocalDate,
  currentPeriodStart: LocalDate,
  stepDays: number,
  qualifies: (periodStart: LocalDate) => boolean,
): Streak {
  const qualifications = periodQualifications(firstPeriodStart, currentPeriodStart, stepDays, qualifies);
  return periodStreakFromQualifications(qualifications, firstPeriodStart, currentPeriodStart, stepDays);
}

/** True if there's at least one full gap (a qualifying run followed by a
 * non-qualifying period) somewhere before the run currently in progress -
 * i.e. the streak was broken and is now being rebuilt. Used by the
 * Comeback badge. */
function hadStreakBreakBeforeCurrentRun(
  firstPeriodStart: LocalDate,
  currentPeriodStart: LocalDate,
  stepDays: number,
  qualifies: (periodStart: LocalDate) => boolean,
): boolean {
  const qualifications = periodQualifications(firstPeriodStart, currentPeriodStart, stepDays, qualifies);
  let sawQualified = false;
  let sawBreakAfterQualified = false;
  for (const q of qualifications) {
    if (q) {
      sawQualified = true;
    } else if (sawQualified) {
      sawBreakAfterQualified = true;
    }
  }
  return sawBreakAfterQualified;
}

export function loggedDaysSet(transactions: readonly Transaction[], events: readonly AppEvent[]): Set<LocalDate> {
  const days = new Set<LocalDate>();
  for (const t of transactions) days.add(t.date);
  for (const e of events) if (e.type === "noSpendDayCheckIn") days.add(e.date);
  return days;
}

/**
 * A day qualifies for the on-budget streak if, for every category
 * budgeted that month, spending through that exact day (never later
 * days - no hindsight) stayed within that day's expected fraction of the
 * limit. Deliberately recomputes month-to-date spend scoped to `day`
 * rather than reusing computeBudgetStatus, whose spentCents sums the
 * whole month regardless of date - correct for "status as of today" on
 * the Budgets screen, wrong for retroactively judging a past day. A
 * month with no budgets set can't qualify (nothing to be "on pace"
 * against).
 */
export function isOnBudgetDay(
  day: LocalDate,
  budgets: readonly Budget[],
  transactions: readonly Transaction[],
): boolean {
  const monthBudgets = budgets.filter((b) => b.month === monthKey(day));
  if (monthBudgets.length === 0) return false;

  const expectedFraction = dayOfMonth(day) / daysInMonth(day);

  return monthBudgets.every((b) => {
    if (b.limitCents <= 0) return true;
    const spentThroughDay = transactions
      .filter((t) => t.type === "expense" && t.categoryId === b.categoryId && isSameOrBefore(t.date, day))
      .reduce((total, t) => total + t.amountCents, 0);
    return spentThroughDay / b.limitCents <= expectedFraction;
  });
}

export function computeLoggingStreak(
  accountCreatedAt: LocalDate,
  today: LocalDate,
  transactions: readonly Transaction[],
  events: readonly AppEvent[],
): Streak {
  const logged = loggedDaysSet(transactions, events);
  const streak = computePeriodStreak(accountCreatedAt, today, 1, (day) => logged.has(day));
  return { ...streak, type: "logging" };
}

export function computeOnBudgetStreak(
  accountCreatedAt: LocalDate,
  today: LocalDate,
  budgets: readonly Budget[],
  transactions: readonly Transaction[],
): Streak {
  const streak = computePeriodStreak(accountCreatedAt, today, 1, (day) => isOnBudgetDay(day, budgets, transactions));
  return { ...streak, type: "onBudget" };
}

export function computeGoalStreak(
  accountCreatedAt: LocalDate,
  today: LocalDate,
  transactions: readonly Transaction[],
): Streak {
  const contributionWeeks = new Set(
    transactions.filter((t) => t.type === "goalContribution").map((t) => weekKey(t.date)),
  );
  const streak = computePeriodStreak(weekKey(accountCreatedAt), weekKey(today), 7, (week) =>
    contributionWeeks.has(week),
  );
  return { ...streak, type: "goal" };
}

export function hadLoggingComeback(
  accountCreatedAt: LocalDate,
  today: LocalDate,
  transactions: readonly Transaction[],
  events: readonly AppEvent[],
): boolean {
  const logged = loggedDaysSet(transactions, events);
  const hadBreak = hadStreakBreakBeforeCurrentRun(accountCreatedAt, today, 1, (day) => logged.has(day));
  const current = computeLoggingStreak(accountCreatedAt, today, transactions, events).current;
  return hadBreak && current >= 3;
}
