import { useCallback, useState } from "react";

/** Extra stock tickers the user has added beyond the default SPY - not
 * app data either, same reasoning as useFinnhubKey. Crypto's top-10 list
 * is never persisted; it's always fetched fresh (it's a live ranking, not
 * a user choice). */
const KEY = "budget-app:extraStockSymbols";

export function useWatchlist(): [string[], (symbol: string) => void, (symbol: string) => void] {
  const [symbols, setSymbols] = useState<string[]>(() => {
    try {
      const raw = localStorage.getItem(KEY);
      return raw ? (JSON.parse(raw) as string[]) : [];
    } catch {
      return [];
    }
  });

  const persist = useCallback((next: string[]) => {
    setSymbols(next);
    localStorage.setItem(KEY, JSON.stringify(next));
  }, []);

  const add = useCallback(
    (symbol: string) => {
      const upper = symbol.trim().toUpperCase();
      if (!upper || symbols.includes(upper)) return;
      persist([...symbols, upper]);
    },
    [symbols, persist],
  );

  const remove = useCallback(
    (symbol: string) => {
      persist(symbols.filter((s) => s !== symbol));
    },
    [symbols, persist],
  );

  return [symbols, add, remove];
}
