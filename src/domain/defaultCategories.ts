import type { Id } from "./types/common";
import type { Category, CategoryColorToken, CategoryKind, IconKey } from "./types/category";

interface CategoryBlueprint {
  name: string;
  iconKey: IconKey;
  colorToken: CategoryColorToken;
  kind: CategoryKind;
  isSystem?: boolean;
}

const BLUEPRINTS: readonly CategoryBlueprint[] = [
  { name: "Housing", iconKey: "home", colorToken: "cat-1", kind: "need" },
  { name: "Groceries", iconKey: "cart", colorToken: "cat-2", kind: "need" },
  { name: "Transport", iconKey: "car", colorToken: "cat-3", kind: "need" },
  { name: "Dining", iconKey: "utensils", colorToken: "cat-4", kind: "want" },
  { name: "Entertainment", iconKey: "film", colorToken: "cat-5", kind: "want" },
  { name: "Subscriptions", iconKey: "repeat", colorToken: "cat-6", kind: "want" },
  { name: "Health", iconKey: "heart", colorToken: "cat-7", kind: "need" },
  { name: "Misc", iconKey: "box", colorToken: "cat-8", kind: "want" },
  { name: "Savings", iconKey: "flag", colorToken: "cat-9", kind: "savings", isSystem: true },
];

/**
 * Builds the default category set for a new profile. Takes an explicit ID
 * factory rather than calling crypto.randomUUID() itself, so this stays a
 * pure, deterministic, testable function per the domain-purity rule.
 */
export function createDefaultCategories(nextId: () => Id): Category[] {
  return BLUEPRINTS.map((bp) => ({
    id: nextId(),
    name: bp.name,
    iconKey: bp.iconKey,
    colorToken: bp.colorToken,
    kind: bp.kind,
    isArchived: false,
    ...(bp.isSystem ? { isSystem: true } : {}),
  }));
}

/** Finds the system Savings category among a category list - throws if
 * missing, since every profile must have exactly one (goalContribution
 * transactions depend on it existing). */
export function findSystemSavingsCategory(categories: readonly Category[]): Category {
  const found = categories.find((c) => c.isSystem === true);
  if (!found) {
    throw new Error("No system Savings category found - every profile must have exactly one.");
  }
  return found;
}
