import { useMemo, useState } from "react";
import { computeDailyAllowance, copyBudgetsForward, findPriorBudgetMonth, needsRolloverDecision } from "../../domain/budgets/budgets";
import { addMonths, monthKey } from "../../domain/dates";
import { formatMonthLabel } from "../../lib/format";
import { today } from "../../lib/today";
import { useAppStore } from "../../store/appStore";
import { Button } from "../components/Button";
import { Money } from "../components/Money";
import { ChevronLeftIcon, ChevronRightIcon } from "../components/icons";
import { ScreenHeader } from "../components/ScreenHeader";
import styles from "./budgets/Budgets.module.css";
import { CategoryBudgetRow } from "./budgets/CategoryBudgetRow";

export function BudgetsScreen() {
  const categories = useAppStore((s) => s.categories);
  const budgets = useAppStore((s) => s.budgets);
  const transactions = useAppStore((s) => s.transactions);
  const profile = useAppStore((s) => s.profile);
  const setBudget = useAppStore((s) => s.setBudget);

  const [anchor, setAnchor] = useState(today());
  const month = monthKey(anchor);
  const isCurrentMonth = month === monthKey(today());
  const currency = profile?.currency ?? "USD";

  const spendCategories = useMemo(
    () => categories.filter((c) => !c.isSystem && !c.isArchived),
    [categories],
  );
  const monthBudgets = useMemo(() => budgets.filter((b) => b.month === month), [budgets, month]);
  const budgetByCategory = useMemo(
    () => new Map(monthBudgets.map((b) => [b.categoryId, b])),
    [monthBudgets],
  );

  const showRollover = needsRolloverDecision(month, budgets);
  const priorMonth = showRollover ? findPriorBudgetMonth(month, budgets) : null;

  const dailyAllowance = isCurrentMonth ? computeDailyAllowance(budgets, transactions, today()) : null;

  function handleCopyForward() {
    if (!priorMonth) return;
    for (const draft of copyBudgetsForward(priorMonth, month, budgets)) {
      setBudget(draft);
    }
  }

  return (
    <>
      <ScreenHeader title="Budgets" subtitle="Set a monthly limit per category and track your pace." />

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

      {showRollover && (
        <div className={styles.rolloverCard}>
          <strong>Start {formatMonthLabel(month)} fresh?</strong>
          <p>Copy last month's budget limits forward, or set new ones below.</p>
          <Button onClick={handleCopyForward}>Copy last month's budgets</Button>
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
            month={month}
            transactions={transactions}
            today={today()}
            currency={currency}
          />
        ))
      )}
    </>
  );
}
