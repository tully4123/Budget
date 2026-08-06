import type { Cents } from "../money";
import type { Id, LocalDate } from "../types/common";

/** The full shape is designed now (Milestone 2's data model) even though
 * the functions that compute it land in Milestone 6 - see build order. */

export interface FreeCashFlow {
  monthlyIncomeCents: Cents;
  averageNeedsSpendingCents: Cents;
  freeCashFlowCents: Cents;
}

export interface GoalPlanItem {
  goalId: Id;
  /** Monthly contribution required to hit the goal's target date, ignoring
   * whether the household can actually afford it. */
  requiredMonthlyCents: Cents;
  /** What the plan actually allocates, after priority-weighting against
   * free cash flow when the total required exceeds it. */
  allocatedMonthlyCents: Cents;
  isFullyFunded: boolean;
  /** Projected completion date at the allocated pace; null if the
   * allocation is zero (no progress, so no projection is meaningful). */
  projectedCompletionDate: LocalDate | null;
}

export interface TradeOffSuggestion {
  message: string;
  goalId?: Id;
  categoryId?: Id;
}

export interface GoalsPlan {
  items: GoalPlanItem[];
  totalRequiredMonthlyCents: Cents;
  isFeasible: boolean;
  tradeOffs: TradeOffSuggestion[];
}

export interface SuggestedBudget {
  categoryId: Id;
  suggestedLimitCents: Cents;
  /** Human-readable justification, e.g. "You've averaged $210/mo here over
   * 3 months, under your old $250 limit." Always present - no unexplained
   * numbers. */
  reason: string;
}

export interface SafeToSpend {
  todayCents: Cents;
  thisWeekCents: Cents;
}

export type InsightSeverity = "warning" | "positive" | "info";

export interface PlannerInsight {
  /** Stable-ish id for the specific insight (e.g. "overspend-pace:categoryId")
   * - used as a React key and to avoid duplicate nudges across recomputes. */
  id: string;
  severity: InsightSeverity;
  message: string;
  categoryId?: Id;
  goalId?: Id;
}

export interface PlannerResult {
  asOf: LocalDate;
  freeCashFlow: FreeCashFlow;
  goalsPlan: GoalsPlan;
  suggestedBudgets: SuggestedBudget[];
  safeToSpend: SafeToSpend;
  insights: PlannerInsight[];
}

/** The planner's latest output, cached with the date it was computed
 * (PlannerResult.asOf) so the UI can show suggestions instantly on load
 * and refresh them in the background rather than blocking on recompute. */
export type PlannerSnapshot = PlannerResult;
