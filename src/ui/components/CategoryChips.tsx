import type { Category } from "../../domain/types";
import { CategoryIcon } from "./CategoryIcon";
import styles from "./ChipSelect.module.css";

interface SingleSelectProps {
  mode: "single";
  categories: readonly Category[];
  value: string | null;
  onChange: (categoryId: string) => void;
}

interface MultiSelectProps {
  mode: "multi";
  categories: readonly Category[];
  value: readonly string[];
  onChange: (categoryId: string) => void;
}

type CategoryChipsProps = SingleSelectProps | MultiSelectProps;

export function CategoryChips(props: CategoryChipsProps) {
  const { categories } = props;
  return (
    <div className={styles.row} role="group">
      {categories.map((cat) => {
        const active = props.mode === "single" ? props.value === cat.id : props.value.includes(cat.id);
        return (
          <button
            key={cat.id}
            type="button"
            aria-pressed={active}
            className={active ? `${styles.chip} ${styles.chipActive}` : styles.chip}
            onClick={() => props.onChange(cat.id)}
          >
            <CategoryIcon iconKey={cat.iconKey} width={16} height={16} />
            {cat.name}
          </button>
        );
      })}
    </div>
  );
}
