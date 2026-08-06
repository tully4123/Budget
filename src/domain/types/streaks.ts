import type { LocalDate } from "./common";

export type StreakType = "logging" | "onBudget" | "goal";

/**
 * A streak's current state. Fully derived (rule 4, no exception) -
 * recomputed from the transaction ledger every time, so editing or
 * deleting a past transaction can never leave a streak corrupt.
 *
 * For "logging" and "onBudget" (daily streaks), lastQualifiedDate is the
 * most recent day that qualified. For "goal" (a weekly streak),
 * lastQualifiedDate holds the week key (Monday of that week, see
 * domain/dates.ts weekKey) of the most recent qualifying week.
 */
export interface Streak {
  type: StreakType;
  current: number;
  best: number;
  lastQualifiedDate: LocalDate | null;
}
