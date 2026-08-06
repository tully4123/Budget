import type { Cents } from "../money";
import type { Id, MonthKey } from "./common";

/** One category's limit for one month. At most one per (categoryId, month) -
 * enforced by the store layer, not this type. */
export interface Budget {
  id: Id;
  categoryId: Id;
  month: MonthKey;
  limitCents: Cents;
}
