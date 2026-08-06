import { useState } from "react";
import { localDate } from "../../../domain/dates";
import { parseToCents, ZERO_CENTS } from "../../../domain/money";
import type { GoalPriority } from "../../../domain/types";
import { useAppStore } from "../../../store/appStore";
import { Button } from "../../components/Button";
import { Select } from "../../components/Select";
import { TextField } from "../../components/TextField";
import styles from "./Goals.module.css";

const PRIORITIES: { value: GoalPriority; label: string }[] = [
  { value: "high", label: "High" },
  { value: "medium", label: "Medium" },
  { value: "low", label: "Low" },
];

interface GoalFormProps {
  onDone: () => void;
}

export function GoalForm({ onDone }: GoalFormProps) {
  const addGoal = useAppStore((s) => s.addGoal);

  const [name, setName] = useState("");
  const [amount, setAmount] = useState("");
  const [targetDate, setTargetDate] = useState("");
  const [priority, setPriority] = useState<GoalPriority>("medium");
  const [error, setError] = useState<string | null>(null);

  function handleSubmit() {
    setError(null);
    const targetCents = parseToCents(amount);
    if (!name.trim() || targetCents === null || targetCents <= ZERO_CENTS) {
      setError("Give the goal a name and a target amount above zero.");
      return;
    }
    addGoal({
      name: name.trim(),
      iconKey: "flag",
      targetCents,
      targetDate: targetDate ? localDate(targetDate) : undefined,
      priority,
      status: "active",
    });
    onDone();
  }

  return (
    <div className={styles.form}>
      <div className={styles.formHeader}>
        <span className={styles.formTitle}>New goal</span>
        <Button variant="ghost" small onClick={onDone}>
          Cancel
        </Button>
      </div>
      <TextField label="Goal name" value={name} onChange={(e) => setName(e.target.value)} autoFocus placeholder="e.g. Emergency fund" />
      <TextField label="Target amount" inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0.00" />
      <div className={styles.row2}>
        <TextField label="Target date (optional)" type="date" value={targetDate} onChange={(e) => setTargetDate(e.target.value)} />
        <Select label="Priority" value={priority} onChange={(e) => setPriority(e.target.value as GoalPriority)}>
          {PRIORITIES.map((p) => (
            <option key={p.value} value={p.value}>
              {p.label}
            </option>
          ))}
        </Select>
      </div>
      {error ? <p className={styles.error}>{error}</p> : null}
      <Button fullWidth onClick={handleSubmit}>
        Create goal
      </Button>
    </div>
  );
}
