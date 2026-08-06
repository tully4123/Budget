import { computeMonthlyAverage } from "../analytics";
import type { LocalDate } from "../dates";
import { multiply, subtract, sum, type Cents } from "../money";
import type { Category, IncomeSource, PayFrequency, Transaction } from "../types";
import type { FreeCashFlow } from "./types";

/** How many times a year each pay frequency occurs, divided by 12 -
 * i.e. the multiplier that turns one paycheck amount into a monthly
 * equivalent. Semimonthly (twice a month) is exact; the others are
 * annualized since "weekly"/"biweekly" don't divide evenly into months. */
const MONTHLY_FACTOR: Record<PayFrequency, number> = {
  weekly: 52 / 12,
  biweekly: 26 / 12,
  semimonthly: 2,
  monthly: 1,
};

export function computeMonthlyIncome(incomeSources: readonly IncomeSource[]): Cents {
  return sum(incomeSources.map((s) => multiply(s.amountCents, MONTHLY_FACTOR[s.frequency])));
}

/**
 * Free cash flow = monthly income - average "need" category spending
 * (the trailing 3-month average, since account creation if younger).
 * This is the pool that "wants" spending and goal contributions compete
 * for - see goalsPlan.ts and suggestedBudgets.ts.
 */
export function computeFreeCashFlow(
  incomeSources: readonly IncomeSource[],
  categories: readonly Category[],
  transactions: readonly Transaction[],
  accountCreatedAt: LocalDate,
  today: LocalDate,
): FreeCashFlow {
  const monthlyIncomeCents = computeMonthlyIncome(incomeSources);
  const needCategoryIds = new Set(categories.filter((c) => c.kind === "need").map((c) => c.id));

  const averageNeedsSpendingCents = computeMonthlyAverage(
    transactions,
    (t) => t.type === "expense" && needCategoryIds.has(t.categoryId),
    accountCreatedAt,
    today,
  );

  return {
    monthlyIncomeCents,
    averageNeedsSpendingCents,
    // Deliberately not clamped to zero - a household spending more on
    // needs than it earns is exactly the deficit an insight should flag,
    // and allocation logic downstream clamps at its own point of use.
    freeCashFlowCents: subtract(monthlyIncomeCents, averageNeedsSpendingCents),
  };
}
