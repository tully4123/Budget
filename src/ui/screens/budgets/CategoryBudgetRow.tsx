import { useState } from "react";
import { computeBudgetStatus } from "../../../domain/budgets/budgets";
import type { LocalDate, MonthKey } from "../../../domain/dates";
import { clampToZero, parseToCents, ZERO_CENTS } from "../../../domain/money";
import type { SuggestedBudget } from "../../../domain/planner/types";
import type { Budget, Category, Transaction } from "../../../domain/types";
import { useAppStore } from "../../../store/appStore";
import { Button } from "../../components/Button";
import { CategoryIcon } from "../../components/CategoryIcon";
import { Money } from "../../components/Money";
import { TextField } from "../../components/TextField";
import styles from "./Budgets.module.css";

interface CategoryBudgetRowProps {
  category: Category;
  budget: Budget | undefined;
  suggestion: SuggestedBudget | undefined;
  month: MonthKey;
  transactions: readonly Transaction[];
  today: LocalDate;
  currency: string;
}

export function CategoryBudgetRow({
  category,
  budget,
  suggestion,
  month,
  transactions,
  today,
  currency,
}: CategoryBudgetRowProps) {
  const setBudget = useAppStore((s) => s.setBudget);
  const [draft, setDraft] = useState(budget ? (budget.limitCents / 100).toFixed(2) : "");

  function commit() {
    const parsed = parseToCents(draft);
    if (parsed === null) return;
    setBudget({ categoryId: category.id, month, limitCents: clampToZero(parsed) });
  }

  function applySuggestion() {
    if (!suggestion) return;
    setBudget({ categoryId: category.id, month, limitCents: suggestion.suggestedLimitCents });
    setDraft((suggestion.suggestedLimitCents / 100).toFixed(2));
  }

  const status = budget ? computeBudgetStatus(budget, transactions, today) : null;
  const isOver = status ? status.remainingCents < ZERO_CENTS : false;
  const percent = status ? Math.min(status.percentUsed, 100) : 0;
  const fillClass =
    status && status.percentUsed >= 100
      ? styles.fillNegative
      : status?.pace === "over-pace"
        ? styles.fillWarning
        : styles.fillPositive;

  return (
    <div className={styles.categoryCard}>
      <div className={styles.categoryHeader}>
        <span className={styles.categoryDot} style={{ background: `var(--color-${category.colorToken})` }}>
          <CategoryIcon iconKey={category.iconKey} width={16} height={16} />
        </span>
        <span className={styles.categoryName}>{category.name}</span>
      </div>

      <TextField
        label={`${category.name} monthly limit`}
        className={styles.limitInput}
        inputMode="decimal"
        placeholder="No limit"
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
      />

      {!budget && suggestion && (
        <div className={styles.suggestionHint}>
          <span>
            Planner suggests <Money cents={suggestion.suggestedLimitCents} currency={currency} tone="muted" />
            {" - "}
            {suggestion.reason}
          </span>
          <Button variant="ghost" small onClick={applySuggestion}>
            Apply
          </Button>
        </div>
      )}

      {status ? (
        <>
          <div className={styles.statsRow}>
            <span>
              <Money cents={status.spentCents} currency={currency} tone="muted" /> spent
            </span>
            <span>
              <Money cents={status.remainingCents} currency={currency} tone={isOver ? "negative" : "positive"} />{" "}
              {isOver ? "over" : "left"}
            </span>
          </div>
          <div className={styles.barTrack}>
            <div className={`${styles.barFill} ${fillClass}`} style={{ width: `${percent}%` }} />
          </div>
          {status.pace && (
            <span
              className={
                status.pace === "on-pace" ? `${styles.paceBadge} ${styles.paceOn}` : `${styles.paceBadge} ${styles.paceOver}`
              }
            >
              {status.pace === "on-pace" ? "On pace" : "Over pace"}
            </span>
          )}
        </>
      ) : (
        <p className={styles.noLimit}>No limit set for this month.</p>
      )}
    </div>
  );
}
