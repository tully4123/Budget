import { useEffect, useMemo, useState } from "react";
import { findSystemCategory } from "../../domain/defaultCategories";
import { detectNewlyCrossedMilestones } from "../../domain/goals/goals";
import type { Cents } from "../../domain/money";
import type { Goal } from "../../domain/types";
import { today } from "../../lib/today";
import { useAppStore } from "../../store/appStore";
import { usePlannerResult } from "../../store/usePlannerResult";
import { Button } from "../components/Button";
import { ScreenHeader } from "../components/ScreenHeader";
import { GoalCard } from "./goals/GoalCard";
import { GoalForm } from "./goals/GoalForm";
import styles from "./goals/Goals.module.css";

interface Celebration {
  goalName: string;
  percent: number;
}

export function GoalsScreen() {
  const goals = useAppStore((s) => s.goals);
  const transactions = useAppStore((s) => s.transactions);
  const categories = useAppStore((s) => s.categories);
  const profile = useAppStore((s) => s.profile);

  const [showForm, setShowForm] = useState(false);
  const [celebration, setCelebration] = useState<Celebration | null>(null);

  useEffect(() => {
    if (!celebration) return;
    const timer = setTimeout(() => setCelebration(null), 3500);
    return () => clearTimeout(timer);
  }, [celebration]);

  const currency = profile?.currency ?? "USD";
  const savingsCategoryId = findSystemCategory(categories, "savings").id;

  const plan = usePlannerResult();
  const plannerItemByGoal = useMemo(
    () => new Map((plan?.goalsPlan.items ?? []).map((i) => [i.goalId, i])),
    [plan],
  );
  const tradeOffByGoal = useMemo(
    () => new Map((plan?.goalsPlan.tradeOffs ?? []).filter((t) => t.goalId).map((t) => [t.goalId as string, t])),
    [plan],
  );

  function handleContributed(goal: Goal, before: Cents, after: Cents) {
    const crossed = detectNewlyCrossedMilestones(before, after, goal.targetCents);
    if (crossed.length > 0) {
      setCelebration({ goalName: goal.name, percent: Math.max(...crossed) });
    }
  }

  const active = goals.filter((g) => g.status === "active");
  const other = goals.filter((g) => g.status !== "active");

  return (
    <>
      <ScreenHeader title="Goals" subtitle="What you're saving toward, and how close you are." />

      {celebration && (
        <div className={styles.celebration} role="status">
          {celebration.percent >= 100
            ? `🎉 ${celebration.goalName} is fully funded!`
            : `🎉 ${celebration.percent}% of the way to ${celebration.goalName}!`}
        </div>
      )}

      {!showForm && (
        <Button fullWidth onClick={() => setShowForm(true)} className={styles.newGoalButton}>
          New goal
        </Button>
      )}
      {showForm && <GoalForm onDone={() => setShowForm(false)} />}

      {goals.length === 0 && !showForm && <p className={styles.empty}>No goals yet - create your first one above.</p>}

      {active.map((g) => (
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
      {other.map((g) => (
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
  );
}
