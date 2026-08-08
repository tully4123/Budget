import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { computeDailyAllowance, copyBudgetsForward, findPriorBudgetMonth, needsRolloverDecision } from "../../domain/budgets/budgets";
import { addMonths, daysInMonth, monthKey } from "../../domain/dates";
import { detectNewlyCrossedMilestones } from "../../domain/goals/goals";
import { multiply, sum, type Cents } from "../../domain/money";
import type { Goal } from "../../domain/types";
import { formatMonthLabel } from "../../lib/format";
import { today } from "../../lib/today";
import { useAppStore } from "../../store/appStore";
import { usePlannerResult } from "../../store/usePlannerResult";
import { Button } from "../components/Button";
import { Money } from "../components/Money";
import { ChevronLeftIcon, ChevronRightIcon } from "../components/icons";
import { ScreenHeader } from "../components/ScreenHeader";
import { GoalCard } from "./goals/GoalCard";
import styles from "./budgets/Budgets.module.css";
import { CategoryBudgetRow } from "./budgets/CategoryBudgetRow";
import { findSystemCategory } from "../../domain/defaultCategories";

interface Celebration {
  goalName: string;
  percent: number;
}

type Tab = "budgets" | "goals";

/** Rough monthly-to-weekly conversion, consistent with how safeToSpend.ts
 * carries a daily rate across the week - not a flat /4.33, so it lines up
 * with the same maths the rest of the planner uses. */
function weeklyShare(monthlyCents: Cents, date: ReturnType<typeof today>): Cents {
  return multiply(monthlyCents, 7 / daysInMonth(date));
}

export function BudgetsScreen() {
  const categories = useAppStore((s) => s.categories);
  const budgets = useAppStore((s) => s.budgets);
  const goals = useAppStore((s) => s.goals);
  const transactions = useAppStore((s) => s.transactions);
  const profile = useAppStore((s) => s.profile);
  const setBudget = useAppStore((s) => s.setBudget);

  const navigate = useNavigate();
  const [tab, setTab] = useState<Tab>("budgets");
  const [anchor, setAnchor] = useState(today());
  const [celebration, setCelebration] = useState<Celebration | null>(null);
  const month = monthKey(anchor);
  const isCurrentMonth = month === monthKey(today());
  const currency = profile?.currency ?? "USD";

  useEffect(() => {
    if (!celebration) return;
    const timer = setTimeout(() => setCelebration(null), 3500);
    return () => clearTimeout(timer);
  }, [celebration]);

  const spendCategories = useMemo(
    () => categories.filter((c) => !c.isSystem && !c.isArchived),
    [categories],
  );
  const monthBudgets = useMemo(() => budgets.filter((b) => b.month === month), [budgets, month]);
  const budgetByCategory = useMemo(
    () => new Map(monthBudgets.map((b) => [b.categoryId, b])),
    [monthBudgets],
  );
  const categoryById = useMemo(() => new Map(categories.map((c) => [c.id, c])), [categories]);

  const showRollover = needsRolloverDecision(month, budgets);
  const priorMonth = showRollover ? findPriorBudgetMonth(month, budgets) : null;

  const dailyAllowance = isCurrentMonth ? computeDailyAllowance(budgets, transactions, today()) : null;

  const plan = usePlannerResult();
  const suggestionByCategory = useMemo(
    () => new Map((plan?.suggestedBudgets ?? []).map((s) => [s.categoryId, s])),
    [plan],
  );

  const weeklyBreakdown = useMemo(() => {
    if (!isCurrentMonth) return null;
    const t = today();
    const byKind = (kind: "need" | "want" | "savings") =>
      sum(
        monthBudgets
          .filter((b) => categoryById.get(b.categoryId)?.kind === kind)
          .map((b) => b.limitCents),
      );
    const needs = weeklyShare(byKind("need"), t);
    const wants = weeklyShare(byKind("want"), t);
    const otherSavings = weeklyShare(byKind("savings"), t);
    const goalsWeekly = weeklyShare(
      sum((plan?.goalsPlan.items ?? []).map((i) => i.allocatedMonthlyCents)),
      t,
    );
    const total = sum([needs, wants, otherSavings, goalsWeekly]);
    return { needs, wants, otherSavings, goalsWeekly, total };
  }, [isCurrentMonth, monthBudgets, categoryById, plan]);

  function handleCopyForward() {
    if (!priorMonth) return;
    for (const draft of copyBudgetsForward(priorMonth, month, budgets)) {
      setBudget(draft);
    }
  }

  function handleUseSuggestions() {
    if (!plan) return;
    for (const s of plan.suggestedBudgets) {
      setBudget({ categoryId: s.categoryId, month, limitCents: s.suggestedLimitCents });
    }
  }

  function handleContributed(goal: Goal, before: Cents, after: Cents) {
    const crossed = detectNewlyCrossedMilestones(before, after, goal.targetCents);
    if (crossed.length > 0) {
      setCelebration({ goalName: goal.name, percent: Math.max(...crossed) });
    }
  }

  const savingsCategoryId = findSystemCategory(categories, "savings").id;
  const plannerItemByGoal = useMemo(
    () => new Map((plan?.goalsPlan.items ?? []).map((i) => [i.goalId, i])),
    [plan],
  );
  const tradeOffByGoal = useMemo(
    () => new Map((plan?.goalsPlan.tradeOffs ?? []).filter((t) => t.goalId).map((t) => [t.goalId as string, t])),
    [plan],
  );
  const activeGoals = goals.filter((g) => g.status === "active");
  const otherGoals = goals.filter((g) => g.status !== "active");

  return (
    <>
      <ScreenHeader title="Budgets" subtitle="Set a monthly limit per category and track your pace." />

      <div className={styles.tabBar}>
        <button
          type="button"
          className={`${styles.tabButton} ${tab === "budgets" ? styles.tabButtonActive : ""}`}
          onClick={() => setTab("budgets")}
        >
          Budgets
        </button>
        <button
          type="button"
          className={`${styles.tabButton} ${tab === "goals" ? styles.tabButtonActive : ""}`}
          onClick={() => setTab("goals")}
        >
          Savings goals
        </button>
      </div>

      {tab === "budgets" && (
        <>
          <div className={styles.monthNav}>
            <button
              type="button"
              className={styles.navButton}
              aria-label="Previous month"
              onClick={() => setAnchor(addMonths(anchor, -1))}
            >
              <ChevronLeftIcon width={18} height={18} />
            </button>
            <span className={styles.monthLabel}>{formatMonthLabel(month)}</span>
            <button
              type="button"
              className={styles.navButton}
              aria-label="Next month"
              onClick={() => setAnchor(addMonths(anchor, 1))}
            >
              <ChevronRightIcon width={18} height={18} />
            </button>
          </div>

          {dailyAllowance !== null && (
            <div className={styles.allowanceCard}>
              <div className={styles.allowanceLabel}>Daily allowance</div>
              <div className={styles.allowanceValue}>
                <Money cents={dailyAllowance} currency={currency} tone="accent" />
              </div>
            </div>
          )}

          {weeklyBreakdown && weeklyBreakdown.total > 0 && (
            <div className={styles.weeklyCard}>
              <div className={styles.weeklyTitle}>Where this week's money is going</div>
              <div className={styles.weeklyBarTrack}>
                {(
                  [
                    ["needs", weeklyBreakdown.needs, "var(--color-accent)"],
                    ["wants", weeklyBreakdown.wants, "var(--color-cat-5)"],
                    ["savings", weeklyBreakdown.otherSavings, "var(--color-cat-6)"],
                    ["goals", weeklyBreakdown.goalsWeekly, "var(--color-positive)"],
                  ] as const
                ).map(([key, value, color]) =>
                  value > 0 ? (
                    <div
                      key={key}
                      style={{ width: `${(value / weeklyBreakdown.total) * 100}%`, background: color }}
                    />
                  ) : null,
                )}
              </div>
              {weeklyBreakdown.needs > 0 && (
                <div className={styles.weeklyRow}>
                  <span className={styles.weeklyLabel}>
                    <span className={styles.weeklyDot} style={{ background: "var(--color-accent)" }} />
                    Needs
                  </span>
                  <Money cents={weeklyBreakdown.needs} currency={currency} />
                </div>
              )}
              {weeklyBreakdown.wants > 0 && (
                <div className={styles.weeklyRow}>
                  <span className={styles.weeklyLabel}>
                    <span className={styles.weeklyDot} style={{ background: "var(--color-cat-5)" }} />
                    Wants
                  </span>
                  <Money cents={weeklyBreakdown.wants} currency={currency} />
                </div>
              )}
              {weeklyBreakdown.otherSavings > 0 && (
                <div className={styles.weeklyRow}>
                  <span className={styles.weeklyLabel}>
                    <span className={styles.weeklyDot} style={{ background: "var(--color-cat-6)" }} />
                    Other savings categories
                  </span>
                  <Money cents={weeklyBreakdown.otherSavings} currency={currency} />
                </div>
              )}
              {weeklyBreakdown.goalsWeekly > 0 && (
                <div className={styles.weeklyRow}>
                  <span className={styles.weeklyLabel}>
                    <span className={styles.weeklyDot} style={{ background: "var(--color-positive)" }} />
                    Savings goals
                  </span>
                  <Money cents={weeklyBreakdown.goalsWeekly} currency={currency} />
                </div>
              )}
            </div>
          )}

          {showRollover && (
            <div className={styles.rolloverCard}>
              <strong>Start {formatMonthLabel(month)} fresh?</strong>
              <p>Copy last month's budget limits forward, or apply the planner's suggestions below.</p>
              <div className={styles.rolloverActions}>
                <Button variant="secondary" onClick={handleCopyForward}>
                  Copy last month's budgets
                </Button>
                {plan && <Button onClick={handleUseSuggestions}>Use planner suggestions</Button>}
              </div>
            </div>
          )}

          {spendCategories.length === 0 ? (
            <p className={styles.noLimit}>No categories yet - add some in Settings.</p>
          ) : (
            spendCategories.map((cat) => (
              <CategoryBudgetRow
                key={cat.id}
                category={cat}
                budget={budgetByCategory.get(cat.id)}
                suggestion={suggestionByCategory.get(cat.id)}
                month={month}
                transactions={transactions}
                today={today()}
                currency={currency}
              />
            ))
          )}

          {plan && plan.insights.length > 0 && (
            <>
              <div className={styles.tipsTitle}>Budgeting tips</div>
              {plan.insights.map((insight) => (
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
            </>
          )}
        </>
      )}

      {tab === "goals" && (
        <>
          {celebration && (
            <div className={styles.rolloverCard} role="status">
              {celebration.percent >= 100
                ? `🎉 ${celebration.goalName} is fully funded!`
                : `🎉 ${celebration.percent}% of the way to ${celebration.goalName}!`}
            </div>
          )}

          {goals.length === 0 ? (
            <p className={styles.noLimit}>No goals yet.</p>
          ) : (
            <>
              {activeGoals.map((g) => (
                <GoalCard
                  key={g.id}
                  goal={g}
                  transactions={transactions}
                  today={today()}
                  currency={currency}
                  savingsCategoryId={savingsCategoryId}
                  plannerItem={plannerItemByGoal.get(g.id)}
                  tradeOff={tradeOffByGoal.get(g.id)}
                  onContributed={handleContributed}
                />
              ))}
              {otherGoals.map((g) => (
                <GoalCard
                  key={g.id}
                  goal={g}
                  transactions={transactions}
                  today={today()}
                  currency={currency}
                  savingsCategoryId={savingsCategoryId}
                  plannerItem={plannerItemByGoal.get(g.id)}
                  tradeOff={tradeOffByGoal.get(g.id)}
                  onContributed={handleContributed}
                />
              ))}
            </>
          )}

          <Button variant="secondary" fullWidth onClick={() => navigate("/goals")}>
            Add or manage goals
          </Button>
        </>
      )}
    </>
  );
}
