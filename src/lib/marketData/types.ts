/** Market data is real-money-adjacent but NOT the app's own Cents type -
 * prices need more precision than 2dp (a crypto token can trade at
 * $0.0000234) and this data never touches a transaction/budget/goal, so
 * forcing it through the integer-cents model would only lose precision
 * for no benefit. Plain numbers, formatted for display in format.ts. */

export type AssetKind = "crypto" | "stock";

export interface WatchlistEntry {
  kind: AssetKind;
  /** CoinGecko id (crypto, e.g. "bitcoin") or ticker (stock, e.g. "AAPL"). */
  id: string;
  /** Display name/symbol - crypto ids aren't human-friendly on their own. */
  label: string;
  symbol: string;
}

export interface Quote {
  price: number;
  changePercent: number | null;
}

export interface ChartPoint {
  /** Unix ms. */
  t: number;
  price: number;
}

export type ChartRange = "7D" | "1M" | "3M" | "1Y";

export const CHART_RANGE_DAYS: Record<ChartRange, number> = {
  "7D": 7,
  "1M": 30,
  "3M": 90,
  "1Y": 365,
};
