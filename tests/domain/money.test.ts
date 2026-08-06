import { describe, expect, it } from "vitest";
import {
  add,
  cents,
  clampToZero,
  formatCents,
  isNegative,
  isPositive,
  max,
  min,
  multiply,
  negate,
  parseToCents,
  percentOf,
  splitEvenly,
  subtract,
  sum,
  ZERO_CENTS,
} from "../../src/domain/money";

describe("cents()", () => {
  it("accepts integers", () => {
    expect(cents(500)).toBe(500);
    expect(cents(0)).toBe(0);
    expect(cents(-125)).toBe(-125);
  });

  it("rejects non-integers", () => {
    expect(() => cents(1.5)).toThrow(RangeError);
  });

  it("rejects non-finite values", () => {
    expect(() => cents(Number.NaN)).toThrow(RangeError);
    expect(() => cents(Number.POSITIVE_INFINITY)).toThrow(RangeError);
  });
});

describe("add / subtract / sum / negate", () => {
  it("adds and subtracts exactly, no float drift", () => {
    const a = cents(10);
    const b = cents(20);
    expect(add(a, b)).toBe(30);
    expect(subtract(b, a)).toBe(10);
  });

  it("sums an array of amounts, including empty", () => {
    expect(sum([cents(100), cents(250), cents(-50)])).toBe(300);
    expect(sum([])).toBe(ZERO_CENTS);
  });

  it("negate flips sign", () => {
    expect(negate(cents(150))).toBe(-150);
    expect(negate(cents(-150))).toBe(150);
    expect(negate(ZERO_CENTS)).toBe(0);
  });
});

describe("multiply - rounding: half away from zero", () => {
  it("rounds .5 cent up in magnitude regardless of sign", () => {
    // 100 cents * 0.125 = 12.5 -> rounds to 13
    expect(multiply(cents(100), 0.125)).toBe(13);
    // -100 cents * 0.125 = -12.5 -> rounds to -13 (away from zero, not toward)
    expect(multiply(cents(-100), 0.125)).toBe(-13);
  });

  it("rounds down when below the half cent", () => {
    // 100 * 0.124 = 12.4 -> rounds to 12
    expect(multiply(cents(100), 0.124)).toBe(12);
  });

  it("is exact for whole-cent results", () => {
    expect(multiply(cents(400), 0.25)).toBe(100);
  });

  it("throws on a non-finite factor", () => {
    expect(() => multiply(cents(100), Number.NaN)).toThrow(RangeError);
  });
});

describe("percentOf", () => {
  it("computes simple percentages", () => {
    expect(percentOf(cents(10000), 20)).toBe(2000); // 20% of $100 = $20
    expect(percentOf(cents(10000), 50)).toBe(5000);
  });

  it("rounds half away from zero on odd splits", () => {
    // 1% of $0.50 (50 cents) = 0.5 -> rounds to 1
    expect(percentOf(cents(50), 1)).toBe(1);
  });
});

describe("splitEvenly", () => {
  it("splits evenly when divisible", () => {
    expect(splitEvenly(cents(300), 3)).toEqual([100, 100, 100]);
  });

  it("distributes remainder cents one-by-one so parts sum back exactly", () => {
    const parts = splitEvenly(cents(100), 3); // 33.33 each -> 34/33/33
    expect(parts).toEqual([34, 33, 33]);
    expect(sum(parts)).toBe(100);
  });

  it("handles negative amounts, still summing back exactly", () => {
    const parts = splitEvenly(cents(-100), 3);
    expect(sum(parts)).toBe(-100);
  });

  it("throws for zero or non-integer parts", () => {
    expect(() => splitEvenly(cents(100), 0)).toThrow(RangeError);
    expect(() => splitEvenly(cents(100), 1.5)).toThrow(RangeError);
  });
});

describe("comparisons", () => {
  it("isPositive / isNegative", () => {
    expect(isPositive(cents(1))).toBe(true);
    expect(isPositive(cents(0))).toBe(false);
    expect(isNegative(cents(-1))).toBe(true);
    expect(isNegative(cents(0))).toBe(false);
  });

  it("max / min", () => {
    expect(max(cents(5), cents(10))).toBe(10);
    expect(min(cents(5), cents(10))).toBe(5);
  });

  it("clampToZero never goes negative", () => {
    expect(clampToZero(cents(-50))).toBe(0);
    expect(clampToZero(cents(50))).toBe(50);
  });
});

describe("formatCents", () => {
  it("formats USD", () => {
    expect(formatCents(cents(123456), "USD")).toBe("$1,234.56");
  });

  it("formats a negative amount", () => {
    expect(formatCents(cents(-500), "USD")).toBe("-$5.00");
  });

  it("formats zero", () => {
    expect(formatCents(ZERO_CENTS, "USD")).toBe("$0.00");
  });
});

describe("parseToCents", () => {
  it("parses plain decimals", () => {
    expect(parseToCents("12.34")).toBe(1234);
    expect(parseToCents("12")).toBe(1200);
    expect(parseToCents("0.5")).toBe(50);
    expect(parseToCents(".5")).toBe(null); // no leading digit - reject rather than guess
  });

  it("strips currency symbols, commas, and whitespace", () => {
    expect(parseToCents("$12.34")).toBe(1234);
    expect(parseToCents("1,234.50")).toBe(123450);
    expect(parseToCents("  12.34  ")).toBe(1234);
  });

  it("handles a leading minus sign", () => {
    expect(parseToCents("-12.34")).toBe(-1234);
  });

  it("rejects invalid input rather than coercing to zero", () => {
    expect(parseToCents("")).toBe(null);
    expect(parseToCents("abc")).toBe(null);
    expect(parseToCents("12.345")).toBe(null); // more than 2 decimal places
    expect(parseToCents("12.")).toBe(null);
    expect(parseToCents("--5")).toBe(null);
  });
});
