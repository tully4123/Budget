import { useEffect, useState } from "react";
import styles from "./ThemePreview.module.css";

/**
 * TEMPORARY - a design-direction comparison switcher, not a real app
 * feature. Flips a data-preset attribute that tokens.css's preview block
 * reads. Once a direction is picked: fold its values into :root in
 * tokens.css, delete the preview block, delete this component and its
 * import in App.tsx.
 */
const PRESETS = [
  { id: "apple", label: "Apple" },
  { id: "vibrant", label: "Vibrant" },
  { id: "editorial", label: "Editorial" },
] as const;

type PresetId = (typeof PRESETS)[number]["id"];
const STORAGE_KEY = "budget-theme-preview";

export function ThemePreview() {
  const [preset, setPreset] = useState<PresetId>(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    return (PRESETS.find((p) => p.id === stored)?.id ?? "apple") as PresetId;
  });

  useEffect(() => {
    if (preset === "apple") {
      delete document.documentElement.dataset.preset;
    } else {
      document.documentElement.dataset.preset = preset;
    }
    localStorage.setItem(STORAGE_KEY, preset);
  }, [preset]);

  return (
    <div className={styles.bar}>
      {PRESETS.map((p) => (
        <button
          key={p.id}
          type="button"
          className={`${styles.pill} ${preset === p.id ? styles.pillActive : ""}`}
          onClick={() => setPreset(p.id)}
        >
          {p.label}
        </button>
      ))}
    </div>
  );
}
