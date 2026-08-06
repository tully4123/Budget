import { useId, type SelectHTMLAttributes } from "react";
import styles from "./Field.module.css";

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label: string;
  hint?: string;
}

export function Select({ label, hint, id, className, children, ...rest }: SelectProps) {
  const generatedId = useId();
  const selectId = id ?? generatedId;
  return (
    <div className={styles.field}>
      <label className={styles.label} htmlFor={selectId}>
        {label}
      </label>
      <select id={selectId} className={[styles.control, className].filter(Boolean).join(" ")} {...rest}>
        {children}
      </select>
      {hint ? <span className={styles.hint}>{hint}</span> : null}
    </div>
  );
}
