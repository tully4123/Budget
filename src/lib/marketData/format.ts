/** Adaptive precision: most stocks/major coins read fine at 2dp, but a
 * sub-cent crypto token needs more places or it just displays as $0.00. */
export function formatPrice(value: number): string {
  const decimals = value !== 0 && Math.abs(value) < 1 ? 6 : 2;
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: decimals,
  }).format(value);
}

export function formatPercent(value: number | null): string {
  if (value === null) return "—";
  const sign = value > 0 ? "+" : "";
  return `${sign}${value.toFixed(2)}%`;
}
