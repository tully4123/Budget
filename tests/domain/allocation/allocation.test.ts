import { describe, expect, it } from "vitest";
import {
  ALLOCATION_BUCKETS,
  allocationPercents,
  amountForPercent,
  DEFAULT_ALLOCATION,
  overAllocatedCents,
  setBucketAmount,
  totalAllocatedCents,
  unallocatedCents,
  type WeeklyAllocation,
} from "../../../src/domain/allocation/allocation";
import { cents, ZERO_CENTS } from "../../../src/domain/money";

describe("setBucketAmount", () => {
  it("changes only the touched bucket, leaving the others exactly as they were", () => {
    const current: WeeklyAllocation = {
      rent: cents(35000),
      spending: cents(25000),
      savings: cents(20000),
      investments: cents(15000),
      repayments: cents(5000),
    };
    const next = setBucketAmount(current, "rent", cents(60000));
    expect(next).toEqual({ ...current, rent: cents(60000) });
  });

  it("clamps negative amounts to zero", () => {
    expect(setBucketAmount(DEFAULT_ALLOCATION, "rent", cents(-500)).rent).toBe(ZERO_CENTS);
  });

  it("starts every bucket at zero by default - no assumed split", () => {
    for (const b of ALLOCATION_BUCKETS) expect(DEFAULT_ALLOCATION[b]).toBe(ZERO_CENTS);
  });

  it("is idempotent when re-applying the same value", () => {
    const once = setBucketAmount(DEFAULT_ALLOCATION, "savings", cents(4000));
    const twice = setBucketAmount(once, "savings", cents(4000));
    expect(twice).toEqual(once);
  });
});

describe("totalAllocatedCents / unallocatedCents / overAllocatedCents", () => {
  const allocation: WeeklyAllocation = {
    rent: cents(30000),
    spending: cents(20000),
    savings: cents(10000),
    investments: cents(0),
    repayments: cents(0),
  };

  it("sums every bucket", () => {
    expect(totalAllocatedCents(allocation)).toBe(cents(60000));
  });

  it("reports leftover against a weekly income above the total", () => {
    expect(unallocatedCents(allocation, cents(100000))).toBe(cents(40000));
    expect(overAllocatedCents(allocation, cents(100000))).toBe(ZERO_CENTS);
  });

  it("reports the overage once the total passes a weekly income", () => {
    expect(unallocatedCents(allocation, cents(40000))).toBe(ZERO_CENTS);
    expect(overAllocatedCents(allocation, cents(40000))).toBe(cents(20000));
  });

  it("is zero-safe with no income to measure against", () => {
    expect(unallocatedCents(allocation, ZERO_CENTS)).toBe(ZERO_CENTS);
    expect(overAllocatedCents(allocation, ZERO_CENTS)).toBe(cents(60000));
  });
});

describe("allocationPercents / amountForPercent", () => {
  it("derives whole-percent shares of a known weekly income", () => {
    const allocation: WeeklyAllocation = {
      rent: cents(35000),
      spending: cents(25000),
      savings: cents(20000),
      investments: cents(15000),
      repayments: cents(5000),
    };
    const percents = allocationPercents(allocation, cents(100000));
    expect(percents).toEqual({ rent: 35, spending: 25, savings: 20, investments: 15, repayments: 5 });
  });

  it("is zero across the board with no income", () => {
    const percents = allocationPercents(DEFAULT_ALLOCATION, ZERO_CENTS);
    for (const b of ALLOCATION_BUCKETS) expect(percents[b]).toBe(0);
  });

  it("amountForPercent is the inverse of allocationPercents at round numbers", () => {
    expect(amountForPercent(35, cents(100000))).toBe(cents(35000));
    expect(amountForPercent(0, cents(100000))).toBe(ZERO_CENTS);
  });

  it("amountForPercent is zero with no income to measure against", () => {
    expect(amountForPercent(50, ZERO_CENTS)).toBe(ZERO_CENTS);
  });
});
