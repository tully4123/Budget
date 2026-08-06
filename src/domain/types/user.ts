import type { CurrencyCode, Id, LocalDate } from "./common";

export type PayFrequency = "weekly" | "biweekly" | "semimonthly" | "monthly";

export interface UserProfile {
  id: Id;
  displayName: string;
  currency: CurrencyCode;
  payFrequency: PayFrequency;
  createdAt: LocalDate;
}
