import type { Id } from "./common";

declare const PointsBrand: unique symbol;
/** A whole number of reward points - a distinct unit from money (Cents).
 * Branded so the two can never be accidentally mixed. */
export type Points = number & { readonly [PointsBrand]: true };

export function points(value: number): Points {
  if (!Number.isFinite(value) || !Number.isInteger(value)) {
    throw new RangeError(`Points must be an integer, got ${value}`);
  }
  return (value === 0 ? 0 : value) as Points;
}

/** A badge, once earned, stays earned permanently (rule 4's one exception
 * to full derivation) - this record is genuine persisted state, unlike
 * totalPoints/level below which are always recomputed from the ledger. */
export interface EarnedBadge {
  badgeId: Id;
  earnedAt: string; // ISO 8601 datetime
}

/**
 * The reward engine's output shape. totalPoints and level are fully
 * derived - recomputed fresh from the ledger + streak state every time,
 * never trusted from a stale cache. `badges` is seeded from prior earned
 * badges (the persisted exception) and may gain new entries, but never
 * loses one, even if a later ledger edit would mean the criteria are no
 * longer currently true.
 */
export interface RewardState {
  totalPoints: Points;
  level: number;
  badges: EarnedBadge[];
}
