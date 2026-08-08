import { useEffect, useMemo, useState } from "react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { cryptoRowToQuote, fetchCryptoChart, fetchTopCryptos, type CryptoMarketRow } from "../../lib/marketData/coingecko";
import { FinnhubPlanError, fetchStockCandles, fetchStockQuote } from "../../lib/marketData/finnhub";
import { formatPercent, formatPrice } from "../../lib/marketData/format";
import type { ChartPoint, ChartRange, Quote, WatchlistEntry } from "../../lib/marketData/types";
import { useFinnhubKey } from "../../lib/marketData/useFinnhubKey";
import { useWatchlist } from "../../lib/marketData/useWatchlist";
import { Button } from "../components/Button";
import { ScreenHeader } from "../components/ScreenHeader";
import { TextField } from "../components/TextField";
import { PlusIcon, TrashIcon } from "../components/icons";
import styles from "./investing/Investing.module.css";

const RANGES: ChartRange[] = ["7D", "1M", "3M", "1Y"];
const SP500: WatchlistEntry = { kind: "stock", id: "SPY", label: "S&P 500", symbol: "SPY" };

function entryKey(e: WatchlistEntry): string {
  return `${e.kind}:${e.id}`;
}

interface Row {
  entry: WatchlistEntry;
  quote: Quote | null;
  error: string | null;
  loading: boolean;
}

const CHART_COLORS = ["var(--color-accent)", "var(--color-positive)", "var(--color-warning)", "var(--color-cat-5)", "var(--color-cat-6)"];

export function InvestingScreen() {
  const [finnhubKey] = useFinnhubKey();
  const [extraStocks, addStock, removeStock] = useWatchlist();

  const [cryptoRows, setCryptoRows] = useState<CryptoMarketRow[]>([]);
  const [cryptoError, setCryptoError] = useState<string | null>(null);
  const [cryptoLoading, setCryptoLoading] = useState(true);

  const [stockQuotes, setStockQuotes] = useState<Record<string, { quote: Quote | null; error: string | null; loading: boolean }>>({});

  const [symbolDraft, setSymbolDraft] = useState("");
  const [addBusy, setAddBusy] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);

  const [selected, setSelected] = useState<Set<string>>(() => new Set([entryKey(SP500)]));
  const [range, setRange] = useState<ChartRange>("1M");
  const [series, setSeries] = useState<Record<string, ChartPoint[]>>({});
  const [seriesErrors, setSeriesErrors] = useState<Record<string, string>>({});
  const [seriesLoading, setSeriesLoading] = useState(false);

  const stockEntries = useMemo<WatchlistEntry[]>(
    () => [SP500, ...extraStocks.map((s): WatchlistEntry => ({ kind: "stock", id: s, label: s, symbol: s }))],
    [extraStocks],
  );

  const cryptoEntries = useMemo<WatchlistEntry[]>(
    () => cryptoRows.map((r) => ({ kind: "crypto", id: r.id, label: r.name, symbol: r.symbol.toUpperCase() })),
    [cryptoRows],
  );

  const allEntries = useMemo(() => [...stockEntries, ...cryptoEntries], [stockEntries, cryptoEntries]);
  const entryByKey = useMemo(() => new Map(allEntries.map((e) => [entryKey(e), e])), [allEntries]);

  useEffect(() => {
    let cancelled = false;
    setCryptoLoading(true);
    fetchTopCryptos(10)
      .then((rows) => {
        if (!cancelled) setCryptoRows(rows);
      })
      .catch((e: Error) => {
        if (!cancelled) setCryptoError(e.message);
      })
      .finally(() => {
        if (!cancelled) setCryptoLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!finnhubKey) return;
    let cancelled = false;
    for (const entry of stockEntries) {
      setStockQuotes((prev) => ({ ...prev, [entry.symbol]: { quote: null, error: null, loading: true } }));
      fetchStockQuote(entry.symbol, finnhubKey)
        .then((quote) => {
          if (!cancelled) setStockQuotes((prev) => ({ ...prev, [entry.symbol]: { quote, error: null, loading: false } }));
        })
        .catch((e: Error) => {
          if (!cancelled) setStockQuotes((prev) => ({ ...prev, [entry.symbol]: { quote: null, error: e.message, loading: false } }));
        });
    }
    return () => {
      cancelled = true;
    };
  }, [finnhubKey, stockEntries]);

  useEffect(() => {
    let cancelled = false;
    setSeriesLoading(true);
    setSeriesErrors({});
    const keys = selected.size > 0 ? [...selected] : [entryKey(SP500)];

    Promise.all(
      keys.map(async (key) => {
        const entry = entryByKey.get(key);
        if (!entry) return;
        try {
          const points =
            entry.kind === "crypto"
              ? await fetchCryptoChart(entry.id, range)
              : await fetchStockCandles(entry.symbol, finnhubKey, range);
          if (!cancelled) setSeries((prev) => ({ ...prev, [key]: points }));
        } catch (e) {
          const message = e instanceof FinnhubPlanError ? e.message : e instanceof Error ? e.message : "Chart unavailable";
          if (!cancelled) setSeriesErrors((prev) => ({ ...prev, [key]: message }));
        }
      }),
    ).finally(() => {
      if (!cancelled) setSeriesLoading(false);
    });

    return () => {
      cancelled = true;
    };
  }, [selected, range, finnhubKey, entryByKey]);

  function toggleSelected(key: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  async function handleAddSymbol() {
    const symbol = symbolDraft.trim().toUpperCase();
    if (!symbol) return;
    if (!finnhubKey) {
      setAddError("Add a Finnhub API key in Settings first.");
      return;
    }
    setAddBusy(true);
    setAddError(null);
    try {
      await fetchStockQuote(symbol, finnhubKey);
      addStock(symbol);
      setSymbolDraft("");
    } catch (e) {
      setAddError(e instanceof Error ? e.message : "Couldn't find that symbol.");
    } finally {
      setAddBusy(false);
    }
  }

  const stockRows: Row[] = stockEntries.map((entry) => ({
    entry,
    quote: stockQuotes[entry.symbol]?.quote ?? null,
    error: !finnhubKey ? "Add a Finnhub API key in Settings" : (stockQuotes[entry.symbol]?.error ?? null),
    loading: stockQuotes[entry.symbol]?.loading ?? false,
  }));

  const cryptoRowsMapped: Row[] = cryptoRows.map((row) => ({
    entry: { kind: "crypto", id: row.id, label: row.name, symbol: row.symbol.toUpperCase() },
    quote: cryptoRowToQuote(row),
    error: cryptoError,
    loading: cryptoLoading,
  }));

  // Normalize each selected series to % change from its first point, so
  // wildly different price scales (BTC vs. a $4 stock) overlay sensibly.
  // Each line carries both its raw price and its % change from the range's
  // first point - which one actually gets plotted is decided below, once
  // we know whether this is a single view (raw price) or a comparison
  // (normalized %, so a $1900 coin and a $400 stock overlay sensibly).
  const chartLines = useMemo(() => {
    const keys = selected.size > 0 ? [...selected] : [entryKey(SP500)];
    return keys
      .map((key) => {
        const points = series[key];
        const first = points?.[0];
        if (!points || !first) return null;
        const base = first.price;
        return {
          key,
          label: entryByKey.get(key)?.label ?? key,
          points: points.map((p) => ({ t: p.t, price: p.price, pct: ((p.price - base) / base) * 100 })),
        };
      })
      .filter((l): l is NonNullable<typeof l> => l !== null);
  }, [selected, series, entryByKey]);

  const isComparing = chartLines.length > 1;

  const chartData = useMemo(() => {
    const byTime = new Map<number, Record<string, number>>();
    for (const line of chartLines) {
      for (const point of line.points) {
        const row = byTime.get(point.t) ?? {};
        row[line.key] = isComparing ? point.pct : point.price;
        byTime.set(point.t, row);
      }
    }
    return [...byTime.entries()]
      .sort(([a], [b]) => a - b)
      .map(([t, values]) => ({ t, ...values }));
  }, [chartLines, isComparing]);

  function renderRow(row: Row) {
    const key = entryKey(row.entry);
    const isSelected = selected.has(key);
    const isRemovable = row.entry.kind === "stock" && row.entry.symbol !== "SPY";
    return (
      <div key={key} className={`${styles.row} ${isSelected ? styles.rowSelected : ""}`}>
        <input
          type="checkbox"
          className={styles.checkbox}
          checked={isSelected}
          onChange={() => toggleSelected(key)}
          aria-label={`Compare ${row.entry.label}`}
        />
        <div className={styles.rowMain} onClick={() => setSelected(new Set([key]))}>
          <div className={styles.rowName}>{row.entry.label}</div>
          <div className={styles.rowSymbol}>{row.entry.symbol}</div>
        </div>
        {row.loading ? (
          <span className={styles.rowMuted}>Loading…</span>
        ) : row.error ? (
          <span className={styles.rowError}>{row.error}</span>
        ) : row.quote ? (
          <div className={styles.rowStats}>
            <div className={styles.rowPrice}>{formatPrice(row.quote.price)}</div>
            <div
              className={
                row.quote.changePercent === null
                  ? styles.rowMuted
                  : row.quote.changePercent >= 0
                    ? styles.changePositive
                    : styles.changeNegative
              }
            >
              {formatPercent(row.quote.changePercent)}
            </div>
          </div>
        ) : null}
        {isRemovable && (
          <button
            type="button"
            className={styles.removeButton}
            aria-label={`Remove ${row.entry.symbol}`}
            onClick={(e) => {
              e.stopPropagation();
              removeStock(row.entry.symbol);
              setSelected((prev) => {
                const next = new Set(prev);
                next.delete(key);
                return next;
              });
            }}
          >
            <TrashIcon width={14} height={14} />
          </button>
        )}
      </div>
    );
  }

  return (
    <>
      <ScreenHeader title="Investing" subtitle="Browse the market. Check a few things to compare them." />

      <div className={styles.chartCard}>
        <div className={styles.chartHeader}>
          <div className={styles.chartTitle}>
            {isComparing ? chartLines.map((l) => l.label).join(" vs ") : (chartLines[0]?.label ?? "S&P 500")}
          </div>
          <div className={styles.rangeGroup}>
            {RANGES.map((r) => (
              <button
                key={r}
                type="button"
                className={`${styles.rangeButton} ${range === r ? styles.rangeButtonActive : ""}`}
                onClick={() => setRange(r)}
              >
                {r}
              </button>
            ))}
          </div>
        </div>

        {seriesLoading && chartData.length === 0 ? (
          <div className={styles.chartEmpty}>Loading chart…</div>
        ) : chartData.length === 0 ? (
          <div className={styles.chartEmpty}>
            {Object.values(seriesErrors)[0] ?? "No chart data available."}
          </div>
        ) : (
          <div className={styles.chartWrap}>
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={chartData}>
                <CartesianGrid stroke="var(--color-border)" vertical={false} />
                <XAxis
                  dataKey="t"
                  tickFormatter={(t: number) => new Date(t).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                  tick={{ fontSize: 11, fill: "var(--color-text-faint)" }}
                  axisLine={false}
                  tickLine={false}
                  minTickGap={40}
                />
                <YAxis
                  tickFormatter={(v: number) => (isComparing ? `${v.toFixed(0)}%` : formatPrice(v))}
                  tick={{ fontSize: 11, fill: "var(--color-text-faint)" }}
                  axisLine={false}
                  tickLine={false}
                  width={isComparing ? 40 : 64}
                />
                <Tooltip
                  formatter={(value, name) => {
                    const num = typeof value === "number" ? value : 0;
                    const label = chartLines.find((l) => l.key === name)?.label ?? String(name);
                    return [isComparing ? `${num >= 0 ? "+" : ""}${num.toFixed(2)}%` : formatPrice(num), label];
                  }}
                  labelFormatter={(label) => {
                    const t = typeof label === "number" ? label : Number(label);
                    return new Date(t).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
                  }}
                  contentStyle={{ background: "var(--color-surface)", border: "1px solid var(--color-border)", borderRadius: "var(--radius-sm)" }}
                />
                {chartLines.map((line, i) => (
                  <Line
                    key={line.key}
                    type="monotone"
                    dataKey={line.key}
                    stroke={CHART_COLORS[i % CHART_COLORS.length]}
                    strokeWidth={2}
                    dot={false}
                    connectNulls
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      <div className={styles.sectionTitle}>Stocks</div>
      <div className={styles.card}>
        {stockRows.map(renderRow)}
        <div className={styles.addRow}>
          <TextField
            label="Add a stock symbol"
            value={symbolDraft}
            onChange={(e) => setSymbolDraft(e.target.value)}
            placeholder="e.g. AAPL"
            onKeyDown={(e) => e.key === "Enter" && handleAddSymbol()}
          />
          <Button variant="secondary" onClick={handleAddSymbol} disabled={addBusy || !symbolDraft.trim()}>
            <PlusIcon width={16} height={16} />
            Add
          </Button>
        </div>
        {addError && <p className={styles.rowError}>{addError}</p>}
      </div>

      <div className={styles.sectionTitle}>Top cryptocurrencies</div>
      <div className={styles.card}>{cryptoRowsMapped.map(renderRow)}</div>
    </>
  );
}
