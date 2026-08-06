import { useState } from "react";
import { findSystemCategory } from "../../../domain/defaultCategories";
import { localDate } from "../../../domain/dates";
import { parseToCents, ZERO_CENTS } from "../../../domain/money";
import type { Transaction, TransactionType } from "../../../domain/types";
import { today } from "../../../lib/today";
import { useAppStore } from "../../../store/appStore";
import { Button } from "../../components/Button";
import { CategoryChips } from "../../components/CategoryChips";
import { Select } from "../../components/Select";
import { TextField } from "../../components/TextField";
import styles from "./Transactions.module.css";

const TYPE_OPTIONS: { value: TransactionType; label: string }[] = [
  { value: "expense", label: "Expense" },
  { value: "income", label: "Income" },
  { value: "goalContribution", label: "Goal" },
];

interface TransactionFormProps {
  editing?: Transaction;
  onDone: () => void;
}

export function TransactionForm({ editing, onDone }: TransactionFormProps) {
  const categories = useAppStore((s) => s.categories);
  const goals = useAppStore((s) => s.goals);
  const addTransaction = useAppStore((s) => s.addTransaction);
  const updateTransaction = useAppStore((s) => s.updateTransaction);

  const spendCategories = categories.filter((c) => !c.isSystem && !c.isArchived);
  const activeGoals = goals.filter((g) => g.status === "active");

  const [type, setType] = useState<TransactionType>(editing?.type ?? "expense");
  const [amount, setAmount] = useState(editing ? (editing.amountCents / 100).toFixed(2) : "");
  const [categoryId, setCategoryId] = useState<string | null>(
    editing?.type === "expense" ? editing.categoryId : null,
  );
  const [goalId, setGoalId] = useState<string | null>(editing?.goalId ?? activeGoals[0]?.id ?? null);
  const [date, setDate] = useState<string>(editing?.date ?? today());
  const [note, setNote] = useState(editing?.note ?? "");
  const [error, setError] = useState<string | null>(null);

  function reset() {
    setAmount("");
    setNote("");
    setError(null);
    // type, categoryId, and date stay as-is - sticky fields speed up
    // logging several similar expenses in a row.
  }

  function handleSubmit() {
    setError(null);
    const amountCents = parseToCents(amount);
    if (amountCents === null || amountCents <= ZERO_CENTS) {
      setError("Enter an amount greater than zero.");
      return;
    }
    if (!date) {
      setError("Pick a date.");
      return;
    }
    if (type === "expense" && !categoryId) {
      setError("Pick a category.");
      return;
    }
    if (type === "goalContribution" && !goalId) {
      setError("Pick a goal - add one on the Goals page first.");
      return;
    }

    const resolvedCategoryId =
      type === "expense"
        ? (categoryId as string)
        : type === "income"
          ? findSystemCategory(categories, "income").id
          : findSystemCategory(categories, "savings").id;

    const base = {
      type,
      amountCents,
      categoryId: resolvedCategoryId,
      goalId: type === "goalContribution" ? (goalId as string) : undefined,
      date: localDate(date),
      note: note.trim() || undefined,
    };

    if (editing) {
      updateTransaction(editing.id, base);
    } else {
      addTransaction(base);
    }

    if (editing) {
      onDone();
    } else {
      reset();
    }
  }

  return (
    <div className={styles.form}>
      <div className={styles.formHeader}>
        <span className={styles.formTitle}>{editing ? "Edit transaction" : "Add a transaction"}</span>
        {editing && (
          <Button variant="ghost" small onClick={onDone}>
            Cancel
          </Button>
        )}
      </div>

      <Select label="Type" value={type} onChange={(e) => setType(e.target.value as TransactionType)}>
        {TYPE_OPTIONS.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </Select>

      <TextField
        label="Amount"
        inputMode="decimal"
        value={amount}
        onChange={(e) => setAmount(e.target.value)}
        placeholder="0.00"
        autoFocus
      />

      {type === "expense" &&
        (spendCategories.length > 0 ? (
          <CategoryChips
            mode="single"
            categories={spendCategories}
            value={categoryId}
            onChange={setCategoryId}
          />
        ) : (
          <p className={styles.hintRow}>No categories yet - add some in Settings.</p>
        ))}

      {type === "goalContribution" &&
        (activeGoals.length > 0 ? (
          <Select label="Goal" value={goalId ?? ""} onChange={(e) => setGoalId(e.target.value)}>
            {activeGoals.map((g) => (
              <option key={g.id} value={g.id}>
                {g.name}
              </option>
            ))}
          </Select>
        ) : (
          <p className={styles.hintRow}>No active goals - create one on the Goals page first.</p>
        ))}

      {type === "income" && <p className={styles.hintRow}>Filed under Income.</p>}

      <TextField label="Date" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
      <TextField
        label="Note (optional)"
        value={note}
        onChange={(e) => setNote(e.target.value)}
        placeholder="e.g. Coles"
      />

      {error ? <p className={styles.error}>{error}</p> : null}

      <Button fullWidth onClick={handleSubmit}>
        {editing ? "Save changes" : "Add"}
      </Button>
    </div>
  );
}
