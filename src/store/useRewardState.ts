import { useEffect, useMemo, useRef, useState } from "react";
import { BADGE_CATALOG, type BadgeDefinition } from "../domain/rewards/badges";
import { computeRewardState } from "../domain/rewards/rewards";
import type { RewardState } from "../domain/types";
import { today } from "../lib/today";
import { useAppStore } from "./appStore";

/** Computes the current RewardState from live store state, persists any
 * newly-earned badges back to the store, and surfaces which badge
 * definitions were newly earned this render so the UI can celebrate them
 * exactly once. */
export function useRewardState(): { state: RewardState | null; newlyEarned: BadgeDefinition[] } {
  const profile = useAppStore((s) => s.profile);
  const transactions = useAppStore((s) => s.transactions);
  const events = useAppStore((s) => s.events);
  const budgets = useAppStore((s) => s.budgets);
  const goals = useAppStore((s) => s.goals);
  const earnedBadges = useAppStore((s) => s.earnedBadges);
  const setEarnedBadges = useAppStore((s) => s.setEarnedBadges);

  const state = useMemo(() => {
    if (!profile) return null;
    return computeRewardState({
      accountCreatedAt: profile.createdAt,
      today: today(),
      nowIso: new Date().toISOString(),
      transactions,
      events,
      budgets,
      goals,
      previousBadges: earnedBadges,
    });
    // earnedBadges deliberately omitted - it's the *input* baseline this
    // recomputes from, and syncing it back (below) would otherwise loop.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile, transactions, events, budgets, goals]);

  const [newlyEarned, setNewlyEarned] = useState<BadgeDefinition[]>([]);
  const knownIds = useRef<Set<string>>(new Set(earnedBadges.map((b) => b.badgeId)));

  useEffect(() => {
    if (!state) return;
    const fresh = state.badges.filter((b) => !knownIds.current.has(b.badgeId));
    if (fresh.length > 0) {
      setNewlyEarned(fresh.map((b) => BADGE_CATALOG.find((def) => def.id === b.badgeId)).filter((b): b is BadgeDefinition => !!b));
      knownIds.current = new Set(state.badges.map((b) => b.badgeId));
      setEarnedBadges(state.badges);
    }
  }, [state, setEarnedBadges]);

  return { state, newlyEarned };
}
