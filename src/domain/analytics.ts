import { addMonths, diffInMonths, isSameOrBefore, type LocalDate } from "./dates";
import { multiply, sum, type Cents } from "./money";
import type { Transaction } from "./types";

/**
 * Average monthly amount of transactions matching `predicate`, over a
 * trailing window ending `today` - the window starts at `today` minus
 * `windowMonths`, or `earliestDate` if that's more recent (e.g. an
 * account/goal/category younger than the window shouldn't have its
 * average diluted by months that don't exist yet). Elapsed months is
 * floored at 1 to avoid a divide-by-zero for a same-month start.
 *
 * Shared by goals (contribution pace), the planner (needs spending,
 * per-category suggested budgets) - anywhere "your real 3-month average"
 * is needed.
 */
export function computeMonthlyAverage(
  transactions: readonly Transaction[],
  predicate: (t: Transaction) => boolean,
  earliestDate: LocalDate,
  today: LocalDate,
  windowMonths = 3,
): Cents {
  const windowStart = addMonths(today, -windowMonths);
  const effectiveStart = isSameOrBefore(earliestDate, windowStart) ? windowStart : earliestDate;
  const elapsedMonths = Math.max(diffInMonths(effectiveStart, today), 1);

  const total = sum(
    transactions
      .filter((t) => predicate(t) && isSameOrBefore(effectiveStart, t.date) && isSameOrBefore(t.date, today))
      .map((t) => t.amountCents),
  );
  return multiply(total, 1 / elapsedMonths);
}
