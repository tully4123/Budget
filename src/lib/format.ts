/** Formats a "YYYY-MM" MonthKey (or the equivalent prefix of a LocalDate)
 * as "March 2026". Takes a plain string rather than the branded MonthKey
 * type so it also accepts a LocalDate's first 7 characters without a cast. */
export function formatMonthLabel(monthKeyStr: string): string {
  const [year, month] = monthKeyStr.split("-");
  return new Date(Number(year), Number(month) - 1, 1).toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });
}
