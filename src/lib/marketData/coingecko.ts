/** CoinGecko's public API - free, no key, genuinely CORS-open for direct
 * browser calls (verified: access-control-allow-origin: *). No auth, so no
 * secret to worry about exposing client-side. */
import type { ChartPoint, ChartRange, Quote } from "./types";
import { CHART_RANGE_DAYS } from "./types";

const BASE = "https://api.coingecko.com/api/v3";

export interface CryptoMarketRow {
  id: string;
  symbol: string;
  name: string;
  current_price: number;
  price_change_percentage_24h: number | null;
  sparkline_in_7d?: { price: number[] };
}

/** Top N cryptocurrencies by market cap, with current price, 24h change,
 * and a 7-day sparkline in one call. */
export async function fetchTopCryptos(limit = 10): Promise<CryptoMarketRow[]> {
  const url = `${BASE}/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=${limit}&page=1&sparkline=true&price_change_percentage=24h`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`CoinGecko markets request failed: ${res.status}`);
  return (await res.json()) as CryptoMarketRow[];
}

export function cryptoRowToQuote(row: CryptoMarketRow): Quote {
  return { price: row.current_price, changePercent: row.price_change_percentage_24h };
}

/** Historical price series for one coin over a range. */
export async function fetchCryptoChart(coinId: string, range: ChartRange): Promise<ChartPoint[]> {
  const days = CHART_RANGE_DAYS[range];
  const url = `${BASE}/coins/${coinId}/market_chart?vs_currency=usd&days=${days}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`CoinGecko chart request failed: ${res.status}`);
  const data = (await res.json()) as { prices: [number, number][] };
  return data.prices.map(([t, price]) => ({ t, price }));
}
