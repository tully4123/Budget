import { useState } from "react";
import { seedDemoData } from "../../seed/demoData";
import { useFinnhubKey } from "../../lib/marketData/useFinnhubKey";
import { today } from "../../lib/today";
import { useAppStore } from "../../store/appStore";
import { Button } from "../components/Button";
import { CategoryIcon } from "../components/CategoryIcon";
import { TextField } from "../components/TextField";
import { ScreenHeader } from "../components/ScreenHeader";
import styles from "./settings/Settings.module.css";

const PAY_FREQUENCY_LABEL: Record<string, string> = {
  weekly: "Weekly",
  biweekly: "Every 2 weeks",
  semimonthly: "Twice a month",
  monthly: "Monthly",
};

export function SettingsScreen() {
  const profile = useAppStore((s) => s.profile);
  const categories = useAppStore((s) => s.categories);
  const archiveCategory = useAppStore((s) => s.archiveCategory);
  const updateCategory = useAppStore((s) => s.updateCategory);
  const [busy, setBusy] = useState(false);
  const store = useAppStore();
  const [finnhubKey, setFinnhubKey] = useFinnhubKey();
  const [keyDraft, setKeyDraft] = useState(finnhubKey);

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
