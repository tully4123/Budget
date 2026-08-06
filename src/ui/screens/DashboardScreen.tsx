import { Link } from "react-router-dom";
import { computeBudgetStatus } from "../../domain/budgets/budgets";
import { computeFundedCents } from "../../domain/goals/goals";
import { levelInfo } from "../../domain/rewards/levels";
import { computeGoalStreak, computeLoggingStreak, computeOnBudgetStreak } from "../../domain/streaks/streaks";
import { monthKey } from "../../domain/dates";
import { today } from "../../lib/today";
import { useAppStore } from "../../store/appStore";
import { usePlannerResult } from "../../store/usePlannerResult";
import { useRewardState } from "../../store/useRewardState";
import { CategoryIcon } from "../components/CategoryIcon";
import { FlagIcon, FlameIcon, StarIcon } from "../components/icons";
import { Money } from "../components/Money";
import { ScreenHeader } from "../components/ScreenHeader";
import styles from "./dashboard/Dashboard.module.css";

export function DashboardScreen() {
  const profile = useAppStore((s) => s.profile);
  const categories = useAppStore((s) => s.categories);
  const budgets = useAppStore((s) => s.budgets);
  const transactions = useAppStore((s) => s.transactions);
  const events = useAppStore((s) => s.events);
  const goals = useAppStore((s) => s.goals);

  const plan = usePlannerResult();
  const { state: rewardState } = useRewardState();

  if (!profile) return null;
  const currency = profile.currency;
  const currentMonth = monthKey(today());

  const monthBudgets = budgets.filter((b) => b.month === currentMonth);
  const categoryById = new Map(categories.map((c) => [c.id, c]));

  const activeGoals = goals.filter((g) => g.status === "active");

  const loggingStreak = computeLoggingStreak(profile.createdAt, today(), transactions, events);
  const onBudgetStreak = computeOnBudgetStreak(profile.createdAt, today(), budgets, transactions);
  const goalStreak = computeGoalStreak(profile.createdAt, today(), transactions);

  const topInsights = (plan?.insights ?? []).slice(0, 3);

  return (
    <>
      <ScreenHeader title="Home" subtitle="How you're doing, at a glance." />

      <div className={styles.heroCard}>
        <div className={styles.heroStat}>
          <div className={styles.heroLabel}>Safe to spend today</div>
          <div className={styles.heroValue}>
            {plan ? <Money cents={plan.safeToSpend.todayCents} currency={currency} tone="accent" /> : "—"}
          </div>
        </div>
        <div className={styles.heroStat}>
          <div className={styles.heroLabel}>This week</div>
          <div className={styles.heroValue}>
            {plan ? <Money cents={plan.safeToSpend.thisWeekCents} currency={currency} tone="accent" /> : "—"}
          </div>
        </div>
      </div>

      <div className={styles.section}>
        <div className={styles.sectionHeader}>
          <span className={styles.sectionTitle}>Budget health</span>
          <Link to="/budgets" className={styles.sectionLink}>
            See all
          </Link>
        </div>
        {monthBudgets.length === 0 ? (
          <p className={styles.empty}>
            No budgets set for this month yet - <Link to="/budgets">set one up</Link>.
          </p>
        ) : (
          monthBudgets.map((b) => {
            const category = categoryById.get(b.categoryId);
            const status = computeBudgetStatus(b, transactions, today());
            const percent = Math.min(status.percentUsed, 100);
            const fillClass =
              status.percentUsed >= 100
                ? styles.fillNegative
                : status.pace === "over-pace"
                  ? styles.fillWarning
                  : styles.fillPositive;
            return (
              <div key={b.id} className={styles.compactRow}>
                <span className={styles.compactDot} style={{ background: `var(--color-${category?.colorToken ?? "cat-8"})` }}>
                  <CategoryIcon iconKey={category?.iconKey ?? "box"} width={13} height={13} />
                </span>
                <div className={styles.compactMain}>
                  <div className={styles.compactLabel}>
                    <span>{category?.name ?? "Category"}</span>
                    <Money cents={status.remainingCents} currency={currency} tone={status.remainingCents < 0 ? "negative" : "muted"} />
                  </div>
                  <div className={styles.compactBarTrack}>
                    <div className={`${styles.compactBarFill} ${fillClass}`} style={{ width: `${percent}%` }} />
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      <div className={styles.section}>
        <div className={styles.sectionHeader}>
          <span className={styles.sectionTitle}>Goals</span>
          <Link to="/goals" className={styles.sectionLink}>
            See all
          </Link>
        </div>
        {activeGoals.length === 0 ? (
          <p className={styles.empty}>
            No active goals yet - <Link to="/goals">create one</Link>.
          </p>
        ) : (
          activeGoals.map((g) => {
            const funded = computeFundedCents(g.id, transactions);
            const percent = g.targetCents > 0 ? Math.min((funded / g.targetCents) * 100, 100) : 0;
            return (
              <div key={g.id} className={styles.compactRow}>
                <span className={styles.compactDot} style={{ background: "var(--color-accent)" }}>
                  <FlagIcon width={13} height={13} />
                </span>
                <div className={styles.compactMain}>
                  <div className={styles.compactLabel}>
                    <span>{g.name}</span>
                    <span>{percent.toFixed(0)}%</span>
                  </div>
                  <div className={styles.compactBarTrack}>
                    <div className={`${styles.compactBarFill} ${styles.fillAccent}`} style={{ width: `${percent}%` }} />
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      <div className={styles.section}>
        <div className={styles.sectionTitle}>Streaks</div>
        <div className={styles.streakStrip}>
          {[
            { label: "Logging", streak: loggingStreak },
            { label: "On-budget", streak: onBudgetStreak },
            { label: "Goal (weekly)", streak: goalStreak },
          ].map(({ label, streak }) => (
            <div key={label} className={styles.streakItem}>
              <div className={streak.current > 0 ? styles.streakValue : `${styles.streakValue} ${styles.streakValueIdle}`}>
                <FlameIcon width={16} height={16} />
                {streak.current}
              </div>
              <div className={styles.streakLabel}>{label}</div>
            </div>
          ))}
        </div>
      </div>

      {rewardState && (
        <div className={styles.section}>
          <Link to="/rewards" className={styles.levelStrip}>
            <span>
              <StarIcon width={16} height={16} /> Level {rewardState.level} - {levelInfo(rewardState.level).name}
            </span>
            <span>{rewardState.totalPoints} pts</span>
          </Link>
        </div>
      )}

      {topInsights.length > 0 && (
        <div className={styles.section}>
          <div className={styles.sectionTitle}>Insights</div>
          {topInsights.map((insight) => (
            <div
              key={insight.id}
              className={`${styles.insightCard} ${
                insight.severity === "warning"
                  ? styles.insightWarning
                  : insight.severity === "positive"
                    ? styles.insightPositive
                    : styles.insightInfo
              }`}
            >
              {insight.message}
            </div>
          ))}
        </div>
      )}
    </>
  );
}
