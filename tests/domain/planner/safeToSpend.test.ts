import { describe, expect, it } from "vitest";
import { computeSafeToSpend } from "../../../src/domain/planner/safeToSpend";
import { localDate, monthKey } from "../../../src/domain/dates";
import { cents } from "../../../src/domain/money";
import type { Budget } from "../../../src/domain/types";

const TODAY = localDate("2026-03-17"); // Tuesday, day 17 of a 31-day March

function budget(categoryId: string, limit: number): Budget {
  return { id: `b-${categoryId}`, categoryId, month: monthKey(TODAY), limitCents: cents(limit) };
}

describe("computeSafeToSpend", () => {
  it("subtracts a day's share of the goals plan from the daily allowance", () => {
    const budgets = [budget("cat-1", 310000)];
    // dailyAllowance: 310000 remaining / 15 days left (17th of 31, inclusive) = 20667
    // goalsDailyShare: 31000 / 31 days in March = 1000
    const result = computeSafeToSpend(budgets, [], cents(31000), TODAY);
    expect(result.todayCents).toBe(20667 - 1000);
  });

  it("multiplies today's rate by the days remaining in the week", () => {
    const budgets = [budget("cat-1", 310000)];
    const result = computeSafeToSpend(budgets, [], cents(31000), TODAY);
    // Tuesday -> 6 days remaining in the week (Mon-start)
    expect(result.thisWeekCents).toBe(result.todayCents * 6);
  });

  it("floors at zero when the goals plan would consume more than the daily allowance", () => {
    const budgets = [budget("cat-1", 15000)]; // small remaining budget
    const result = computeSafeToSpend(budgets, [], cents(3100000), TODAY); // huge goals commitment
    expect(result.todayCents).toBe(0);
    expect(result.thisWeekCents).toBe(0);
  });

  it("is zero with no budgets set", () => {
    const result = computeSafeToSpend([], [], cents(0), TODAY);
    expect(result.todayCents).toBe(0);
    expect(result.thisWeekCents).toBe(0);
  });
});
