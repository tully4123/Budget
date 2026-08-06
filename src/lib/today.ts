import { toLocalDate, type LocalDate } from "../domain/dates";

/** The one place allowed to read the system clock for "today". Domain
 * functions never call this themselves (rule: no Date.now() in
 * src/domain/) - the store/UI layer calls it and passes the result in. */
export function today(): LocalDate {
  return toLocalDate(new Date());
}
