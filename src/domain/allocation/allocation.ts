/**
 * A simple, standalone "how do I want to split my week's money" planner -
 * five independent high-level buckets. Each bucket's percent is set
 * directly and doesn't affect the others; the total across all five isn't
 * forced to any particular value. The UI surfaces how much of the week is
 * still unassigned, or how far over a full week's money the current split
 * goes. Separate from the Category/Budget system (which stays granular,
 * per-transaction), this is a lightweight target-allocation view shown on
 * the Dashboard.
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

/** Sets one bucket's percent independently of the others - no
 * redistribution. Each bucket is a standalone 0-100 share of the week's
 * money. */
export function setBucketPercent(
  current: WeeklyAllocation,
  bucket: AllocationBucket,
  newValue: number,
): WeeklyAllocation {
  return { ...current, [bucket]: clampPercent(newValue) };
}

/** Sum of every bucket's percent. A full week is 100 - under that means
 * some money's unassigned, over means the plan asks for more than a full
 * week's income. */
export function totalAllocatedPercent(allocation: WeeklyAllocation): number {
  return ALLOCATION_BUCKETS.reduce((total, b) => total + allocation[b], 0);
}

/** How many percentage points of the week are still unassigned - 0 once
 * the plan reaches (or exceeds) 100%. */
export function unallocatedPercent(allocation: WeeklyAllocation): number {
  return Math.max(0, 100 - totalAllocatedPercent(allocation));
}

/** How many percentage points the plan asks for beyond a full week's
 * money - 0 unless the buckets add up to more than 100%. */
export function overAllocatedPercent(allocation: WeeklyAllocation): number {
  return Math.max(0, totalAllocatedPercent(allocation) - 100);
}

/** Each bucket's independent dollar share of a weekly total, rounded to
 * the nearest cent. Buckets no longer have to sum to 100%, so these
 * amounts aren't forced to sum back to `weeklyTotalCents` either - that's
 * expected whenever the plan is under- or over-allocated. */
export function allocationAmounts(
  allocation: WeeklyAllocation,
  weeklyTotalCents: Cents,
): Record<AllocationBucket, Cents> {
  const out = {} as Record<AllocationBucket, Cents>;
  for (const b of ALLOCATION_BUCKETS) {
    out[b] = cents(Math.round((weeklyTotalCents * allocation[b]) / 100));
  }
  return out;
}
