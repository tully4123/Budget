import { useEffect, useRef, useState } from "react";
import { type AllocationBucket } from "../../../domain/allocation/allocation";
import { parseToCents, type Cents } from "../../../domain/money";
import styles from "./WeeklyPlan.module.css";

function currencySymbol(currency: string): string {
  const part = new Intl.NumberFormat("en-US", { style: "currency", currency }).formatToParts(0).find(
    (p) => p.type === "currency",
  );
  return part?.value ?? "";
}

interface AllocationRowProps {
  bucket: AllocationBucket;
  label: string;
  colorToken: string;
  percent: number;
  amountCents: Cents | null;
  currency: string;
  onChangePercent: (bucket: AllocationBucket, percent: number) => void;
  onChangeAmount: (bucket: AllocationBucket, amountCents: Cents) => void;
}

/** A text input that mirrors an external numeric value but doesn't fight
 * the user mid-keystroke: it only re-syncs from `value` while the field
 * isn't focused, and commits (via onCommit) on blur or Enter. */
function useEditableField(displayValue: string, onCommit: (raw: string) => void) {
  const [draft, setDraft] = useState(displayValue);
  const focused = useRef(false);

  useEffect(() => {
    if (!focused.current) setDraft(displayValue);
  }, [displayValue]);

  return {
    value: draft,
    onFocus: (e: React.FocusEvent<HTMLInputElement>) => {
      focused.current = true;
      e.target.select();
    },
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => setDraft(e.target.value),
    onBlur: () => {
      focused.current = false;
      onCommit(draft);
    },
    onKeyDown: (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Enter") e.currentTarget.blur();
    },
  };
}

export function AllocationRow({
  bucket,
  label,
  colorToken,
  percent,
  amountCents,
  currency,
  onChangePercent,
  onChangeAmount,
}: AllocationRowProps) {
  const percentField = useEditableField(String(percent), (raw) => {
    const parsed = Number(raw);
    if (Number.isFinite(parsed)) onChangePercent(bucket, parsed);
  });

  const amountDisplay = amountCents !== null ? (amountCents / 100).toFixed(2) : "";
  const amountField = useEditableField(amountDisplay, (raw) => {
    const parsed = parseToCents(raw);
    if (parsed !== null) onChangeAmount(bucket, parsed);
  });

  return (
    <div className={styles.sliderRow}>
      <div className={styles.sliderHeader}>
        <span className={styles.sliderDot} style={{ background: `var(--color-${colorToken})` }} />
        <span className={styles.sliderLabel}>{label}</span>
        {amountCents !== null && (
          <span className={styles.amountField}>
            <span className={styles.amountPrefix}>{currencySymbol(currency)}</span>
            <input
              {...amountField}
              className={styles.editableAmount}
              inputMode="decimal"
              aria-label={`${label} amount per week`}
            />
          </span>
        )}
        <span className={styles.percentField}>
          <input
            {...percentField}
            className={styles.editablePercent}
            inputMode="decimal"
            aria-label={`${label} percent of weekly spending`}
          />
          %
        </span>
      </div>
      <input
        type="range"
        className={styles.slider}
        style={{ "--slider-color": `var(--color-${colorToken})` } as React.CSSProperties}
        min={0}
        max={100}
        value={percent}
        onChange={(e) => onChangePercent(bucket, Number(e.target.value))}
        aria-label={`${label} percent of weekly spending (slider)`}
      />
    </div>
  );
}
