import { describe, expect, it } from "vitest";
import {
  addDays,
  addMonths,
  compareLocalDates,
  daysInMonth,
  daysRemainingInMonth,
  dayOfMonth,
  diffInDays,
  diffInMonths,
  endOfMonthLocal,
  isAfter,
  isBefore,
  isSameMonth,
  isValidLocalDate,
  localDate,
  monthKey,
  startOfMonthLocal,
  startOfWeekLocal,
  toLocalDate,
  weekKey,
  type LocalDate,
} from "../../src/domain/dates";

describe("isValidLocalDate / localDate", () => {
  it("accepts real calendar dates", () => {
    expect(isValidLocalDate("2026-01-15")).toBe(true);
    expect(isValidLocalDate("2024-02-29")).toBe(true); // leap year
  });

  it("rejects malformed or non-existent dates", () => {
    expect(isValidLocalDate("2026-13-01")).toBe(false); // no month 13
    expect(isValidLocalDate("2025-02-30")).toBe(false); // Feb has no 30th
    expect(isValidLocalDate("2025-02-29")).toBe(false); // not a leap year
    expect(isValidLocalDate("2026/01/15")).toBe(false); // wrong separator
    expect(isValidLocalDate("15-01-2026")).toBe(false); // wrong order
    expect(isValidLocalDate("")).toBe(false);
  });

  it("localDate() throws on invalid input", () => {
    expect(() => localDate("not-a-date")).toThrow(RangeError);
  });
});

describe("toLocalDate", () => {
  it("uses local calendar fields, not UTC", () => {
    // 11:30pm local on Jan 15 must stay Jan 15, never roll to the 16th via UTC conversion.
    const d = new Date(2026, 0, 15, 23, 30, 0);
    expect(toLocalDate(d)).toBe("2026-01-15");
  });
});

describe("addDays", () => {
  it("adds and subtracts calendar days", () => {
    expect(addDays(localDate("2026-01-15"), 1)).toBe("2026-01-16");
    expect(addDays(localDate("2026-01-15"), -1)).toBe("2026-01-14");
    expect(addDays(localDate("2026-01-15"), 0)).toBe("2026-01-15");
  });

  it("rolls over a month boundary", () => {
    expect(addDays(localDate("2026-01-31"), 1)).toBe("2026-02-01");
  });

  it("rolls over a year boundary", () => {
    expect(addDays(localDate("2025-12-31"), 1)).toBe("2026-01-01");
  });

  it("handles leap-year Feb 29 correctly", () => {
    expect(addDays(localDate("2024-02-28"), 1)).toBe("2024-02-29");
    expect(addDays(localDate("2024-02-29"), 1)).toBe("2024-03-01");
    // 2025 is not a leap year - Feb 28 + 1 day skips straight to Mar 1.
    expect(addDays(localDate("2025-02-28"), 1)).toBe("2025-03-01");
  });

  it("steps exactly one calendar day across this machine's local DST boundary, if any", () => {
    // TZ env var isn't reliably honored by Node on every platform, so
    // instead of hardcoding a US DST date, detect this machine's actual
    // offset-change day within the year and exercise addDays across it.
    // If the local timezone has no DST (e.g. UTC), there's nothing to
    // exercise and the test is a no-op rather than a false failure.
    const year = 2026;
    let prevOffset = new Date(year, 0, 1).getTimezoneOffset();
    let transitionEve: LocalDate | null = null;
    outer: for (let month = 0; month < 12; month++) {
      const lastDay = new Date(year, month + 1, 0).getDate();
      for (let day = 1; day <= lastDay; day++) {
        const offset = new Date(year, month, day).getTimezoneOffset();
        if (offset !== prevOffset) {
          transitionEve = toLocalDate(new Date(year, month, day - 1));
          break outer;
        }
        prevOffset = offset;
      }
    }

    if (!transitionEve) return; // this machine's timezone doesn't observe DST

    const dayOf = addDays(transitionEve, 1);
    const dayAfter = addDays(dayOf, 1);
    expect(dayOf).not.toBe(transitionEve);
    expect(dayAfter).not.toBe(dayOf);
    // Adding 2 days directly must match two single-day steps chained -
    // no day gets skipped or duplicated by the offset change.
    expect(addDays(transitionEve, 2)).toBe(dayAfter);
  });
});

describe("addMonths - month rollover with day clamping", () => {
  it("adds whole months on a normal day", () => {
    expect(addMonths(localDate("2026-03-15"), 1)).toBe("2026-04-15");
  });

  it("clamps Jan 31 + 1 month to Feb 28 (non-leap year)", () => {
    expect(addMonths(localDate("2025-01-31"), 1)).toBe("2025-02-28");
  });

  it("clamps Jan 31 + 1 month to Feb 29 (leap year)", () => {
    expect(addMonths(localDate("2024-01-31"), 1)).toBe("2024-02-29");
  });

  it("rolls over a year boundary", () => {
    expect(addMonths(localDate("2025-12-15"), 1)).toBe("2026-01-15");
  });
});

describe("diffInMonths", () => {
  it("computes whole calendar months between two dates", () => {
    expect(diffInMonths(localDate("2026-01-01"), localDate("2026-04-01"))).toBe(3);
    expect(diffInMonths(localDate("2026-04-01"), localDate("2026-01-01"))).toBe(-3);
    expect(diffInMonths(localDate("2026-01-01"), localDate("2026-01-31"))).toBe(0);
  });

  it("counts a calendar month boundary even with only a day of difference", () => {
    expect(diffInMonths(localDate("2026-01-31"), localDate("2026-02-01"))).toBe(1);
  });
});

describe("comparisons", () => {
  it("compareLocalDates / isBefore / isAfter", () => {
    const a = localDate("2026-01-01");
    const b = localDate("2026-06-15");
    expect(compareLocalDates(a, b)).toBe(-1);
    expect(compareLocalDates(b, a)).toBe(1);
    expect(compareLocalDates(a, a)).toBe(0);
    expect(isBefore(a, b)).toBe(true);
    expect(isAfter(b, a)).toBe(true);
    expect(isBefore(b, a)).toBe(false);
  });
});

describe("diffInDays", () => {
  it("computes whole calendar days between two dates", () => {
    expect(diffInDays(localDate("2026-01-01"), localDate("2026-01-10"))).toBe(9);
    expect(diffInDays(localDate("2026-01-10"), localDate("2026-01-01"))).toBe(-9);
    expect(diffInDays(localDate("2026-01-01"), localDate("2026-01-01"))).toBe(0);
  });
});

describe("month helpers", () => {
  it("monthKey formats YYYY-MM", () => {
    expect(monthKey(localDate("2026-03-17"))).toBe("2026-03");
  });

  it("isSameMonth", () => {
    expect(isSameMonth(localDate("2026-03-01"), localDate("2026-03-31"))).toBe(true);
    expect(isSameMonth(localDate("2026-03-31"), localDate("2026-04-01"))).toBe(false);
  });

  it("startOfMonthLocal / endOfMonthLocal", () => {
    expect(startOfMonthLocal(localDate("2026-03-17"))).toBe("2026-03-01");
    expect(endOfMonthLocal(localDate("2026-03-17"))).toBe("2026-03-31");
    expect(endOfMonthLocal(localDate("2024-02-10"))).toBe("2024-02-29"); // leap year
  });

  it("daysInMonth accounts for leap years", () => {
    expect(daysInMonth(localDate("2024-02-01"))).toBe(29);
    expect(daysInMonth(localDate("2025-02-01"))).toBe(28);
    expect(daysInMonth(localDate("2026-04-01"))).toBe(30);
  });

  it("dayOfMonth", () => {
    expect(dayOfMonth(localDate("2026-03-17"))).toBe(17);
  });

  it("daysRemainingInMonth counts today inclusively", () => {
    // March 2026 has 31 days.
    expect(daysRemainingInMonth(localDate("2026-03-01"))).toBe(31);
    expect(daysRemainingInMonth(localDate("2026-03-31"))).toBe(1); // last day - never 0
    expect(daysRemainingInMonth(localDate("2026-03-17"))).toBe(15);
  });
});

describe("week helpers", () => {
  it("startOfWeekLocal / weekKey return the Monday of that week", () => {
    // 2026-03-17 is a Tuesday.
    expect(startOfWeekLocal(localDate("2026-03-17"))).toBe("2026-03-16");
    expect(weekKey(localDate("2026-03-17"))).toBe("2026-03-16");
    // A Monday maps to itself.
    expect(weekKey(localDate("2026-03-16"))).toBe("2026-03-16");
    // A Sunday maps to the Monday before it.
    expect(weekKey(localDate("2026-03-22"))).toBe("2026-03-16");
  });

  it("week key is stable across a year boundary", () => {
    // 2025-12-29 (Mon) through 2026-01-04 (Sun) is one week spanning the
    // year boundary - every day in it must share the same week key.
    const monday = localDate("2025-12-29");
    expect(weekKey(localDate("2026-01-01"))).toBe(monday);
    expect(weekKey(localDate("2026-01-04"))).toBe(monday);
  });
});
