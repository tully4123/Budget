import { computeMonthlyAverage } from "../analytics";
import type { LocalDate } from "../dates";
import { clampToZero, formatCents, multiply, subtract, sum, ZERO_CENTS, type Cents } from "../money";
import type { Category, Transaction } from "../types";
import type { SuggestedBudget } from "./types";

const NEEDS_SHARE = 0.5;
const WANTS_SHARE = 0.3;

/**
 * Suggested monthly limit per non-system category. Categories with real
 * spending history get their own 3-month average as the suggestion (a
 * realistic starting point, not a generic baseline); categories with no
 * history yet split a 50/30/20-baseline pool evenly among their kind's
 * other no-history categories. Finally, "want" suggestions are trimmed
 * proportionally if they'd leave no room for the goals plan's required
 * monthly contributions - needs are never trimmed, since they're
 * definitionally the less-discretionary half of the budget.
 */
export function computeSuggestedBudgets(
  categories: readonly Category[],
  transactions: readonly Transaction[],
  monthlyIncomeCents: Cents,
  goalsRequiredMonthlyCents: Cents,
  freeCashFlowCents: Cents,
  accountCreatedAt: LocalDate,
  today: LocalDate,
  currency: string,
): SuggestedBudget[] {
  const spendCategories = categories.filter((c) => !c.isSystem && !c.isArchived && (c.kind === "need" || c.kind === "want"));

  const withAverages = spendCategories.map((c) => ({
    category: c,
    avgCents: computeMonthlyAverage(
      transactions,
      (t) => t.type === "expense" && t.categoryId === c.id,
      accountCreatedAt,
      today,
    ),
  }));

  const results: SuggestedBudget[] = [];

  for (const kind of ["need", "want"] as const) {
    const inKind = withAverages.filter((x) => x.category.kind === kind);
    const withHistory = inKind.filter((x) => x.avgCents > ZERO_CENTS);
    const withoutHistory = inKind.filter((x) => x.avgCents <= ZERO_CENTS);

    for (const { category, avgCents } of withHistory) {
      results.push({
        categoryId: category.id,
        suggestedLimitCents: avgCents,
        reason: `Averaging ${formatCents(avgCents, currency)}/mo over the last 3 months.`,
      });
    }

    if (withoutHistory.length > 0) {
      const baselinePool = multiply(monthlyIncomeCents, kind === "need" ? NEEDS_SHARE : WANTS_SHARE);
      const perCategory = multiply(baselinePool, 1 / withoutHistory.length);
      for (const { category } of withoutHistory) {
        results.push({
          categoryId: category.id,
          suggestedLimitCents: perCategory,
          reason: `No spending history yet - starting from a 50/30/20 baseline split evenly across your ${kind} categories.`,
        });
      }
    }
  }

  return trimWantsForGoals(results, spendCategories, goalsRequiredMonthlyCents, freeCashFlowCents, currency);
}

/**
 * If the suggested "want" budgets would collectively leave less than the
 * goals plan needs (both draw from the same free-cash-flow pool), scale
 * every want suggestion down proportionally so there's room for both -
 * this is the "adjust using the goal contributions the plan needs" step.
 */
function trimWantsForGoals(
  suggestions: SuggestedBudget[],
  categories: readonly Category[],
  goalsRequiredMonthlyCents: Cents,
  freeCashFlowCents: Cents,
  currency: string,
): SuggestedBudget[] {
  const wantCategoryIds = new Set(categories.filter((c) => c.kind === "want").map((c) => c.id));
  const wantSuggestions = suggestions.filter((s) => wantCategoryIds.has(s.categoryId));
  const totalWants = sum(wantSuggestions.map((s) => s.suggestedLimitCents));
  const availableForWants = clampToZero(subtract(freeCashFlowCents, goalsRequiredMonthlyCents));

  if (totalWants <= availableForWants || totalWants <= ZERO_CENTS) {
    return suggestions;
  }

  const trimFactor = availableForWants / totalWants;
  return suggestions.map((s) => {
    if (!wantCategoryIds.has(s.categoryId)) return s;
    const trimmed = multiply(s.suggestedLimitCents, trimFactor);
    return {
      ...s,
      suggestedLimitCents: trimmed,
      reason: `${s.reason} Trimmed from ${formatCents(s.suggestedLimitCents, currency)} to leave room for your goal plan.`,
    };
  });
}
