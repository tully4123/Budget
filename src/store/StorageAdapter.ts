/**
 * The one interface allowed to touch persistence. Nothing outside an
 * implementation of this interface may read/write localStorage directly -
 * that's what makes swapping in an API-backed adapter later a matter of
 * writing one new class, not hunting down scattered localStorage calls.
 *
 * Async by design even though LocalStorageAdapter resolves synchronously
 * under the hood - a future network-backed adapter needs the same shape.
 */
export interface StorageAdapter {
  load<T>(collection: string): Promise<T | null>;
  save<T>(collection: string, data: T): Promise<void>;
  clear(collection: string): Promise<void>;
}

/** Collection keys - the full set of things the app persists. Centralized
 * here so store code and the adapter agree on spelling. */
export const COLLECTIONS = {
  profile: "profile",
  incomeSources: "incomeSources",
  categories: "categories",
  transactions: "transactions",
  events: "events",
  budgets: "budgets",
  goals: "goals",
  earnedBadges: "earnedBadges",
  plannerSnapshot: "plannerSnapshot",
} as const;

export type CollectionKey = (typeof COLLECTIONS)[keyof typeof COLLECTIONS];
