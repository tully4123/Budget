import { useCallback, useState } from "react";

/** A config value, not app data - kept separate from the StorageAdapter's
 * domain collections (transactions/budgets/etc.), same "budget-app:"
 * namespace so it's still obvious in devtools what owns it. */
const KEY = "budget-app:finnhubApiKey";

export function useFinnhubKey(): [string, (key: string) => void] {
  const [key, setKeyState] = useState(() => localStorage.getItem(KEY) ?? "");

  const setKey = useCallback((next: string) => {
    setKeyState(next);
    if (next.trim()) {
      localStorage.setItem(KEY, next.trim());
    } else {
      localStorage.removeItem(KEY);
    }
  }, []);

  return [key, setKey];
}
