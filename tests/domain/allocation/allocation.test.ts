import { describe, expect, it } from "vitest";
import {
  ALLOCATION_BUCKETS,
  adjustAllocation,
  allocationAmounts,
  DEFAULT_ALLOCATION,
  type WeeklyAllocation,
} from "../../../src/domain/allocation/allocation";
import { cents } from "../../../src/domain/money";

function sum(allocation: WeeklyAllocation): number {
  return ALLOCATION_BUCKETS.reduce((total, b) => total + allocation[b], 0);
}

describe("adjustAllocation", () => {
  it("always sums to exactly 100, distributing rounding drift to the largest other bucket", () => {
    const current: WeeklyAllocation = { rent: 7, spending: 23, savings: 31, investments: 19, repayments: 20 };
    const next = adjustAllocation(current, "rent", 10);
    expect(next).toEqual({ rent: 10, spending: 22, savings: 31, investments: 18, repayments: 19 });
    expect(sum(next)).toBe(100);
  });

  it("proportionally shrinks the other buckets when one grows", () => {
    const next = adjustAllocation(DEFAULT_ALLOCATION, "rent", 50);
    expect(next.rent).toBe(50);
    expect(sum(next)).toBe(100);
    // Every other bucket should have shrunk (none grew) relative to default.
    expect(next.spending).toBeLessThan(DEFAULT_ALLOCATION.spending);
    expect(next.savings).toBeLessThan(DEFAULT_ALLOCATION.savings);
  });

  it("setting a bucket to 100 zeroes out every other bucket", () => {
    const next = adjustAllocation(DEFAULT_ALLOCATION, "investments", 100);
    expect(next.investments).toBe(100);
    expect(next.rent).toBe(0);
    expect(next.spending).toBe(0);
    expect(next.savings).toBe(0);
    expect(next.repayments).toBe(0);
    expect(sum(next)).toBe(100);
  });

  it("splits evenly among the others when they were all at zero", () => {
    const allIn: WeeklyAllocation = { rent: 100, investments: 0, savings: 0, spending: 0, repayments: 0 };
    const next = adjustAllocation(allIn, "rent", 20);
    expect(next.rent).toBe(20);
    expect(next.investments).toBe(20);
    expect(next.savings).toBe(20);
    expect(next.spending).toBe(20);
    expect(next.repayments).toBe(20);
    expect(sum(next)).toBe(100);
  });

  it("clamps out-of-range values to [0, 100]", () => {
    const over = adjustAllocation(DEFAULT_ALLOCATION, "investments", 130);
    expect(over.investments).toBe(100);
    expect(sum(over)).toBe(100);

    const under = adjustAllocation(DEFAULT_ALLOCATION, "investments", -20);
    expect(under.investments).toBe(0);
    expect(sum(under)).toBe(100);
  });

  it("is idempotent when re-applying the same value", () => {
    const once = adjustAllocation(DEFAULT_ALLOCATION, "savings", 40);
    const twice = adjustAllocation(once, "savings", 40);
    expect(twice).toEqual(once);
  });
});

describe("allocationAmounts", () => {
  it("splits a weekly total into whole cents that sum back exactly, largest-remainder first", () => {
    const allocation: WeeklyAllocation = { rent: 35, investments: 15, savings: 20, spending: 25, repayments: 5 };
    const amounts = allocationAmounts(allocation, cents(333));
    expect(amounts).toEqual({ rent: 116, investments: 50, savings: 67, spending: 83, repayments: 17 });
    expect(ALLOCATION_BUCKETS.reduce((t, b) => t + amounts[b], 0)).toBe(333);
  });

  it("is exact with no rounding needed", () => {
    const amounts = allocationAmounts(DEFAULT_ALLOCATION, cents(100000));
    expect(amounts).toEqual({ rent: 35000, spending: 25000, savings: 20000, investments: 15000, repayments: 5000 });
  });

  it("handles a zero total", () => {
    const amounts = allocationAmounts(DEFAULT_ALLOCATION, cents(0));
    for (const b of ALLOCATION_BUCKETS) expect(amounts[b]).toBe(0);
  });
});
