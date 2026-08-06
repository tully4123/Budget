import type { Id, LocalDate } from "./common";

/** Non-financial events that still feed streak/reward derivation (rule 4:
 * "recomputable from the transaction ledger + event log"). v1 has one
 * event type - an explicit "nothing to log today" check-in, the logging
 * streak's alternative to a transaction. */
export type EventType = "noSpendDayCheckIn";

export interface AppEvent {
  id: Id;
  type: EventType;
  date: LocalDate;
  createdAt: string; // ISO 8601 datetime
}
