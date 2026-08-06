import type { CollectionKey, StorageAdapter } from "./StorageAdapter";

const KEY_PREFIX = "budget-app:";

function storageKey(collection: CollectionKey): string {
  return `${KEY_PREFIX}${collection}`;
}

/** v1's only StorageAdapter - browser localStorage, JSON-serialized per
 * collection. A future API-backed adapter implements the same interface. */
export class LocalStorageAdapter implements StorageAdapter {
  load<T>(collection: CollectionKey): Promise<T | null> {
    const raw = localStorage.getItem(storageKey(collection));
    if (raw === null) return Promise.resolve(null);
    try {
      return Promise.resolve(JSON.parse(raw) as T);
    } catch {
      // Corrupt entry (e.g. hand-edited or from an incompatible version) -
      // treat as absent rather than crashing the app on boot.
      return Promise.resolve(null);
    }
  }

  save<T>(collection: CollectionKey, data: T): Promise<void> {
    localStorage.setItem(storageKey(collection), JSON.stringify(data));
    return Promise.resolve();
  }

  clear(collection: CollectionKey): Promise<void> {
    localStorage.removeItem(storageKey(collection));
    return Promise.resolve();
  }
}
