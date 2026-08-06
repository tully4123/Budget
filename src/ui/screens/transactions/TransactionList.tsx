import { useMemo, useState } from "react";
import { monthKey } from "../../../domain/dates";
import { cents, negate } from "../../../domain/money";
import type { Category, Transaction, TransactionType } from "../../../domain/types";
import { formatMonthLabel } from "../../../lib/format";
import { useAppStore } from "../../../store/appStore";
import { CategoryIcon } from "../../components/CategoryIcon";
import { Money } from "../../components/Money";
import { Select } from "../../components/Select";
import { PencilIcon, TrashIcon } from "../../components/icons";
import styles from "./Transactions.module.css";

function categoryColor(category: Category | undefined): string {
  return category ? `var(--color-${category.colorToken})` : "var(--color-text-faint)";
}

function rowLabel(
  tx: Transaction,
  category: Category | undefined,
  goalName: string | undefined,
): string {
  if (tx.type === "goalContribution") return `Goal: ${goalName ?? "Unknown goal"}`;
  if (tx.note?.trim()) return tx.note.trim();
  return category?.name ?? "Uncategorized";
}

interface TransactionListProps {
  onEdit: (tx: Transaction) => void;
}

const TYPE_FILTERS: { value: TransactionType | "all"; label: string }[] = [
  { value: "all", label: "All types" },
  { value: "expense", label: "Expense" },
  { value: "income", label: "Income" },
  { value: "goalContribution", label: "Goal" },
];

export function TransactionList({ onEdit }: TransactionListProps) {
  const transactions = useAppStore((s) => s.transactions);
  const categories = useAppStore((s) => s.categories);
  const goals = useAppStore((s) => s.goals);
  const profile = useAppStore((s) => s.profile);
  const deleteTransaction = useAppStore((s) => s.deleteTransaction);

  const [typeFilter, setTypeFilter] = useState<TransactionType | "all">("all");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");

  const categoryById = useMemo(() => new Map(categories.map((c) => [c.id, c])), [categories]);
  const goalById = useMemo(() => new Map(goals.map((g) => [g.id, g])), [goals]);
  const currency = profile?.currency ?? "USD";

  const filtered = transactions.filter((t) => {
    if (typeFilter !== "all" && t.type !== typeFilter) return false;
    if (categoryFilter !== "all" && t.categoryId !== categoryFilter) return false;
    return true;
  });

  const groups = useMemo(() => {
    const map = new Map<string, Transaction[]>();
    for (const t of filtered) {
      const key = monthKey(t.date);
      const list = map.get(key) ?? [];
      list.push(t);
      map.set(key, list);
    }
    for (const list of map.values()) {
      list.sort((a, b) => (a.date === b.date ? b.createdAt.localeCompare(a.createdAt) : b.date.localeCompare(a.date)));
    }
    return [...map.entries()].sort((a, b) => b[0].localeCompare(a[0]));
  }, [filtered]);

  function handleDelete(id: string) {
    if (window.confirm("Delete this transaction?")) {
      deleteTransaction(id);
    }
  }

  return (
    <div>
      <div className={styles.filters}>
        <Select
          label="Type"
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value as TransactionType | "all")}
        >
          {TYPE_FILTERS.map((f) => (
            <option key={f.value} value={f.value}>
              {f.label}
            </option>
          ))}
        </Select>
        <Select label="Category" value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)}>
          <option value="all">All categories</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </Select>
      </div>

      {groups.length === 0 && <p className={styles.empty}>No transactions match these filters yet.</p>}

      {groups.map(([key, txs]) => (
        <div key={key} className={styles.monthGroup}>
          <div className={styles.monthLabel}>{formatMonthLabel(key)}</div>
          {txs.map((tx) => {
            const category = categoryById.get(tx.categoryId);
            const goal = tx.goalId ? goalById.get(tx.goalId) : undefined;
            const signedAmount = tx.type === "income" ? tx.amountCents : negate(tx.amountCents);
            return (
              <div key={tx.id} className={styles.row}>
                <button type="button" className={styles.rowButton} onClick={() => onEdit(tx)}>
                  <span className={styles.iconDot} style={{ background: categoryColor(category) }}>
                    <CategoryIcon iconKey={category?.iconKey ?? "box"} width={18} height={18} />
                  </span>
                  <span className={styles.rowMain}>
                    <div className={styles.rowLabel}>{rowLabel(tx, category, goal?.name)}</div>
                    <div className={styles.rowMeta}>{tx.date}</div>
                  </span>
                </button>
                <Money
                  cents={cents(signedAmount)}
                  currency={currency}
                  tone={tx.type === "goalContribution" ? "accent" : "auto"}
                  showPlusSign
                />
                <span className={styles.rowActions}>
                  <button
                    type="button"
                    className={styles.iconButton}
                    onClick={() => onEdit(tx)}
                    aria-label="Edit"
                  >
                    <PencilIcon width={16} height={16} />
                  </button>
                  <button
                    type="button"
                    className={styles.iconButton}
                    onClick={() => handleDelete(tx.id)}
                    aria-label="Delete"
                  >
                    <TrashIcon width={16} height={16} />
                  </button>
                </span>
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}
