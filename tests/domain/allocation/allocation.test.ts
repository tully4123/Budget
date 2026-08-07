import { describe, expect, it } from "vitest";
import {
  ALLOCATION_BUCKETS,
  allocationAmounts,
  DEFAULT_ALLOCATION,
  overAllocatedPercent,
  setBucketPercent,
  totalAllocatedPercent,
  unallocatedPercent,
  type WeeklyAllocation,
} from "../../../src/domain/allocation/allocation";
import { cents } from "../../../src/domain/money";

describe("setBucketPercent", () => {
  it("changes only the touched bucket, leaving the others exactly as they were", () => {
    const current: WeeklyAllocation = { rent: 35, spending: 25, savings: 20, investments: 15, repayments: 5 };
    const next = setBucketPercent(current, "rent", 60);
    expect(next).toEqual({ rent: 60, spending: 25, savings: 20, investments: 15, repayments: 5 });
  });

  it("clamps to [0, 100]", () => {
    expect(setBucketPercent(DEFAULT_ALLOCATION, "investments", 130).investments).toBe(100);
    expect(setBucketPercent(DEFAULT_ALLOCATION, "investments", -20).investments).toBe(0);
  });

  it("rounds fractional input", () => {
    expect(setBucketPercent(DEFAULT_ALLOCATION, "savings", 12.6).savings).toBe(13);
  });

  it("allows the total to land anywhere - under, over, or at 100", () => {
    const allLow: WeeklyAllocation = { rent: 5, spending: 5, savings: 5, investments: 5, repayments: 5 };
    expect(totalAllocatedPercent(allLow)).toBe(25);

    const allHigh: WeeklyAllocation = { rent: 80, spending: 80, savings: 0, investments: 0, repayments: 0 };
    expect(totalAllocatedPercent(allHigh)).toBe(160);
  });

  it("is idempotent when re-applying the same value", () => {
    const once = setBucketPercent(DEFAULT_ALLOCATION, "savings", 40);
    const twice = setBucketPercent(once, "savings", 40);
    expect(twice).toEqual(once);
  });
});

describe("totalAllocatedPercent / unallocatedPercent / overAllocatedPercent", () => {
  it("reports fully allocated as 100 total, 0 unallocated, 0 over", () => {
    expect(totalAllocatedPercent(DEFAULT_ALLOCATION)).toBe(100);
    expect(unallocatedPercent(DEFAULT_ALLOCATION)).toBe(0);
    expect(overAllocatedPercent(DEFAULT_ALLOCATION)).toBe(0);
  });

  it("reports leftover when under 100", () => {
    const under: WeeklyAllocation = { rent: 30, spending: 20, savings: 10, investments: 0, repayments: 0 };
    expect(totalAllocatedPercent(under)).toBe(60);
    expect(unallocatedPercent(under)).toBe(40);
    expect(overAllocatedPercent(under)).toBe(0);
  });

  it("reports the overage when past 100", () => {
    const over: WeeklyAllocation = { rent: 60, spending: 40, savings: 20, investments: 0, repayments: 0 };
    expect(totalAllocatedPercent(over)).toBe(120);
    expect(unallocatedPercent(over)).toBe(0);
    expect(overAllocatedPercent(over)).toBe(20);
  });
});

describe("allocationAmounts", () => {
  it("gives each bucket its own rounded share, independent of the others", () => {
    const amounts = allocationAmounts(DEFAULT_ALLOCATION, cents(100000));
    expect(amounts).toEqual({ rent: 35000, spending: 25000, savings: 20000, investments: 15000, repayments: 5000 });
  });

  it("does not force amounts to sum back to the weekly total when under-allocated", () => {
    const under: WeeklyAllocation = { rent: 30, spending: 20, savings: 0, investments: 0, repayments: 0 };
    const amounts = allocationAmounts(under, cents(10000));
    expect(amounts.rent).toBe(3000);
    expect(amounts.spending).toBe(2000);
    const total = ALLOCATION_BUCKETS.reduce((t, b) => t + amounts[b], 0);
    expect(total).toBe(5000); // less than the 10000 weekly total - the rest is unallocated
  });

  it("can sum to more than the weekly total when over-allocated", () => {
    const over: WeeklyAllocation = { rent: 70, spending: 60, savings: 0, investments: 0, repayments: 0 };
    const amounts = allocationAmounts(over, cents(10000));
    const total = ALLOCATION_BUCKETS.reduce((t, b) => t + amounts[b], 0);
    expect(total).toBe(13000); // 130% of the weekly total
  });

  it("handles a zero total", () => {
    const amounts = allocationAmounts(DEFAULT_ALLOCATION, cents(0));
    for (const b of ALLOCATION_BUCKETS) expect(amounts[b]).toBe(0);
  });
});
