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
  { name: "Utilities", iconKey: "zap", colorToken: "cat-2", kind: "need" },
  { name: "Groceries", iconKey: "cart", colorToken: "cat-3", kind: "need" },
  { name: "Transport", iconKey: "car", colorToken: "cat-4", kind: "need" },
  { name: "Health", iconKey: "heart", colorToken: "cat-5", kind: "need" },
  { name: "Insurance", iconKey: "shield", colorToken: "cat-6", kind: "need" },
  { name: "Dining", iconKey: "utensils", colorToken: "cat-7", kind: "want" },
  { name: "Entertainment", iconKey: "film", colorToken: "cat-8", kind: "want" },
  { name: "Subscriptions", iconKey: "repeat", colorToken: "cat-9", kind: "want" },
  { name: "Shopping", iconKey: "bag", colorToken: "cat-10", kind: "want" },
  { name: "Personal care", iconKey: "sparkle", colorToken: "cat-1", kind: "want" },
  { name: "Travel", iconKey: "plane", colorToken: "cat-2", kind: "want" },
  { name: "Education", iconKey: "book", colorToken: "cat-3", kind: "want" },
  { name: "Gifts & donations", iconKey: "gift", colorToken: "cat-4", kind: "want" },
  { name: "Pets", iconKey: "paw", colorToken: "cat-5", kind: "want" },
  { name: "Misc", iconKey: "box", colorToken: "cat-6", kind: "want" },
  { name: "Savings", iconKey: "flag", colorToken: "cat-9", kind: "savings", isSystem: true },
  { name: "Income", iconKey: "trending-up", colorToken: "cat-10", kind: "income", isSystem: true },
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

/** Finds a system category (Savings for goalContribution transactions,
 * Income for ad-hoc income transactions) by kind - throws if missing,
 * since every profile must have exactly one of each. */
export function findSystemCategory(
  categories: readonly Category[],
  kind: "savings" | "income",
): Category {
  const found = categories.find((c) => c.isSystem === true && c.kind === kind);
  if (!found) {
    throw new Error(`No system ${kind} category found - every profile must have exactly one.`);
  }
  return found;
}
