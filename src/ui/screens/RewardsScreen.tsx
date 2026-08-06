import { useEffect, useState } from "react";
import { BADGE_CATALOG } from "../../domain/rewards/badges";
import { levelInfo, nextLevelInfo } from "../../domain/rewards/levels";
import { computeGoalStreak, computeLoggingStreak, computeOnBudgetStreak } from "../../domain/streaks/streaks";
import type { Streak } from "../../domain/types";
import { today } from "../../lib/today";
import { useAppStore } from "../../store/appStore";
import { useRewardState } from "../../store/useRewardState";
import { FlameIcon, StarIcon } from "../components/icons";
import { ScreenHeader } from "../components/ScreenHeader";
import styles from "./rewards/Rewards.module.css";

function StreakCard({ label, streak }: { label: string; streak: Streak }) {
  const alive = streak.current > 0;
  return (
    <div className={styles.streakCard}>
      <div className={alive ? styles.streakFlame : `${styles.streakFlame} ${styles.streakFlameIdle}`}>
        <FlameIcon width={22} height={22} />
        {streak.current}
      </div>
      <div className={styles.streakLabel}>{label}</div>
      <div className={styles.streakBest}>Best: {streak.best}</div>
    </div>
  );
}

export function RewardsScreen() {
  const profile = useAppStore((s) => s.profile);
  const transactions = useAppStore((s) => s.transactions);
  const events = useAppStore((s) => s.events);
  const budgets = useAppStore((s) => s.budgets);

  const { state, newlyEarned } = useRewardState();
  const [celebration, setCelebration] = useState<string | null>(null);

  useEffect(() => {
    if (newlyEarned.length === 0) return;
    setCelebration(`🏅 Badge earned: ${newlyEarned[newlyEarned.length - 1]?.name}`);
  }, [newlyEarned]);

  useEffect(() => {
    if (!celebration) return;
    const timer = setTimeout(() => setCelebration(null), 3500);
    return () => clearTimeout(timer);
  }, [celebration]);

  if (!profile || !state) {
    return (
      <>
        <ScreenHeader title="Rewards" subtitle="Points, level progress, your badge case, and streaks." />
        <p>Finish onboarding to start earning rewards.</p>
      </>
    );
  }

  const currentLevel = levelInfo(state.level);
  const nextLevel = nextLevelInfo(state.level);
  const progressPercent = nextLevel
    ? Math.min(((state.totalPoints - currentLevel.threshold) / (nextLevel.threshold - currentLevel.threshold)) * 100, 100)
    : 100;

  const loggingStreak = computeLoggingStreak(profile.createdAt, today(), transactions, events);
  const onBudgetStreak = computeOnBudgetStreak(profile.createdAt, today(), budgets, transactions);
  const goalStreak = computeGoalStreak(profile.createdAt, today(), transactions);

  const earnedById = new Map(state.badges.map((b) => [b.badgeId, b]));

  return (
    <>
      <ScreenHeader title="Rewards" subtitle="Points, level progress, your badge case, and streaks." />

      {celebration && (
        <div className={styles.celebration} role="status">
          {celebration}
        </div>
      )}

      <div className={styles.levelCard}>
        <div className={styles.levelHeader}>
          <span className={styles.levelName}>
            <StarIcon width={18} height={18} /> Level {state.level} - {currentLevel.name}
          </span>
          <span className={styles.pointsValue}>{state.totalPoints} pts</span>
        </div>
        <div className={styles.levelBarTrack}>
          <div className={styles.levelBarFill} style={{ width: `${progressPercent}%` }} />
        </div>
        <div className={styles.levelSubtext}>
          {nextLevel
            ? `${nextLevel.threshold - state.totalPoints} points to ${nextLevel.name}`
            : "Top level reached"}
        </div>
      </div>

      <div className={styles.streakRow}>
        <StreakCard label="Logging" streak={loggingStreak} />
        <StreakCard label="On-budget" streak={onBudgetStreak} />
        <StreakCard label="Goal (weekly)" streak={goalStreak} />
      </div>

      <div className={styles.sectionTitle}>Badges</div>
      <div className={styles.badgeGrid}>
        {BADGE_CATALOG.map((badge) => {
          const earned = earnedById.get(badge.id);
          return (
            <div key={badge.id} className={earned ? styles.badgeCard : `${styles.badgeCard} ${styles.badgeCardLocked}`}>
              <div className={styles.badgeIcon}>
                <StarIcon width={20} height={20} />
              </div>
              <div className={styles.badgeName}>{badge.name}</div>
              <div className={styles.badgeDescription}>{badge.description}</div>
              {earned && <div className={styles.badgeDate}>{earned.earnedAt.slice(0, 10)}</div>}
            </div>
          );
        })}
      </div>
    </>
  );
}
