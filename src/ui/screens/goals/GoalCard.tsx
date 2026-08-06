import { useState } from "react";
import type { LocalDate } from "../../../domain/dates";
import {
  computeFundedCents,
  projectedCompletionDate,
  requiredMonthlyForTargetDate,
} from "../../../domain/goals/goals";
import { add, parseToCents, ZERO_CENTS, type Cents } from "../../../domain/money";
import type { GoalPlanItem, TradeOffSuggestion } from "../../../domain/planner/types";
import type { Goal, Transaction } from "../../../domain/types";
import { useAppStore } from "../../../store/appStore";
import { Button } from "../../components/Button";
import { Money } from "../../components/Money";
import { TextField } from "../../components/TextField";
import { FlagIcon } from "../../components/icons";
import styles from "./Goals.module.css";

const PRIORITY_LABEL: Record<Goal["priority"], string> = { high: "High", medium: "Medium", low: "Low" };

interface GoalCardProps {
  goal: Goal;
  transactions: readonly Transaction[];
  today: LocalDate;
  currency: string;
  savingsCategoryId: string;
  plannerItem: GoalPlanItem | undefined;
  tradeOff: TradeOffSuggestion | undefined;
  onContributed: (goal: Goal, beforeCents: Cents, afterCents: Cents) => void;
}

export function GoalCard({
  goal,
  transactions,
  today,
  currency,
  savingsCategoryId,
  plannerItem,
  tradeOff,
  onContributed,
}: GoalCardProps) {
  const addTransaction = useAppStore((s) => s.addTransaction);
  const updateGoal = useAppStore((s) => s.updateGoal);
  const deleteGoal = useAppStore((s) => s.deleteGoal);

  const [amount, setAmount] = useState("");

  const funded = computeFundedCents(goal.id, transactions);
  const percent = goal.targetCents > ZERO_CENTS ? Math.min((funded / goal.targetCents) * 100, 100) : 0;
  const projected = goal.status === "active" ? projectedCompletionDate(goal, transactions, today) : null;
  const requiredMonthly =
    goal.status === "active" ? requiredMonthlyForTargetDate(goal, transactions, today) : null;

  function handleContribute() {
    const parsed = parseToCents(amount);
    if (parsed === null || parsed <= ZERO_CENTS) return;
    addTransaction({
      type: "goalContribution",
      amountCents: parsed,
      categoryId: savingsCategoryId,
      goalId: goal.id,
      date: today,
    });
    const after = add(funded, parsed);
    onContributed(goal, funded, after);
    if (after >= goal.targetCents) {
      updateGoal(goal.id, { status: "completed" });
    }
    setAmount("");
  }

  function handleDelete() {
    if (window.confirm(`Delete "${goal.name}"? Its contribution history will stay in Activity.`)) {
      deleteGoal(goal.id);
    }
  }

  return (
    <div className={styles.card}>
      <div className={styles.cardHeader}>
        <div className={styles.cardTitleRow}>
          <span className={styles.iconDot}>
            <FlagIcon width={18} height={18} />
          </span>
          <span>
            <div className={styles.name}>{goal.name}</div>
            <span className={styles.priorityBadge}>{PRIORITY_LABEL[goal.priority]} priority</span>{" "}
            {goal.status === "completed" && <span className={styles.statusBadge}>Completed</span>}
            {goal.status === "paused" && <span className={styles.priorityBadge}>Paused</span>}
          </span>
        </div>
      </div>

      <div className={styles.progressRow}>
        <span>
          <Money cents={funded} currency={currency} tone="accent" /> of{" "}
          <Money cents={goal.targetCents} currency={currency} tone="muted" />
        </span>
        <span>{percent.toFixed(0)}%</span>
      </div>
      <div className={styles.barTrack}>
        <div className={styles.barFill} style={{ width: `${percent}%` }} />
      </div>

      <div className={styles.metaGrid}>
        <div>
          <div className={styles.metaLabel}>Projected completion</div>
          <div>{projected ?? "—"}</div>
        </div>
        <div>
          <div className={styles.metaLabel}>Needed per month for target date</div>
          <div>{requiredMonthly !== null ? <Money cents={requiredMonthly} currency={currency} /> : "—"}</div>
        </div>
      </div>

      {plannerItem && plannerItem.requiredMonthlyCents > ZERO_CENTS && (
        <div className={styles.metaGrid}>
          <div>
            <div className={styles.metaLabel}>Planner allocates</div>
            <div>
              <Money cents={plannerItem.allocatedMonthlyCents} currency={currency} tone={plannerItem.isFullyFunded ? "positive" : "negative"} />
              /mo
            </div>
          </div>
        </div>
      )}
      {tradeOff && <p className={styles.tradeOff}>{tradeOff.message}</p>}

      {goal.status === "active" && (
        <div className={styles.contributeRow}>
          <TextField
            label="Contribute"
            className={styles.contributeInput}
            inputMode="decimal"
            placeholder="0.00"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
          />
          <Button onClick={handleContribute}>Add</Button>
        </div>
      )}

      <div className={styles.cardActions}>
        {goal.status === "active" && (
          <Button variant="secondary" small onClick={() => updateGoal(goal.id, { status: "paused" })}>
            Pause
          </Button>
        )}
        {goal.status === "paused" && (
          <Button variant="secondary" small onClick={() => updateGoal(goal.id, { status: "active" })}>
            Resume
          </Button>
        )}
        <Button variant="danger" small onClick={handleDelete}>
          Delete
        </Button>
      </div>
    </div>
  );
}
