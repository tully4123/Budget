/**
 * A simple, standalone "how do I want to split my week's money" planner -
 * five independent high-level buckets, each holding its own weekly dollar
 * amount directly (not a percentage). Amounts are canonical and don't
 * require income data to be meaningful - percentage-of-income is derived
 * from them only for display, when income is known. Each bucket is set
 * independently; the total across all five isn't forced to any particular
 * value. Separate from the Category/Budget system (which stays granular,
 * per-transaction), this is a lightweight target-allocation view shown on
 * the Dashboard.
 */
import { clampToZero, cents, subtract, sum, ZERO_CENTS, type Cents } from "../money";

export const ALLOCATION_BUCKETS = ["rent", "investments", "savings", "spending", "repayments"] as const;
export type AllocationBucket = (typeof ALLOCATION_BUCKETS)[number];

export type WeeklyAllocation = Record<AllocationBucket, Cents>;

export const ALLOCATION_LABELS: Record<AllocationBucket, string> = {
  rent: "Rent",
  investments: "Investments",
  savings: "Savings",
  spending: "Spending",
  repayments: "Repayments",
};

export const DEFAULT_ALLOCATION: WeeklyAllocation = {
  rent: ZERO_CENTS,
  spending: ZERO_CENTS,
  savings: ZERO_CENTS,
  investments: ZERO_CENTS,
  repayments: ZERO_CENTS,
};

/** Sets one bucket's weekly amount independently of the others - no
 * redistribution. Negative input clamps to zero. */
export function setBucketAmount(
  current: WeeklyAllocation,
  bucket: AllocationBucket,
  newAmountCents: Cents,
): WeeklyAllocation {
  return { ...current, [bucket]: clampToZero(newAmountCents) };
}

/** Sum of every bucket's weekly amount. */
export function totalAllocatedCents(allocation: WeeklyAllocation): Cents {
  return sum(ALLOCATION_BUCKETS.map((b) => allocation[b]));
}

/** How much of a known weekly income is still unassigned - zero once the
 * plan reaches (or exceeds) it, and zero if there's no income to measure
 * against. */
export function unallocatedCents(allocation: WeeklyAllocation, weeklyTotalCents: Cents): Cents {
  return clampToZero(subtract(weeklyTotalCents, totalAllocatedCents(allocation)));
}

/** How much the plan asks for beyond a known weekly income - zero unless
 * the buckets add up to more than that. */
export function overAllocatedCents(allocation: WeeklyAllocation, weeklyTotalCents: Cents): Cents {
  return clampToZero(subtract(totalAllocatedCents(allocation), weeklyTotalCents));
}

/** Each bucket's share of a weekly income, as a whole-number percent - purely
 * a display convenience derived from the canonical dollar amounts. Zero
 * across the board when there's no income to measure against. */
export function allocationPercents(
  allocation: WeeklyAllocation,
  weeklyTotalCents: Cents,
): Record<AllocationBucket, number> {
  const out = {} as Record<AllocationBucket, number>;
  for (const b of ALLOCATION_BUCKETS) {
    out[b] = weeklyTotalCents > 0 ? Math.round((allocation[b] / weeklyTotalCents) * 100) : 0;
  }
  return out;
}

/** Converts a target percent-of-income into the equivalent weekly amount -
 * the inverse of allocationPercents, used when the user edits the percent
 * field directly. Zero if there's no income to measure against. */
export function amountForPercent(percent: number, weeklyTotalCents: Cents): Cents {
  if (weeklyTotalCents <= 0) return ZERO_CENTS;
  return clampToZero(cents(Math.round((weeklyTotalCents * percent) / 100)));
}
