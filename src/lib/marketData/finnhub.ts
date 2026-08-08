/** Finnhub's free tier - genuinely CORS-open for direct browser calls
 * (verified: access-control-allow-origin: *), but needs your own API key
 * (free at finnhub.io/register, ~30 seconds, no card). The key is stored
 * in this browser's localStorage and sent as a query param on every
 * request - fine for a personal local-first app, but worth knowing: it's
 * visible in the Network tab, so don't reuse a key you care about keeping
 * private for anything beyond this.
 *
 * Historical candles are gated on some free-tier signups (Finnhub has
 * tightened this over time) - callers must handle fetchStockCandles
 * throwing and fall back to quote-only display. */
import type { ChartPoint, ChartRange, Quote } from "./types";
import { CHART_RANGE_DAYS } from "./types";

const BASE = "https://finnhub.io/api/v1";

export class FinnhubPlanError extends Error {}

function requireKey(apiKey: string): void {
  if (!apiKey.trim()) throw new Error("No Finnhub API key set - add one in Settings.");
}

interface RawQuote {
  c: number; // current
  d: number | null; // change
  dp: number | null; // change percent
}

export async function fetchStockQuote(symbol: string, apiKey: string): Promise<Quote> {
  requireKey(apiKey);
  const res = await fetch(`${BASE}/quote?symbol=${encodeURIComponent(symbol)}&token=${apiKey}`);
  if (!res.ok) throw new Error(`Finnhub quote request failed: ${res.status}`);
  const data = (await res.json()) as RawQuote;
  if (data.c === 0 && data.d === null) throw new Error(`No quote data for "${symbol}" - check the symbol.`);
  return { price: data.c, changePercent: data.dp };
}

interface RawCandles {
  s: "ok" | "no_data";
  t?: number[];
  c?: number[];
}

export async function fetchStockCandles(symbol: string, apiKey: string, range: ChartRange): Promise<ChartPoint[]> {
  requireKey(apiKey);
  const days = CHART_RANGE_DAYS[range];
  const to = Math.floor(Date.now() / 1000);
  const from = to - days * 24 * 60 * 60;
  const resolution = days > 90 ? "W" : "D";
  const res = await fetch(
    `${BASE}/stock/candle?symbol=${encodeURIComponent(symbol)}&resolution=${resolution}&from=${from}&to=${to}&token=${apiKey}`,
  );
  if (res.status === 403) {
    throw new FinnhubPlanError("Historical charts need a paid Finnhub plan - your free key only covers live quotes.");
  }
  if (!res.ok) throw new Error(`Finnhub candle request failed: ${res.status}`);
  const data = (await res.json()) as RawCandles;
  if (data.s !== "ok" || !data.t || !data.c) {
    throw new FinnhubPlanError("No historical chart data available for this symbol on your plan.");
  }
  const times = data.t;
  const closes = data.c;
  const points: ChartPoint[] = [];
  for (let i = 0; i < times.length; i++) {
    const price = closes[i];
    const time = times[i];
    if (price !== undefined && time !== undefined) points.push({ t: time * 1000, price });
  }
  return points;
}
