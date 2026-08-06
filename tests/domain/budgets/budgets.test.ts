import { describe, expect, it } from "vitest";
import { localDate, type MonthKey } from "../../../src/domain/dates";
import { cents } from "../../../src/domain/money";
import {
  computeBudgetStatus,
  computeDailyAllowance,
  computeSpent,
  copyBudgetsForward,
  findPriorBudgetMonth,
  needsRolloverDecision,
} from "../../../src/domain/budgets/budgets";
import type { Budget, Transaction } from "../../../src/domain/types";

const MARCH = "2026-03" as MonthKey;
const APRIL = "2026-04" as MonthKey;
const CAT_DINING = "cat-dining";
const CAT_GROCERIES = "cat-groceries";

let txCounter = 0;
function tx(partial: Partial<Transaction> & Pick<Transaction, "type" | "amountCents" | "date" | "categoryId">): Transaction {
  txCounter += 1;
  return {
    id: `tx-${txCounter}`,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    ...partial,
  };
}

function budget(partial: Partial<Budget> & Pick<Budget, "categoryId" | "month" | "limitCents">): Budget {
  return { id: `budget-${partial.categoryId}-${partial.month}`, ...partial };
}

describe("computeSpent", () => {
  const transactions: Transaction[] = [
    tx({ type: "expense", amountCents: cents(2000), date: localDate("2026-03-05"), categoryId: CAT_DINING }),
    tx({ type: "expense", amountCents: cents(1500), date: localDate("2026-03-20"), categoryId: CAT_DINING }),
    // different category - excluded
    tx({ type: "expense", amountCents: cents(9999), date: localDate("2026-03-10"), categoryId: CAT_GROCERIES }),
    // different month - excluded
    tx({ type: "expense", amountCents: cents(9999), date: localDate("2026-04-01"), categoryId: CAT_DINING }),
    // income/goalContribution - never count toward a spending budget
    tx({ type: "income", amountCents: cents(9999), date: localDate("2026-03-15"), categoryId: CAT_DINING }),
    tx({ type: "goalContribution", amountCents: cents(9999), date: localDate("2026-03-15"), categoryId: CAT_DINING }),
  ];

  it("sums only matching expense transactions for the category and month", () => {
    expect(computeSpent(CAT_DINING, MARCH, transactions)).toBe(3500);
  });

  it("returns zero when nothing matches", () => {
    expect(computeSpent("nonexistent-category", MARCH, transactions)).toBe(0);
  });
});

describe("computeBudgetStatus", () => {
  it("computes spent/remaining/percentUsed", () => {
    const b = budget({ categoryId: CAT_DINING, month: MARCH, limitCents: cents(10000) });
    const transactions = [
      tx({ type: "expense", amountCents: cents(4000), date: localDate("2026-03-05"), categoryId: CAT_DINING }),
    ];
    const status = computeBudgetStatus(b, transactions, localDate("2026-03-05"));
    expect(status.spentCents).toBe(4000);
    expect(status.remainingCents).toBe(6000);
    expect(status.percentUsed).toBeCloseTo(40);
  });

  it("lets remaining go negative when over budget", () => {
    const b = budget({ categoryId: CAT_DINING, month: MARCH, limitCents: cents(10000) });
    const transactions = [
      tx({ type: "expense", amountCents: cents(15000), date: localDate("2026-03-05"), categoryId: CAT_DINING }),
    ];
    const status = computeBudgetStatus(b, transactions, localDate("2026-03-05"));
    expect(status.remainingCents).toBe(-5000);
    expect(status.percentUsed).toBeCloseTo(150);
  });

  it("avoids divide-by-zero when the limit is 0", () => {
    const b = budget({ categoryId: CAT_DINING, month: MARCH, limitCents: cents(0) });
    const status = computeBudgetStatus(b, [], localDate("2026-03-05"));
    expect(status.percentUsed).toBe(0);
    expect(status.pace).toBe(null);
  });

  it("pace is null for a month other than today's", () => {
    const b = budget({ categoryId: CAT_DINING, month: MARCH, limitCents: cents(10000) });
    const status = computeBudgetStatus(b, [], localDate("2026-04-05")); // viewing April, budget is for March
    expect(status.pace).toBe(null);
  });

  it("pace is on-pace when spending fraction is below the day-of-month fraction", () => {
    // March has 31 days; day 10 -> ~32% of month elapsed. Spent 20% of budget - under pace.
    const b = budget({ categoryId: CAT_DINING, month: MARCH, limitCents: cents(10000) });
    const transactions = [
      tx({ type: "expense", amountCents: cents(2000), date: localDate("2026-03-05"), categoryId: CAT_DINING }),
    ];
    const status = computeBudgetStatus(b, transactions, localDate("2026-03-10"));
    expect(status.pace).toBe("on-pace");
  });

  it("pace is over-pace when spending fraction exceeds the day-of-month fraction", () => {
    // Day 5 of 31 -> ~16% of month elapsed. Spent 80% of budget - way over pace.
    const b = budget({ categoryId: CAT_DINING, month: MARCH, limitCents: cents(10000) });
    const transactions = [
      tx({ type: "expense", amountCents: cents(8000), date: localDate("2026-03-05"), categoryId: CAT_DINING }),
    ];
    const status = computeBudgetStatus(b, transactions, localDate("2026-03-05"));
    expect(status.pace).toBe("over-pace");
  });
});

describe("computeDailyAllowance", () => {
  it("divides total remaining headroom by days left in the month, today inclusive", () => {
    const budgets = [
      budget({ categoryId: CAT_DINING, month: MARCH, limitCents: cents(10000) }),
      budget({ categoryId: CAT_GROCERIES, month: MARCH, limitCents: cents(20000) }),
    ];
    const transactions = [
      tx({ type: "expense", amountCents: cents(4000), date: localDate("2026-03-01"), categoryId: CAT_DINING }),
      tx({ type: "expense", amountCents: cents(5000), date: localDate("2026-03-01"), categoryId: CAT_GROCERIES }),
    ];
    // Remaining: (10000-4000) + (20000-5000) = 6000 + 15000 = 21000
    // March has 31 days; on March 1, 31 days remain (inclusive).
    const allowance = computeDailyAllowance(budgets, transactions, localDate("2026-03-01"));
    expect(allowance).toBe(Math.round(21000 / 31));
  });

  it("floors the total at zero when categories are collectively over budget", () => {
    const budgets = [budget({ categoryId: CAT_DINING, month: MARCH, limitCents: cents(1000) })];
    const transactions = [
      tx({ type: "expense", amountCents: cents(5000), date: localDate("2026-03-01"), categoryId: CAT_DINING }),
    ];
    expect(computeDailyAllowance(budgets, transactions, localDate("2026-03-01"))).toBe(0);
  });

  it("an overspent category drags down the total for other categories, not clamped per-category", () => {
    const budgets = [
      budget({ categoryId: CAT_DINING, month: MARCH, limitCents: cents(1000) }), // will be -4000 remaining
      budget({ categoryId: CAT_GROCERIES, month: MARCH, limitCents: cents(10000) }), // 10000 remaining
    ];
    const transactions = [
      tx({ type: "expense", amountCents: cents(5000), date: localDate("2026-03-01"), categoryId: CAT_DINING }),
    ];
    // Total remaining: -4000 + 10000 = 6000, not 10000 (which is what per-category clamping would give).
    const allowance = computeDailyAllowance(budgets, transactions, localDate("2026-03-01"));
    expect(allowance).toBe(Math.round(6000 / 31));
  });

  it("divides by 1 on the last day of the month, never 0", () => {
    const budgets = [budget({ categoryId: CAT_DINING, month: MARCH, limitCents: cents(3100) })];
    const allowance = computeDailyAllowance(budgets, [], localDate("2026-03-31"));
    expect(allowance).toBe(3100);
  });

  it("returns zero when there are no budgets for the current month", () => {
    expect(computeDailyAllowance([], [], localDate("2026-03-15"))).toBe(0);
  });
});

describe("rollover helpers", () => {
  it("needsRolloverDecision is true only when the current month is empty but a prior month has budgets", () => {
    const budgets = [budget({ categoryId: CAT_DINING, month: MARCH, limitCents: cents(10000) })];
    expect(needsRolloverDecision(APRIL, budgets)).toBe(true);
    expect(needsRolloverDecision(MARCH, budgets)).toBe(false); // already has budgets
    expect(needsRolloverDecision(MARCH, [])).toBe(false); // nothing to copy from
  });

  it("findPriorBudgetMonth finds the most recent month before the given one", () => {
    const budgets = [
      budget({ categoryId: CAT_DINING, month: "2026-01" as MonthKey, limitCents: cents(1000) }),
      budget({ categoryId: CAT_DINING, month: MARCH, limitCents: cents(1000) }),
    ];
    expect(findPriorBudgetMonth(APRIL, budgets)).toBe(MARCH);
    expect(findPriorBudgetMonth("2026-01" as MonthKey, budgets)).toBe(null);
  });

  it("copyBudgetsForward copies limits into the new month with no ids", () => {
    const budgets = [
      budget({ categoryId: CAT_DINING, month: MARCH, limitCents: cents(10000) }),
      budget({ categoryId: CAT_GROCERIES, month: MARCH, limitCents: cents(20000) }),
      budget({ categoryId: CAT_DINING, month: APRIL, limitCents: cents(99999) }), // different month, excluded
    ];
    const copied = copyBudgetsForward(MARCH, APRIL, budgets);
    expect(copied).toEqual([
      { categoryId: CAT_DINING, month: APRIL, limitCents: 10000 },
      { categoryId: CAT_GROCERIES, month: APRIL, limitCents: 20000 },
    ]);
  });
});
