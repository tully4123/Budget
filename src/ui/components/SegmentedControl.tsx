import styles from "./SegmentedControl.module.css";

interface SegmentedOption<T extends string> {
  value: T;
  label: string;
}

interface SegmentedControlProps<T extends string> {
  options: readonly SegmentedOption<T>[];
  value: T;
  onChange: (value: T) => void;
  "aria-label": string;
}

export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  ...rest
}: SegmentedControlProps<T>) {
  return (
    <div className={styles.group} role="radiogroup" aria-label={rest["aria-label"]}>
      {options.map((opt) => (
        <button
          key={opt.value}
          type="button"
          role="radio"
          aria-checked={opt.value === value}
          className={opt.value === value ? `${styles.option} ${styles.optionActive}` : styles.option}
          onClick={() => onChange(opt.value)}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}
