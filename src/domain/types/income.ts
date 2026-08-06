import type { Cents } from "../money";
import type { Id, LocalDate } from "./common";
import type { PayFrequency } from "./user";

export interface IncomeSource {
  id: Id;
  name: string;
  amountCents: Cents;
  frequency: PayFrequency;
  nextDate: LocalDate;
}
