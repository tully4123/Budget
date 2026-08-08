import { format as formatDateFns } from "date-fns";
import { fromLocalDate, type LocalDate } from "../domain/dates";

/** Australian day-month-year, used everywhere a date is shown to the user.
 * A fixed date-fns pattern, not toLocaleDateString/Intl - so it's always
 * dd/mm/yyyy regardless of the machine's own OS/browser locale. */
const DISPLAY_DATE_FORMAT = "dd/MM/yyyy";

/** Formats a "YYYY-MM" MonthKey (or the equivalent prefix of a LocalDate)
 * as "March 2026". Takes a plain string rather than the branded MonthKey
 * type so it also accepts a LocalDate's first 7 characters without a cast. */
export function formatMonthLabel(monthKeyStr: string): string {
  const [year, month] = monthKeyStr.split("-");
  return new Date(Number(year), Number(month) - 1, 1).toLocaleDateString("en-AU", {
    month: "long",
    year: "numeric",
  });
}

/** Renders a LocalDate as dd/mm/yyyy. */
export function formatLocalDate(date: LocalDate): string {
  return formatDateFns(fromLocalDate(date), DISPLAY_DATE_FORMAT);
}

/** Renders an ISO 8601 datetime string's date portion as dd/mm/yyyy. */
export function formatIsoDate(iso: string): string {
  return formatDateFns(new Date(iso), DISPLAY_DATE_FORMAT);
}
