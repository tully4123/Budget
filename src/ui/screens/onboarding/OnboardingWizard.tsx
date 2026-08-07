import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { createDefaultCategories } from "../../../domain/defaultCategories";
import { localDate } from "../../../domain/dates";
import { parseToCents, ZERO_CENTS } from "../../../domain/money";
import type { Category, GoalPriority, PayFrequency } from "../../../domain/types";
import { createId } from "../../../lib/id";
import { today } from "../../../lib/today";
import { useAppStore } from "../../../store/appStore";
import { Button } from "../../components/Button";
import { CategoryChips } from "../../components/CategoryChips";
import { Select } from "../../components/Select";
import { TextField } from "../../components/TextField";
import { TrashIcon } from "../../components/icons";
import styles from "./Wizard.module.css";

const CURRENCIES = ["USD", "AUD", "GBP", "EUR", "CAD", "NZD"];
const PAY_FREQUENCIES: { value: PayFrequency; label: string }[] = [
  { value: "weekly", label: "Weekly" },
  { value: "biweekly", label: "Every 2 weeks" },
  { value: "semimonthly", label: "Twice a month" },
  { value: "monthly", label: "Monthly" },
];
const PRIORITIES: { value: GoalPriority; label: string }[] = [
  { value: "high", label: "High" },
  { value: "medium", label: "Medium" },
  { value: "low", label: "Low" },
];

interface IncomeDraft {
  key: string;
  name: string;
  amount: string;
  frequency: PayFrequency;
  nextDate: string;
}

const STEP_COUNT = 4;
const STEP_LABELS = ["Profile", "Income", "Categories", "Goal"];

export function OnboardingWizard() {
  const navigate = useNavigate();
  const setProfile = useAppStore((s) => s.setProfile);
  const setCategories = useAppStore((s) => s.setCategories);
  const addIncomeSource = useAppStore((s) => s.addIncomeSource);
  const addGoal = useAppStore((s) => s.addGoal);

  const [step, setStep] = useState(0);
  const [maxStepReached, setMaxStepReached] = useState(0);

  // Step 1: profile
  const [displayName, setDisplayName] = useState("");
  const [currency, setCurrency] = useState("USD");
  const [payFrequency, setPayFrequency] = useState<PayFrequency>("monthly");

  // Step 2: income
  const [incomeDrafts, setIncomeDrafts] = useState<IncomeDraft[]>([
    { key: createId(), name: "", amount: "", frequency: "monthly", nextDate: today() },
  ]);

  // Step 3: categories - full default set generated once, minus the two
  // system categories which aren't user-toggleable.
  const [allCategories] = useState<Category[]>(() => createDefaultCategories(createId));
  const pickable = allCategories.filter((c) => !c.isSystem);
  const [selectedIds, setSelectedIds] = useState<string[]>(() => pickable.map((c) => c.id));

  // Step 4: goal
  const [goalName, setGoalName] = useState("");
  const [goalAmount, setGoalAmount] = useState("");
  const [goalTargetDate, setGoalTargetDate] = useState("");
  const [goalPriority, setGoalPriority] = useState<GoalPriority>("medium");

  const [error, setError] = useState<string | null>(null);

  function goNext() {
    setError(null);
    if (step === 0) {
      if (!displayName.trim()) {
        setError("Enter your name to continue.");
        return;
      }
    }
    if (step === 1) {
      const valid = incomeDrafts.filter((d) => d.name.trim() && parseToCents(d.amount) !== null);
      if (valid.length === 0) {
        setError("Add at least one income source with a name and amount.");
        return;
      }
    }
    if (step === STEP_COUNT - 1) {
      finish();
      return;
    }
    const nextStep = step + 1;
    setStep(nextStep);
    setMaxStepReached((m) => Math.max(m, nextStep));
  }

  function goBack() {
    setError(null);
    setStep((s) => Math.max(0, s - 1));
  }

  /** Jumps directly to any step already reached - lets you fix an earlier
   * answer without clicking Back repeatedly. Can't skip ahead to a step
   * you haven't validated your way into yet. */
  function goToStep(target: number) {
    if (target > maxStepReached) return;
    setError(null);
    setStep(target);
  }

  function finish() {
    const parsedGoalAmount = parseToCents(goalAmount);
    if (!goalName.trim() || parsedGoalAmount === null || parsedGoalAmount <= ZERO_CENTS) {
      setError("Give your goal a name and a target amount above zero.");
      return;
    }

    const keptCategories = allCategories.filter((c) => c.isSystem || selectedIds.includes(c.id));
    setCategories(keptCategories);

    for (const draft of incomeDrafts) {
      const amount = parseToCents(draft.amount);
      if (!draft.name.trim() || amount === null || !draft.nextDate) continue;
      addIncomeSource({
        name: draft.name.trim(),
        amountCents: amount,
        frequency: draft.frequency,
        nextDate: localDate(draft.nextDate),
      });
    }

    addGoal({
      name: goalName.trim(),
      iconKey: "flag",
      targetCents: parsedGoalAmount,
      targetDate: goalTargetDate ? localDate(goalTargetDate) : undefined,
      priority: goalPriority,
      status: "active",
    });

    // Written last - this is what the router uses to decide onboarding is
    // complete, so it should only flip once everything else has landed.
    setProfile({
      id: createId(),
      displayName: displayName.trim(),
      currency,
      payFrequency,
      createdAt: today(),
    });

    navigate("/dashboard", { replace: true });
  }

  function updateIncomeDraft(key: string, patch: Partial<IncomeDraft>) {
    setIncomeDrafts((drafts) => drafts.map((d) => (d.key === key ? { ...d, ...patch } : d)));
  }

  function addIncomeDraft() {
    setIncomeDrafts((drafts) => [
      ...drafts,
      { key: createId(), name: "", amount: "", frequency: payFrequency, nextDate: today() },
    ]);
  }

  function removeIncomeDraft(key: string) {
    setIncomeDrafts((drafts) => (drafts.length > 1 ? drafts.filter((d) => d.key !== key) : drafts));
  }

  function toggleCategory(id: string) {
    setSelectedIds((ids) => (ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id]));
  }

  return (
    <div className={styles.wrap}>
      <div className={styles.progress}>
        {Array.from({ length: STEP_COUNT }, (_, i) => (
          <button
            key={i}
            type="button"
            aria-label={`Go to step ${i + 1}: ${STEP_LABELS[i]}`}
            aria-current={i === step ? "step" : undefined}
            className={i <= step ? `${styles.dot} ${styles.dotDone}` : styles.dot}
            onClick={() => goToStep(i)}
            disabled={i > maxStepReached}
          />
        ))}
      </div>
      <p className={styles.stepLabel}>
        Step {step + 1} of {STEP_COUNT} · {STEP_LABELS[step]}
      </p>

      {step === 0 && (
        <div className={styles.step}>
          <div>
            <h1 className={styles.title}>Welcome to Budget</h1>
            <p className={styles.subtitle}>First, the basics - takes about 30 seconds.</p>
          </div>
          <TextField
            label="Your name"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            placeholder="e.g. Alex"
            autoFocus
          />
          <Select label="Currency" value={currency} onChange={(e) => setCurrency(e.target.value)}>
            {CURRENCIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </Select>
          <Select
            label="How often do you get paid?"
            value={payFrequency}
            onChange={(e) => setPayFrequency(e.target.value as PayFrequency)}
          >
            {PAY_FREQUENCIES.map((f) => (
              <option key={f.value} value={f.value}>
                {f.label}
              </option>
            ))}
          </Select>
        </div>
      )}

      {step === 1 && (
        <div className={styles.step}>
          <div>
            <h1 className={styles.title}>Where's your money coming from?</h1>
            <p className={styles.subtitle}>Add at least one income source. You can add more later.</p>
          </div>
          {incomeDrafts.map((draft, i) => (
            <div key={draft.key} className={styles.incomeRow}>
              <div className={styles.row2}>
                <TextField
                  label={`Income source ${i + 1}`}
                  value={draft.name}
                  onChange={(e) => updateIncomeDraft(draft.key, { name: e.target.value })}
                  placeholder="e.g. Paycheck"
                />
                <TextField
                  label="Amount"
                  inputMode="decimal"
                  value={draft.amount}
                  onChange={(e) => updateIncomeDraft(draft.key, { amount: e.target.value })}
                  placeholder="0.00"
                />
              </div>
              <div className={styles.row2}>
                <Select
                  label="Frequency"
                  value={draft.frequency}
                  onChange={(e) => updateIncomeDraft(draft.key, { frequency: e.target.value as PayFrequency })}
                >
                  {PAY_FREQUENCIES.map((f) => (
                    <option key={f.value} value={f.value}>
                      {f.label}
                    </option>
                  ))}
                </Select>
                <TextField
                  label="Next pay date"
                  type="date"
                  value={draft.nextDate}
                  onChange={(e) => updateIncomeDraft(draft.key, { nextDate: e.target.value })}
                />
              </div>
              {incomeDrafts.length > 1 && (
                <Button variant="ghost" small onClick={() => removeIncomeDraft(draft.key)}>
                  <TrashIcon width={16} height={16} /> Remove
                </Button>
              )}
            </div>
          ))}
          <Button variant="secondary" onClick={addIncomeDraft}>
            Add another income source
          </Button>
        </div>
      )}

      {step === 2 && (
        <div className={styles.step}>
          <div>
            <h1 className={styles.title}>Confirm your categories</h1>
            <p className={styles.subtitle}>
              These are where your spending will be tracked. Tap to remove any you don't need - you
              can always add more later.
            </p>
          </div>
          <CategoryChips mode="multi" categories={pickable} value={selectedIds} onChange={toggleCategory} />
        </div>
      )}

      {step === 3 && (
        <div className={styles.step}>
          <div>
            <h1 className={styles.title}>Set your first goal</h1>
            <p className={styles.subtitle}>What are you saving toward?</p>
          </div>
          <TextField
            label="Goal name"
            value={goalName}
            onChange={(e) => setGoalName(e.target.value)}
            placeholder="e.g. Emergency fund"
            autoFocus
          />
          <TextField
            label="Target amount"
            inputMode="decimal"
            value={goalAmount}
            onChange={(e) => setGoalAmount(e.target.value)}
            placeholder="0.00"
          />
          <div className={styles.row2}>
            <TextField
              label="Target date (optional)"
              type="date"
              value={goalTargetDate}
              onChange={(e) => setGoalTargetDate(e.target.value)}
            />
            <Select
              label="Priority"
              value={goalPriority}
              onChange={(e) => setGoalPriority(e.target.value as GoalPriority)}
            >
              {PRIORITIES.map((p) => (
                <option key={p.value} value={p.value}>
                  {p.label}
                </option>
              ))}
            </Select>
          </div>
        </div>
      )}

      {error ? <p className={styles.error}>{error}</p> : null}

      <div className={styles.nav}>
        {step > 0 && (
          <Button variant="secondary" onClick={goBack}>
            Back
          </Button>
        )}
        <Button fullWidth onClick={goNext}>
          {step === STEP_COUNT - 1 ? "Finish setup" : "Next"}
        </Button>
      </div>
    </div>
  );
}
