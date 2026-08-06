import type { Cents } from "../money";
import type { Id, LocalDate } from "./common";

export type TransactionType = "income" | "expense" | "goalContribution";

/**
 * The ledger - source of truth for everything derived (budgets spent,
 * goal funded amounts, streaks, points). createdAt/updatedAt are real
 * timestamps (ISO 8601 datetime, not a LocalDate) for audit/ordering
 * purposes; `date` is the LocalDate the transaction is *for*, which is
 * what all domain math (budgets, streaks) keys off.
 */
export interface Transaction {
  id: Id;
  type: TransactionType;
  /** Always a non-negative magnitude - `type` alone determines direction
   * (income adds to spendable; expense/goalContribution subtract from it).
   * Keeps sign from being encoded in two places at once. */
  amountCents: Cents;
  categoryId: Id;
  goalId?: Id;
  date: LocalDate;
  note?: string;
  createdAt: string;
  updatedAt: string;
}
