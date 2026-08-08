import { useState } from "react";
import { localDate } from "../../domain/dates";
import { formatCents, parseToCents } from "../../domain/money";
import type { CategoryColorToken, CategoryKind, PayFrequency } from "../../domain/types";
import { seedDemoData } from "../../seed/demoData";
import { useFinnhubKey } from "../../lib/marketData/useFinnhubKey";
import { today } from "../../lib/today";
import { useAppStore } from "../../store/appStore";
import { Button } from "../components/Button";
import { CategoryIcon } from "../components/CategoryIcon";
import { Select } from "../components/Select";
import { TextField } from "../components/TextField";
import { TrashIcon } from "../components/icons";
import { ScreenHeader } from "../components/ScreenHeader";
import styles from "./settings/Settings.module.css";

const PAY_FREQUENCY_LABEL: Record<string, string> = {
  weekly: "Weekly",
  biweekly: "Every 2 weeks",
  semimonthly: "Twice a month",
  monthly: "Monthly",
};

const COLOR_TOKENS: CategoryColorToken[] = [
  "cat-1", "cat-2", "cat-3", "cat-4", "cat-5", "cat-6", "cat-7", "cat-8", "cat-9", "cat-10",
];

export function SettingsScreen() {
  const profile = useAppStore((s) => s.profile);
  const categories = useAppStore((s) => s.categories);
  const archiveCategory = useAppStore((s) => s.archiveCategory);
  const updateCategory = useAppStore((s) => s.updateCategory);
  const addCategory = useAppStore((s) => s.addCategory);
  const incomeSources = useAppStore((s) => s.incomeSources);
  const addIncomeSource = useAppStore((s) => s.addIncomeSource);
  const removeIncomeSource = useAppStore((s) => s.removeIncomeSource);
  const dismissedTips = useAppStore((s) => s.dismissedTips);
  const resetDismissedTips = useAppStore((s) => s.resetDismissedTips);
  const [busy, setBusy] = useState(false);
  const store = useAppStore();
  const [finnhubKey, setFinnhubKey] = useFinnhubKey();
  const [keyDraft, setKeyDraft] = useState(finnhubKey);

  const [newCategoryName, setNewCategoryName] = useState("");
  const [newCategoryKind, setNewCategoryKind] = useState<Extract<CategoryKind, "need" | "want">>("want");

  function handleAddCategory() {
    if (!newCategoryName.trim()) return;
    const colorToken = COLOR_TOKENS[categories.length % COLOR_TOKENS.length]!;
    addCategory({ name: newCategoryName.trim(), iconKey: "box", colorToken, kind: newCategoryKind });
    setNewCategoryName("");
  }

  const [newIncomeName, setNewIncomeName] = useState("");
  const [newIncomeAmount, setNewIncomeAmount] = useState("");
  const [newIncomeFrequency, setNewIncomeFrequency] = useState<PayFrequency>(
    profile?.payFrequency ?? "monthly",
  );
  const [newIncomeDate, setNewIncomeDate] = useState<string>(today());

  function handleAddIncome() {
    const amount = parseToCents(newIncomeAmount);
    if (!newIncomeName.trim() || amount === null || amount <= 0) return;
    addIncomeSource({
      name: newIncomeName.trim(),
      amountCents: amount,
      frequency: newIncomeFrequency,
      nextDate: localDate(newIncomeDate),
    });
    setNewIncomeName("");
    setNewIncomeAmount("");
  }

  async function handleEnableDemo() {
    if (
      !window.confirm(
        "This replaces everything currently in the app with ~3 months of sample data. Continue?",
      )
    ) {
      return;
    }
    setBusy(true);
    await store.resetAll();
    seedDemoData(store, today());
    setBusy(false);
  }

  async function handleClearDemo() {
    if (!window.confirm("Clear all data? You'll go through onboarding again.")) return;
    setBusy(true);
    await store.resetAll();
    setBusy(false);
  }

  return (
    <>
      <ScreenHeader title="Settings" subtitle="Profile, categories, and demo mode." />

      {profile && (
        <div className={styles.section}>
          <div className={styles.sectionTitle}>Profile</div>
          <div className={styles.card}>
            <div className={styles.profileRow}>
              <span className={styles.profileLabel}>Name</span>
              <span>{profile.displayName}</span>
            </div>
            <div className={styles.profileRow}>
              <span className={styles.profileLabel}>Currency</span>
              <span>{profile.currency}</span>
            </div>
            <div className={styles.profileRow}>
              <span className={styles.profileLabel}>Pay frequency</span>
              <span>{PAY_FREQUENCY_LABEL[profile.payFrequency] ?? profile.payFrequency}</span>
            </div>
          </div>
        </div>
      )}

      <div className={styles.section}>
        <div className={styles.sectionTitle}>Income</div>
        <div className={styles.card}>
          {incomeSources.length === 0 ? (
            <p className={styles.demoBody}>
              No income sources yet - add one below so the planner, safe-to-spend, and the Weekly
              plan can work with real numbers.
            </p>
          ) : (
            <div className={styles.categoryList}>
              {incomeSources.map((s) => (
                <div key={s.id} className={styles.categoryRow}>
                  <span className={styles.categoryName}>
                    {s.name} · {formatCents(s.amountCents, profile?.currency ?? "USD")} ·{" "}
                    {PAY_FREQUENCY_LABEL[s.frequency] ?? s.frequency}
                  </span>
                  <Button
                    variant="ghost"
                    small
                    onClick={() => removeIncomeSource(s.id)}
                    aria-label={`Remove ${s.name}`}
                  >
                    <TrashIcon width={14} height={14} />
                  </Button>
                </div>
              ))}
            </div>
          )}
          <div className={styles.addCategoryRow}>
            <TextField
              label="Income source name"
              value={newIncomeName}
              onChange={(e) => setNewIncomeName(e.target.value)}
              placeholder="e.g. Paycheck"
            />
            <TextField
              label="Amount"
              inputMode="decimal"
              value={newIncomeAmount}
              onChange={(e) => setNewIncomeAmount(e.target.value)}
              placeholder="0.00"
            />
            <Select
              label="Frequency"
              value={newIncomeFrequency}
              onChange={(e) => setNewIncomeFrequency(e.target.value as PayFrequency)}
            >
              {Object.entries(PAY_FREQUENCY_LABEL).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </Select>
            <TextField
              label="Next pay date"
              type="date"
              value={newIncomeDate}
              onChange={(e) => setNewIncomeDate(e.target.value)}
            />
            <Button onClick={handleAddIncome} disabled={!newIncomeName.trim() || parseToCents(newIncomeAmount) === null}>
              Add income source
            </Button>
          </div>
        </div>
      </div>

      <div className={styles.section}>
        <div className={styles.sectionTitle}>Categories</div>
        <div className={styles.card}>
          <div className={styles.categoryList}>
            {categories
              .filter((c) => !c.isSystem)
              .map((c) => (
                <div key={c.id} className={styles.categoryRow}>
                  <span className={styles.categoryDot} style={{ background: `var(--color-${c.colorToken})` }}>
                    <CategoryIcon iconKey={c.iconKey} width={14} height={14} />
                  </span>
                  <span className={c.isArchived ? `${styles.categoryName} ${styles.categoryNameArchived}` : styles.categoryName}>
                    {c.name}
                  </span>
                  {c.isArchived ? (
                    <Button variant="ghost" small onClick={() => updateCategory(c.id, { isArchived: false })}>
                      Restore
                    </Button>
                  ) : (
                    <Button variant="ghost" small onClick={() => archiveCategory(c.id)}>
                      Archive
                    </Button>
                  )}
                </div>
              ))}
          </div>
          <div className={styles.addCategoryRow}>
            <TextField
              label="New category name"
              value={newCategoryName}
              onChange={(e) => setNewCategoryName(e.target.value)}
              placeholder="e.g. Pet care"
            />
            <Select
              label="Kind"
              value={newCategoryKind}
              onChange={(e) => setNewCategoryKind(e.target.value as "need" | "want")}
            >
              <option value="need">Need</option>
              <option value="want">Want</option>
            </Select>
            <Button onClick={handleAddCategory} disabled={!newCategoryName.trim()}>
              Add category
            </Button>
          </div>
        </div>
      </div>

      <div className={styles.section}>
        <div className={styles.sectionTitle}>Tips</div>
        <div className={styles.card}>
          <p className={styles.demoBody}>
            The floating helper button on every screen gives a short tip for what you're looking at.
            Dismissed tips stay hidden so it doesn't nag - bring them all back here.
          </p>
          <div className={styles.demoActions}>
            <Button
              variant="secondary"
              onClick={resetDismissedTips}
              disabled={dismissedTips.length === 0}
            >
              Show tips again
            </Button>
          </div>
        </div>
      </div>

      <div className={styles.section}>
        <div className={styles.sectionTitle}>Investing data</div>
        <div className={styles.card}>
          <p className={styles.demoBody}>
            Crypto prices need no setup. Stock/S&amp;P 500 data needs a free Finnhub API key -{" "}
            <a href="https://finnhub.io/register" target="_blank" rel="noreferrer">
              register here
            </a>{" "}
            (no card, ~30 seconds), then paste it below. It's stored only in this browser and sent
            directly to Finnhub with each request - never through any server of ours.
          </p>
          <TextField
            label="Finnhub API key"
            value={keyDraft}
            onChange={(e) => setKeyDraft(e.target.value)}
            placeholder="Paste your key"
          />
          <div className={styles.demoActions}>
            <Button onClick={() => setFinnhubKey(keyDraft)} disabled={keyDraft === finnhubKey}>
              Save key
            </Button>
            {finnhubKey && (
              <Button
                variant="danger"
                onClick={() => {
                  setFinnhubKey("");
                  setKeyDraft("");
                }}
              >
                Remove key
              </Button>
            )}
          </div>
        </div>
      </div>

      <div className={styles.section}>
        <div className={styles.sectionTitle}>Demo mode</div>
        <div className={styles.card}>
          <p className={styles.demoBody}>
            Seed ~3 months of realistic transactions, budgets, and two goals in progress, so every
            screen is reviewable instantly - runs through the same actions as normal use, so it's
            exactly as valid as real data. Clearing wipes everything and starts fresh.
          </p>
          <div className={styles.demoActions}>
            <Button onClick={handleEnableDemo} disabled={busy}>
              {busy ? "Working..." : "Load demo data"}
            </Button>
            <Button variant="danger" onClick={handleClearDemo} disabled={busy}>
              Clear all data
            </Button>
          </div>
        </div>
      </div>
    </>
  );
}
