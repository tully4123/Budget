import { useState } from "react";
import { CATEGORY_KIND_LABEL, CATEGORY_PRESETS_BY_KIND, type CategoryPreset } from "../../domain/categoryPresets";
import { Button } from "./Button";
import { Select } from "./Select";
import { TextField } from "./TextField";

const CUSTOM_VALUE = "__custom__";
const PLACEHOLDER_VALUE = "";

function presetValue(preset: CategoryPreset): string {
  return `${preset.kind}::${preset.name}`;
}

interface CategoryPickerProps {
  /** Called the moment a category should be created - a preset adds
   * immediately on selection, custom adds on submitting its own mini-form. */
  onAdd: (name: string, kind: CategoryPreset["kind"]) => void;
}

/** Dropdown-first "add a category": pick from a large curated list grouped
 * by need/want/savings (adds instantly, dropdown resets), or choose
 * "Custom..." to type a name and pick a kind by hand. Shared between
 * onboarding and Settings so both offer the same list. */
export function CategoryPicker({ onAdd }: CategoryPickerProps) {
  const [selection, setSelection] = useState(PLACEHOLDER_VALUE);
  const [customName, setCustomName] = useState("");
  const [customKind, setCustomKind] = useState<CategoryPreset["kind"]>("want");

  function handleSelectChange(value: string) {
    setSelection(value);
    if (value === PLACEHOLDER_VALUE || value === CUSTOM_VALUE) return;
    const [kind, name] = value.split("::") as [CategoryPreset["kind"], string];
    onAdd(name, kind);
    setSelection(PLACEHOLDER_VALUE);
  }

  function handleAddCustom() {
    const name = customName.trim();
    if (!name) return;
    onAdd(name, customKind);
    setCustomName("");
    setSelection(PLACEHOLDER_VALUE);
  }

  return (
    <div>
      <Select label="Add a category" value={selection} onChange={(e) => handleSelectChange(e.target.value)}>
        <option value={PLACEHOLDER_VALUE} disabled>
          Choose from heaps of options…
        </option>
        {(Object.keys(CATEGORY_PRESETS_BY_KIND) as CategoryPreset["kind"][]).map((kind) => (
          <optgroup key={kind} label={CATEGORY_KIND_LABEL[kind]}>
            {CATEGORY_PRESETS_BY_KIND[kind].map((preset) => (
              <option key={presetValue(preset)} value={presetValue(preset)}>
                {preset.name}
              </option>
            ))}
          </optgroup>
        ))}
        <option value={CUSTOM_VALUE}>Custom…</option>
      </Select>

      {selection === CUSTOM_VALUE && (
        <div style={{ display: "flex", gap: "var(--space-2)", marginTop: "var(--space-2)", alignItems: "flex-end" }}>
          <TextField
            label="Category name"
            value={customName}
            onChange={(e) => setCustomName(e.target.value)}
            placeholder="e.g. Ski trip fund"
            autoFocus
            onKeyDown={(e) => e.key === "Enter" && handleAddCustom()}
          />
          <Select label="Type" value={customKind} onChange={(e) => setCustomKind(e.target.value as CategoryPreset["kind"])}>
            <option value="need">Need</option>
            <option value="want">Want</option>
            <option value="savings">Savings</option>
          </Select>
          <Button variant="secondary" onClick={handleAddCustom} disabled={!customName.trim()}>
            Add
          </Button>
        </div>
      )}
    </div>
  );
}
