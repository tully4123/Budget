/**
 * Local-calendar-date helpers. A "day" for streak/budget purposes is the
 * user's local day, stored as a YYYY-MM-DD string (LocalDate) - never a
 * timestamp, never UTC. Built entirely on date-fns; never hand-roll date
 * arithmetic (adding/subtracting raw milliseconds breaks across DST).
 *
 * This module is pure: nothing here calls Date.now() or reads the system
 * clock. Callers (store/UI layer) obtain "today" via src/lib/today.ts and
 * pass it in explicitly.
 */
import {
  addDays as fnsAddDays,
  addMonths as fnsAddMonths,
  compareAsc,
  differenceInCalendarDays,
  differenceInCalendarMonths,
  endOfMonth,
  format,
  getDate,
  getDaysInMonth,
  isSameMonth as fnsIsSameMonth,
  isValid,
  parse,
  startOfMonth,
  startOfWeek,
} from "date-fns";

declare const LocalDateBrand: unique symbol;
declare const MonthKeyBrand: unique symbol;

/** A calendar date in the user's local timezone, formatted YYYY-MM-DD. */
export type LocalDate = string & { readonly [LocalDateBrand]: true };

/** A calendar month, formatted YYYY-MM. */
export type MonthKey = string & { readonly [MonthKeyBrand]: true };

const DATE_FORMAT = "yyyy-MM-dd";
const MONTH_FORMAT = "yyyy-MM";

export function isValidLocalDate(value: string): value is LocalDate {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = parse(value, DATE_FORMAT, new Date());
  return isValid(parsed) && format(parsed, DATE_FORMAT) === value;
}

/** Constructs a LocalDate from a YYYY-MM-DD string, validating the format
 * and that the calendar date actually exists (rejects e.g. 2025-02-30). */
export function localDate(value: string): LocalDate {
  if (!isValidLocalDate(value)) {
    throw new RangeError(`Invalid local date: ${value}`);
  }
  return value as LocalDate;
}

/** Converts a JS Date to a LocalDate using its local (not UTC) calendar
 * fields. The caller supplies the Date - this function does not read the
 * system clock itself. */
export function toLocalDate(date: Date): LocalDate {
  return format(date, DATE_FORMAT) as LocalDate;
}

/** Converts a LocalDate to a JS Date at local midnight on that day. */
export function fromLocalDate(date: LocalDate): Date {
  return parse(date, DATE_FORMAT, new Date());
}

export function addDays(date: LocalDate, amount: number): LocalDate {
  return toLocalDate(fnsAddDays(fromLocalDate(date), amount));
}

/** Calendar-month addition with day clamping (e.g. Jan 31 + 1 month = Feb
 * 28/29, not an overflow into March) - date-fns's standard behavior. */
export function addMonths(date: LocalDate, amount: number): LocalDate {
  return toLocalDate(fnsAddMonths(fromLocalDate(date), amount));
}

export function compareLocalDates(a: LocalDate, b: LocalDate): -1 | 0 | 1 {
  const result = compareAsc(fromLocalDate(a), fromLocalDate(b));
  return result < 0 ? -1 : result > 0 ? 1 : 0;
}

export function isBefore(a: LocalDate, b: LocalDate): boolean {
  return compareLocalDates(a, b) < 0;
}

export function isAfter(a: LocalDate, b: LocalDate): boolean {
  return compareLocalDates(a, b) > 0;
}

export function isSameOrBefore(a: LocalDate, b: LocalDate): boolean {
  return compareLocalDates(a, b) <= 0;
}

export function isSameOrAfter(a: LocalDate, b: LocalDate): boolean {
  return compareLocalDates(a, b) >= 0;
}

/** Whole calendar days between two dates (b - a); negative if b is before a. */
export function diffInDays(a: LocalDate, b: LocalDate): number {
  return differenceInCalendarDays(fromLocalDate(b), fromLocalDate(a));
}

/** Whole calendar months between two dates (b - a); negative if b is before a. */
export function diffInMonths(a: LocalDate, b: LocalDate): number {
  return differenceInCalendarMonths(fromLocalDate(b), fromLocalDate(a));
}

export function monthKey(date: LocalDate): MonthKey {
  return format(fromLocalDate(date), MONTH_FORMAT) as MonthKey;
}

export function isSameMonth(a: LocalDate, b: LocalDate): boolean {
  return fnsIsSameMonth(fromLocalDate(a), fromLocalDate(b));
}

export function startOfMonthLocal(date: LocalDate): LocalDate {
  return toLocalDate(startOfMonth(fromLocalDate(date)));
}

export function endOfMonthLocal(date: LocalDate): LocalDate {
  return toLocalDate(endOfMonth(fromLocalDate(date)));
}

export function daysInMonth(date: LocalDate): number {
  return getDaysInMonth(fromLocalDate(date));
}

export function dayOfMonth(date: LocalDate): number {
  return getDate(fromLocalDate(date));
}

/** Days left in the month, counting `date` itself as one of them - so on
 * the last day of the month this returns 1, never 0. Used for the daily
 * allowance (remaining discretionary budget / remaining days). */
export function daysRemainingInMonth(date: LocalDate): number {
  return daysInMonth(date) - dayOfMonth(date) + 1;
}

/** Monday of the calendar week containing `date` - used as a stable,
 * unambiguous week key (sidesteps ISO week-numbering edge cases at year
 * boundaries). */
export function startOfWeekLocal(date: LocalDate): LocalDate {
  return toLocalDate(startOfWeek(fromLocalDate(date), { weekStartsOn: 1 }));
}

export function weekKey(date: LocalDate): LocalDate {
  return startOfWeekLocal(date);
}
