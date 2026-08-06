import type { Cents } from "../money";
import type { Id, LocalDate } from "./common";

export type GoalPriority = "high" | "medium" | "low";
export type GoalStatus = "active" | "paused" | "completed";

/**
 * The persisted Goal record. Deliberately has no `fundedCents` field -
 * that value is derived from summing goalContribution transactions for
 * this goal and must never be stored (rule 4: derived state is always
 * recomputed, never accumulated). See domain/goals for the selector that
 * computes it, and GoalWithProgress below for the shape UI code consumes.
 */
export interface Goal {
  id: Id;
  name: string;
  iconKey: string;
  targetCents: Cents;
  targetDate?: LocalDate;
  priority: GoalPriority;
  status: GoalStatus;
  createdAt: LocalDate;
}

/** A Goal plus its derived funded amount - what UI/selectors work with. */
export interface GoalWithProgress extends Goal {
  fundedCents: Cents;
}
