import type { ButtonHTMLAttributes } from "react";
import styles from "./Button.module.css";

type Variant = "primary" | "secondary" | "ghost" | "danger";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  fullWidth?: boolean;
  small?: boolean;
}

const VARIANT_CLASS: Record<Variant, string | undefined> = {
  primary: styles.primary,
  secondary: styles.secondary,
  ghost: styles.ghost,
  danger: styles.danger,
};

export function Button({
  variant = "primary",
  fullWidth = false,
  small = false,
  className,
  type = "button",
  ...rest
}: ButtonProps) {
  const classes = [
    styles.button,
    VARIANT_CLASS[variant],
    fullWidth ? styles.fullWidth : "",
    small ? styles.small : "",
    className,
  ]
    .filter(Boolean)
    .join(" ");
  return <button type={type} className={classes} {...rest} />;
}
