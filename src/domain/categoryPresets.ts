import type { CategoryKind } from "./types/category";

/** A curated list for the "add a category" dropdown - real household
 * budget categories, grouped by kind, so picking one already answers
 * "need, want, or savings" instead of asking separately. Custom entry
 * still exists for anything not on this list. */
export interface CategoryPreset {
  name: string;
  kind: Extract<CategoryKind, "need" | "want" | "savings">;
}

export const CATEGORY_PRESETS: readonly CategoryPreset[] = [
  // Needs
  { name: "Rent", kind: "need" },
  { name: "Mortgage", kind: "need" },
  { name: "Utilities", kind: "need" },
  { name: "Electricity", kind: "need" },
  { name: "Gas", kind: "need" },
  { name: "Water", kind: "need" },
  { name: "Internet & phone", kind: "need" },
  { name: "Groceries", kind: "need" },
  { name: "Transport", kind: "need" },
  { name: "Fuel", kind: "need" },
  { name: "Public transport", kind: "need" },
  { name: "Car payment", kind: "need" },
  { name: "Car insurance", kind: "need" },
  { name: "Health insurance", kind: "need" },
  { name: "Health & medical", kind: "need" },
  { name: "Childcare", kind: "need" },
  { name: "Insurance", kind: "need" },
  { name: "Debt repayment", kind: "need" },
  { name: "Loan payments", kind: "need" },
  { name: "School fees", kind: "need" },

  // Wants
  { name: "Dining out", kind: "want" },
  { name: "Coffee", kind: "want" },
  { name: "Entertainment", kind: "want" },
  { name: "Streaming subscriptions", kind: "want" },
  { name: "Shopping", kind: "want" },
  { name: "Clothing", kind: "want" },
  { name: "Personal care", kind: "want" },
  { name: "Beauty", kind: "want" },
  { name: "Travel", kind: "want" },
  { name: "Holidays", kind: "want" },
  { name: "Hobbies", kind: "want" },
  { name: "Gym & fitness", kind: "want" },
  { name: "Gifts & donations", kind: "want" },
  { name: "Pets", kind: "want" },
  { name: "Education", kind: "want" },
  { name: "Books", kind: "want" },
  { name: "Games", kind: "want" },
  { name: "Alcohol & bars", kind: "want" },
  { name: "Home decor", kind: "want" },
  { name: "Tech & gadgets", kind: "want" },

  // Savings - a category to route money into, distinct from the
  // goal-linked Savings system category (see findSystemCategory).
  { name: "Emergency fund", kind: "savings" },
  { name: "Investments", kind: "savings" },
  { name: "Retirement", kind: "savings" },
  { name: "Sinking fund", kind: "savings" },
  { name: "Vacation fund", kind: "savings" },
  { name: "House deposit", kind: "savings" },
  { name: "Car fund", kind: "savings" },
  { name: "Wedding fund", kind: "savings" },
  { name: "Education fund", kind: "savings" },
  { name: "Rainy day fund", kind: "savings" },
] as const;

export const CATEGORY_PRESETS_BY_KIND: Record<CategoryPreset["kind"], readonly CategoryPreset[]> = {
  need: CATEGORY_PRESETS.filter((p) => p.kind === "need"),
  want: CATEGORY_PRESETS.filter((p) => p.kind === "want"),
  savings: CATEGORY_PRESETS.filter((p) => p.kind === "savings"),
};

export const CATEGORY_KIND_LABEL: Record<CategoryPreset["kind"], string> = {
  need: "Need",
  want: "Want",
  savings: "Savings",
};
