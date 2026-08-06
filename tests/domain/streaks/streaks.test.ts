import { describe, expect, it } from "vitest";
import {
  computeGoalStreak,
  computeLoggingStreak,
  computeOnBudgetStreak,
  hadLoggingComeback,
  isOnBudgetDay,
} from "../../../src/domain/streaks/streaks";
import { addDays, localDate, weekKey, type MonthKey } from "../../../src/domain/dates";
import { cents } from "../../../src/domain/money";
import type { AppEvent, Budget, Transaction } from "../../../src/domain/types";

const ACCOUNT_CREATED = localDate("2026-03-01");

let txCounter = 0;
function tx(type: Transaction["type"], categoryId: string, amount: number, date: string, goalId?: string): Transaction {
  txCounter += 1;
  return {
    id: `tx-${txCounter}`,
    type,
    amountCents: cents(amount),
    categoryId,
    goalId,
    date: localDate(date),
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
  };
}

function checkIn(date: string): AppEvent {
  return { id: `evt-${date}`, type: "noSpendDayCheckIn", date: localDate(date), createdAt: "2026-01-01T00:00:00.000Z" };
}

describe("computeLoggingStreak", () => {
  it("counts consecutive logged days ending today, tracking best separately", () => {
    const today = localDate("2026-03-10");
    const transactions = [
      // first run: 03-01..03-03 (3 days)
      tx("expense", "cat", 100, "2026-03-01"),
      tx("expense", "cat", 100, "2026-03-02"),
      tx("expense", "cat", 100, "2026-03-03"),
      // gap: 03-04, 03-05
      // second run: 03-06..03-10 (5 days, ending today)
      tx("expense", "cat", 100, "2026-03-06"),
      tx("expense", "cat", 100, "2026-03-07"),
      tx("expense", "cat", 100, "2026-03-08"),
      tx("expense", "cat", 100, "2026-03-09"),
      tx("expense", "cat", 100, "2026-03-10"),
    ];
    const streak = computeLoggingStreak(ACCOUNT_CREATED, today, transactions, []);
    expect(streak.current).toBe(5);
    expect(streak.best).toBe(5);
    expect(streak.lastQualifiedDate).toBe("2026-03-10");
  });

  it("grants a grace day: yesterday's streak still counts if today has nothing logged yet", () => {
    const today = localDate("2026-03-10");
    const transactions = [
      tx("expense", "cat", 100, "2026-03-06"),
      tx("expense", "cat", 100, "2026-03-07"),
      tx("expense", "cat", 100, "2026-03-08"),
      tx("expense", "cat", 100, "2026-03-09"), // last logged day - yesterday
    ];
    const streak = computeLoggingStreak(ACCOUNT_CREATED, today, transactions, []);
    expect(streak.current).toBe(4);
    expect(streak.lastQualifiedDate).toBe("2026-03-09");
  });

  it("reports the streak as broken once the gap exceeds the one-day grace period", () => {
    const today = localDate("2026-03-10");
    const transactions = [
      tx("expense", "cat", 100, "2026-03-06"),
      tx("expense", "cat", 100, "2026-03-07"),
      tx("expense", "cat", 100, "2026-03-08"), // last logged day - 2 days ago
    ];
    const streak = computeLoggingStreak(ACCOUNT_CREATED, today, transactions, []);
    expect(streak.current).toBe(0);
    expect(streak.best).toBe(3); // history is preserved even though current is broken
    expect(streak.lastQualifiedDate).toBe("2026-03-08");
  });

  it("a no-spend day check-in counts as logging, same as a transaction", () => {
    const today = localDate("2026-03-03");
    const events = [checkIn("2026-03-01"), checkIn("2026-03-02"), checkIn("2026-03-03")];
    const streak = computeLoggingStreak(ACCOUNT_CREATED, today, [], events);
    expect(streak.current).toBe(3);
  });

  it("recomputes correctly after a transaction is deleted from the ledger (rule 4)", () => {
    const today = localDate("2026-03-03");
    const withAll = [
      tx("expense", "cat", 100, "2026-03-01"),
      tx("expense", "cat", 100, "2026-03-02"),
      tx("expense", "cat", 100, "2026-03-03"),
    ];
    const afterDeletingMiddleDay = [withAll[0]!, withAll[2]!];
    const before = computeLoggingStreak(ACCOUNT_CREATED, today, withAll, []);
    const after = computeLoggingStreak(ACCOUNT_CREATED, today, afterDeletingMiddleDay, []);
    expect(before.current).toBe(3);
    // Deleting the 03-02 transaction leaves a gap - only today (03-03)
    // qualifies as a run of 1, since 03-02 no longer has anything logged.
    expect(after.current).toBe(1);
    expect(after.best).toBe(1);
  });
});

describe("isOnBudgetDay / computeOnBudgetStreak", () => {
  const budget: Budget = { id: "b1", categoryId: "cat", month: "2026-03" as MonthKey, limitCents: cents(310000) };

  it("judges each day by cumulative spend-through-that-day against that day's expected fraction, never later days", () => {
    const transactions = [
      tx("expense", "cat", 10000, "2026-03-01"), // cum=10000, cap(day1)=10000 -> qualifies
      tx("expense", "cat", 15000, "2026-03-02"), // cum=25000, cap(day2)=20000 -> fails
      // no spend on day 3: cum stays 25000, cap(day3)=30000 -> qualifies again
    ];
    expect(isOnBudgetDay(localDate("2026-03-01"), [budget], transactions)).toBe(true);
    expect(isOnBudgetDay(localDate("2026-03-02"), [budget], transactions)).toBe(false);
    expect(isOnBudgetDay(localDate("2026-03-03"), [budget], transactions)).toBe(true);
  });

  it("never uses spending from later days to judge an earlier one", () => {
    const transactions = [
      tx("expense", "cat", 5000, "2026-03-01"),
      tx("expense", "cat", 999999, "2026-03-15"), // huge future-in-month spend
    ];
    // Day 1 alone is well within pace - the day-15 spend must not leak backward.
    expect(isOnBudgetDay(localDate("2026-03-01"), [budget], transactions)).toBe(true);
  });

  it("a month with no budgets set can't qualify", () => {
    expect(isOnBudgetDay(localDate("2026-03-01"), [], [])).toBe(false);
  });

  it("computeOnBudgetStreak composes day qualification into a streak", () => {
    const transactions = [
      tx("expense", "cat", 10000, "2026-03-01"),
      tx("expense", "cat", 10000, "2026-03-02"),
    ];
    const streak = computeOnBudgetStreak(ACCOUNT_CREATED, localDate("2026-03-02"), [budget], transactions);
    expect(streak.current).toBe(2);
    expect(streak.type).toBe("onBudget");
  });
});

describe("computeGoalStreak", () => {
  it("a week qualifies if it has at least one goal contribution", () => {
    const created = weekKey(ACCOUNT_CREATED);
    const week1Monday = created;
    const week2Monday = addDays(week1Monday, 7);
    const today = addDays(week2Monday, 3); // partway through week 2

    const transactions = [
      tx("goalContribution", "sys-savings", 5000, addDays(week1Monday, 2), "goal-1"),
      tx("goalContribution", "sys-savings", 5000, addDays(week2Monday, 1), "goal-1"),
    ];
    const streak = computeGoalStreak(week1Monday, today, transactions);
    expect(streak.current).toBe(2);
    expect(streak.type).toBe("goal");
  });

  it("a week with no contribution breaks the streak", () => {
    const week1Monday = weekKey(ACCOUNT_CREATED);
    const week3Monday = addDays(week1Monday, 14);
    const transactions = [tx("goalContribution", "sys-savings", 5000, addDays(week1Monday, 1), "goal-1")];
    // week 2 has nothing, week 3 (today) has nothing either
    const streak = computeGoalStreak(week1Monday, week3Monday, transactions);
    expect(streak.current).toBe(0);
    expect(streak.best).toBe(1);
  });
});

describe("hadLoggingComeback", () => {
  it("is false when the streak has never been broken", () => {
    const today = localDate("2026-03-03");
    const transactions = [
      tx("expense", "cat", 100, "2026-03-01"),
      tx("expense", "cat", 100, "2026-03-02"),
      tx("expense", "cat", 100, "2026-03-03"),
    ];
    expect(hadLoggingComeback(ACCOUNT_CREATED, today, transactions, [])).toBe(false);
  });

  it("is true once a broken streak has been rebuilt to at least 3 days", () => {
    const today = localDate("2026-03-10");
    const transactions = [
      tx("expense", "cat", 100, "2026-03-01"), // early run, then a gap
      tx("expense", "cat", 100, "2026-03-08"),
      tx("expense", "cat", 100, "2026-03-09"),
      tx("expense", "cat", 100, "2026-03-10"), // rebuilt run of 3
    ];
    expect(hadLoggingComeback(ACCOUNT_CREATED, today, transactions, [])).toBe(true);
  });

  it("is false if the rebuilt run hasn't reached 3 days yet", () => {
    const today = localDate("2026-03-09");
    const transactions = [
      tx("expense", "cat", 100, "2026-03-01"),
      tx("expense", "cat", 100, "2026-03-08"),
      tx("expense", "cat", 100, "2026-03-09"), // only 2 days rebuilt
    ];
    expect(hadLoggingComeback(ACCOUNT_CREATED, today, transactions, [])).toBe(false);
  });
});
