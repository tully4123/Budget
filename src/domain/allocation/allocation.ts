/**
 * A simple, standalone "how do I want to split my week's money" planner -
 * five fixed high-level buckets, always summing to exactly 100%. Separate
 * from the Category/Budget system (which stays granular, per-transaction),
 * this is a lightweight target-allocation view shown on the Dashboard.
 */
import { cents, type Cents } from "../money";

export const ALLOCATION_BUCKETS = ["rent", "investments", "savings", "spending", "repayments"] as const;
export type AllocationBucket = (typeof ALLOCATION_BUCKETS)[number];

export type WeeklyAllocation = Record<AllocationBucket, number>;

export const ALLOCATION_LABELS: Record<AllocationBucket, string> = {
  rent: "Rent",
  investments: "Investments",
  savings: "Savings",
  spending: "Spending",
  repayments: "Repayments",
};

export const DEFAULT_ALLOCATION: WeeklyAllocation = {
  rent: 35,
  spending: 25,
  savings: 20,
  investments: 15,
  repayments: 5,
};

function clampPercent(value: number): number {
  return Math.max(0, Math.min(100, Math.round(value)));
}

/**
 * Moves `bucket` to `newValue` (0-100) and proportionally redistributes
 * the difference across the other four buckets so the total always stays
 * exactly 100 - the classic "one slider moves, the rest shrink to make
 * room" allocator interaction. If every other bucket is already at 0
 * (nothing to shrink proportionally), the freed-up room is split evenly
 * among them instead. Any leftover rounding point goes to the largest of
 * the other buckets, so the total is always exactly 100, never 99 or 101.
 */
export function adjustAllocation(
  current: WeeklyAllocation,
  bucket: AllocationBucket,
  newValue: number,
): WeeklyAllocation {
  const clamped = clampPercent(newValue);
  const others = ALLOCATION_BUCKETS.filter((b) => b !== bucket);
  const remaining = 100 - clamped;
  const oldOthersTotal = others.reduce((sum, b) => sum + current[b], 0);

  const next: WeeklyAllocation = { ...current, [bucket]: clamped };

  if (remaining <= 0) {
    for (const b of others) next[b] = 0;
    return next;
  }

  if (oldOthersTotal === 0) {
    // Nothing to scale proportionally from - split the freed-up room evenly.
    const base = Math.floor(remaining / others.length);
    let leftover = remaining - base * others.length;
    for (const b of others) {
      next[b] = base + (leftover > 0 ? 1 : 0);
      if (leftover > 0) leftover -= 1;
    }
    return next;
  }

  let allocated = 0;
  const scaled = others.map((b) => {
    const value = Math.round((current[b] / oldOthersTotal) * remaining);
    allocated += value;
    return [b, value] as const;
  });
  const drift = remaining - allocated;
  // Apply the rounding drift to whichever other bucket is currently
  // largest, so the total lands on exactly 100.
  const largestIndex = scaled.reduce(
    (bestIdx, [, value], idx) => (value > scaled[bestIdx]![1] ? idx : bestIdx),
    0,
  );
  scaled[largestIndex] = [scaled[largestIndex]![0], scaled[largestIndex]![1] + drift];

  for (const [b, value] of scaled) next[b] = Math.max(0, value);
  return next;
}

/** Each bucket's share of a weekly dollar amount (in cents), for showing
 * "$X/week" next to each slider when income data is available. Uses the
 * same "distribute the rounding remainder" approach as money.ts's
 * splitEvenly so the parts always sum back to the whole. */
export function allocationAmounts(
  allocation: WeeklyAllocation,
  weeklyTotalCents: Cents,
): Record<AllocationBucket, Cents> {
  const raw = ALLOCATION_BUCKETS.map((b) => (weeklyTotalCents * allocation[b]) / 100);
  const floors = raw.map(Math.floor);
  let remainder = Math.round(weeklyTotalCents - floors.reduce((a, b) => a + b, 0));

  const order = raw
    .map((value, i) => ({ i, frac: value - floors[i]! }))
    .sort((a, b) => b.frac - a.frac);

  const result = [...floors];
  for (const { i } of order) {
    if (remainder <= 0) break;
    result[i] = result[i]! + 1;
    remainder -= 1;
  }

  const out = {} as Record<AllocationBucket, Cents>;
  ALLOCATION_BUCKETS.forEach((b, i) => {
    out[b] = cents(result[i]!);
  });
  return out;
}
