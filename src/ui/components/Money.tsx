import { formatCents, isPositive, type Cents } from "../../domain/money";
import styles from "./Money.module.css";

type Tone = "auto" | "positive" | "negative" | "accent" | "muted";

interface MoneyProps {
  cents: Cents;
  currency: string;
  tone?: Tone;
  /** Prefixes a "+" for positive amounts (Intl formatting already adds "-"
   * for negative ones). Useful for income/contribution rows. */
  showPlusSign?: boolean;
  className?: string;
}

/** The one component that renders a money amount anywhere in the app -
 * formatting and tone rules live here, once. */
export function Money({ cents, currency, tone = "auto", showPlusSign = false, className }: MoneyProps) {
  const resolvedTone: Tone = tone === "auto" ? (isPositive(cents) ? "positive" : "negative") : tone;
  const formatted = formatCents(cents, currency);
  const text = showPlusSign && isPositive(cents) ? `+${formatted}` : formatted;

  const toneClass =
    resolvedTone === "positive"
      ? styles.positive
      : resolvedTone === "negative"
        ? styles.negative
        : resolvedTone === "accent"
          ? styles.accent
          : resolvedTone === "muted"
            ? styles.muted
            : "";

  return <span className={[styles.money, toneClass, className].filter(Boolean).join(" ")}>{text}</span>;
}
