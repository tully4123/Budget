import { computeMonthlyAverage } from "../analytics";
import { addMonths, type LocalDate } from "../dates";
import { computeFundedCents, requiredMonthlyForTargetDate } from "../goals/goals";
import { clampToZero, formatCents, subtract, sum, ZERO_CENTS, type Cents } from "../money";
import type { Category, Goal, GoalPriority, Transaction } from "../types";
import type { GoalPlanItem, GoalsPlan, TradeOffSuggestion } from "./types";

const PRIORITY_RANK: Record<GoalPriority, number> = { high: 0, medium: 1, low: 2 };

/** Best-effort discretionary category to suggest trimming for a trade-off
 * message - the "want" category with the highest 3-month average spend
 * (there's something real to cut, not a category with no spending). */
function highestSpendWantCategory(
  categories: readonly Category[],
  transactions: readonly Transaction[],
  accountCreatedAt: LocalDate,
  today: LocalDate,
): { category: Category; avgCents: Cents } | null {
  const candidates = categories
    .filter((c) => c.kind === "want" && !c.isSystem && !c.isArchived)
    .map((c) => ({
      category: c,
      avgCents: computeMonthlyAverage(
        transactions,
        (t) => t.type === "expense" && t.categoryId === c.id,
        accountCreatedAt,
        today,
      ),
    }))
    .filter((c) => c.avgCents > ZERO_CENTS)
    .sort((a, b) => b.avgCents - a.avgCents);
  return candidates[0] ?? null;
}

function projectAtPace(
  funded: Cents,
  target: Cents,
  monthlyPace: Cents,
  today: LocalDate,
): LocalDate | null {
  if (funded >= target) return null;
  if (monthlyPace <= ZERO_CENTS) return null;
  const remaining = subtract(target, funded);
  const monthsNeeded = Math.ceil(remaining / monthlyPace);
  return addMonths(today, monthsNeeded);
}

/**
 * Builds the per-goal contribution plan: what each active goal with a
 * target date needs monthly to hit it, and - when the total need exceeds
 * free cash flow - a priority-ordered waterfall allocation (fully fund
 * high priority first, then medium, then low) plus trade-off suggestions
 * for whichever goals come up short. Goals without a target date get no
 * required/allocated amount here (they're opportunistic, not deadline-
 * driven) - insights.ts is where they get a "consider contributing X"
 * nudge instead.
 */
export function computeGoalsPlan(
  goals: readonly Goal[],
  transactions: readonly Transaction[],
  categories: readonly Category[],
  freeCashFlowCents: Cents,
  accountCreatedAt: LocalDate,
  today: LocalDate,
  currency: string,
): GoalsPlan {
  const activeGoals = goals.filter((g) => g.status === "active");

  const withRequirement = activeGoals
    .map((g) => ({ goal: g, required: requiredMonthlyForTargetDate(g, transactions, today) }))
    .filter((x): x is { goal: Goal; required: Cents } => x.required !== null && x.required > ZERO_CENTS);

  const totalRequiredMonthlyCents = sum(withRequirement.map((x) => x.required));
  const availableCents = clampToZero(freeCashFlowCents);
  const isFeasible = totalRequiredMonthlyCents <= availableCents;

  // Waterfall: sort by priority (high first), then by target date (more
  // urgent first) as a tiebreak, and fill each goal's requirement fully
  // before moving to the next.
  const ordered = [...withRequirement].sort((a, b) => {
    const byPriority = PRIORITY_RANK[a.goal.priority] - PRIORITY_RANK[b.goal.priority];
    if (byPriority !== 0) return byPriority;
    return (a.goal.targetDate ?? "9999-12-31").localeCompare(b.goal.targetDate ?? "9999-12-31");
  });

  let remaining = availableCents;
  const allocationByGoalId = new Map<string, Cents>();
  for (const { goal, required } of ordered) {
    const allocated = remaining >= required ? required : clampToZero(remaining);
    allocationByGoalId.set(goal.id, allocated);
    remaining = subtract(remaining, allocated);
  }

  const items: GoalPlanItem[] = activeGoals.map((goal) => {
    const requirement = withRequirement.find((x) => x.goal.id === goal.id);
    const requiredMonthlyCents = requirement?.required ?? ZERO_CENTS;
    const allocatedMonthlyCents = allocationByGoalId.get(goal.id) ?? ZERO_CENTS;
    const funded = computeFundedCents(goal.id, transactions);
    return {
      goalId: goal.id,
      requiredMonthlyCents,
      allocatedMonthlyCents,
      isFullyFunded: allocatedMonthlyCents >= requiredMonthlyCents,
      projectedCompletionDate: projectAtPace(funded, goal.targetCents, allocatedMonthlyCents, today),
    };
  });

  const tradeOffs: TradeOffSuggestion[] = [];
  if (!isFeasible) {
    const trimCandidate = highestSpendWantCategory(categories, transactions, accountCreatedAt, today);
    for (const item of items) {
      if (item.isFullyFunded || item.requiredMonthlyCents <= ZERO_CENTS) continue;
      const goal = activeGoals.find((g) => g.id === item.goalId);
      if (!goal) continue;
      const shortfall = subtract(item.requiredMonthlyCents, item.allocatedMonthlyCents);
      const shortfallFmt = formatCents(shortfall, currency);
      const message = trimCandidate
        ? `${goal.name} needs ${shortfallFmt}/mo more than your budget allows - push its target date back, or trim ${trimCandidate.category.name} (averaging ${formatCents(trimCandidate.avgCents, currency)}/mo).`
        : `${goal.name} needs ${shortfallFmt}/mo more than your budget allows - consider pushing its target date back.`;
      tradeOffs.push({ message, goalId: goal.id, categoryId: trimCandidate?.category.id });
    }
  }

  return { items, totalRequiredMonthlyCents, isFeasible, tradeOffs };
}
