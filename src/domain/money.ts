/**
 * All money in the app is an integer number of cents. Never store or
 * compute money as a float - floats lose cents on repeated add/subtract and
 * make "is this exactly $0.00" checks unreliable. Format to currency only
 * at the display edge (formatCents).
 */

declare const CentsBrand: unique symbol;

/** Branded integer type - use `cents()` to construct one from a known-good
 * integer, or `parseToCents` to construct one from user input. */
export type Cents = number & { readonly [CentsBrand]: true };

/** Constructs a Cents value from an integer. Throws on non-integers so a
 * stray float can never silently enter money math. */
export function cents(value: number): Cents {
  if (!Number.isFinite(value) || !Number.isInteger(value)) {
    throw new RangeError(`Cents must be an integer, got ${value}`);
  }
  // Normalize -0 to 0 - a signed zero must never leak into a Cents value,
  // since it fails Object.is/strict-map-key equality against a normal 0.
  return (value === 0 ? 0 : value) as Cents;
}

export const ZERO_CENTS: Cents = cents(0);

export function add(a: Cents, b: Cents): Cents {
  return cents(a + b);
}

export function subtract(a: Cents, b: Cents): Cents {
  return cents(a - b);
}

export function sum(values: readonly Cents[]): Cents {
  return values.reduce<Cents>((total, v) => add(total, v), ZERO_CENTS);
}

export function negate(a: Cents): Cents {
  return cents(-a);
}

/**
 * Multiplies a money amount by a plain (non-money) factor - e.g. quantity,
 * or a ratio like 0.5 for "half". Rounds to the nearest cent, half away
 * from zero, since money must stay integer.
 */
export function multiply(a: Cents, factor: number): Cents {
  if (!Number.isFinite(factor)) {
    throw new RangeError(`multiply factor must be finite, got ${factor}`);
  }
  return cents(roundHalfAwayFromZero(a * factor));
}

/**
 * Percentage of a money amount, e.g. percentOf(amount, 20) for 20%.
 * Rounds to the nearest cent, half away from zero.
 */
export function percentOf(a: Cents, percent: number): Cents {
  return multiply(a, percent / 100);
}

function roundHalfAwayFromZero(value: number): number {
  return value >= 0 ? Math.round(value) : -Math.round(-value);
}

/**
 * Splits an amount into `parts` shares as evenly as possible, with any
 * leftover cent(s) from rounding distributed one-by-one to the first
 * shares - so the parts always sum back to exactly `a`. Useful for e.g.
 * splitting a required contribution across multiple goals.
 */
export function splitEvenly(a: Cents, parts: number): Cents[] {
  if (!Number.isInteger(parts) || parts <= 0) {
    throw new RangeError(`splitEvenly parts must be a positive integer, got ${parts}`);
  }
  const base = Math.trunc(a / parts);
  const remainder = a - base * parts;
  const shares: Cents[] = [];
  for (let i = 0; i < parts; i++) {
    const extra = i < Math.abs(remainder) ? Math.sign(remainder) : 0;
    shares.push(cents(base + extra));
  }
  return shares;
}

export function isPositive(a: Cents): boolean {
  return a > 0;
}

export function isNegative(a: Cents): boolean {
  return a < 0;
}

export function max(a: Cents, b: Cents): Cents {
  return a >= b ? a : b;
}

export function min(a: Cents, b: Cents): Cents {
  return a <= b ? a : b;
}

/** Never below zero - useful for "remaining budget" style values. */
export function clampToZero(a: Cents): Cents {
  return max(a, ZERO_CENTS);
}

/**
 * Formats cents as a localized currency string at the display edge.
 * `currency` is an ISO 4217 code (e.g. "USD", "AUD").
 */
export function formatCents(
  a: Cents,
  currency: string,
  locale: string = "en-US",
): string {
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
    currencyDisplay: "symbol",
  }).format(a / 100);
}

/**
 * Parses user-entered text (e.g. from a text input) into Cents. Accepts
 * "12.34", "12", "$12.34", "1,234.5", leading/trailing whitespace, and a
 * leading minus sign. Returns null for anything that isn't a valid amount
 * with at most 2 decimal places - callers should treat null as invalid
 * input, not silently coerce to zero.
 */
export function parseToCents(input: string): Cents | null {
  const trimmed = input.trim().replace(/[$,\s]/g, "");
  if (trimmed === "") return null;
  if (!/^-?\d+(\.\d{1,2})?$/.test(trimmed)) return null;

  const negative = trimmed.startsWith("-");
  const unsigned = negative ? trimmed.slice(1) : trimmed;
  const [wholePart, fractionPart = ""] = unsigned.split(".");
  const fractionPadded = (fractionPart + "00").slice(0, 2);
  const totalCents = Number(wholePart) * 100 + Number(fractionPadded);
  return cents(negative ? -totalCents : totalCents);
}
