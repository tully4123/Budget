import { describe, expect, it } from "vitest";
import { computeFreeCashFlow, computeMonthlyIncome } from "../../../src/domain/planner/freeCashFlow";
import { localDate } from "../../../src/domain/dates";
import { cents } from "../../../src/domain/money";
import type { Category, IncomeSource, Transaction } from "../../../src/domain/types";

function income(amount: number, frequency: IncomeSource["frequency"]): IncomeSource {
  return { id: `inc-${frequency}`, name: frequency, amountCents: cents(amount), frequency, nextDate: localDate("2026-04-01") };
}

const NEED_CAT: Category = {
  id: "cat-housing",
  name: "Housing",
  iconKey: "home",
  colorToken: "cat-1",
  kind: "need",
  isArchived: false,
};
const WANT_CAT: Category = {
  id: "cat-dining",
  name: "Dining",
  iconKey: "utensils",
  colorToken: "cat-4",
  kind: "want",
  isArchived: false,
};

let txCounter = 0;
function expense(categoryId: string, amount: number, date: string): Transaction {
  txCounter += 1;
  return {
    id: `tx-${txCounter}`,
    type: "expense",
    amountCents: cents(amount),
    categoryId,
    date: localDate(date),
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
  };
}

describe("computeMonthlyIncome", () => {
  it("converts each frequency to its monthly equivalent and sums them", () => {
    expect(computeMonthlyIncome([income(10000, "weekly")])).toBe(43333);
    expect(computeMonthlyIncome([income(20000, "biweekly")])).toBe(43333);
    expect(computeMonthlyIncome([income(150000, "semimonthly")])).toBe(300000);
    expect(computeMonthlyIncome([income(300000, "monthly")])).toBe(300000);
  });

  it("sums multiple income sources", () => {
    const total = computeMonthlyIncome([income(300000, "monthly"), income(150000, "semimonthly")]);
    expect(total).toBe(600000);
  });

  it("returns zero with no income sources", () => {
    expect(computeMonthlyIncome([])).toBe(0);
  });
});

describe("computeFreeCashFlow", () => {
  it("subtracts average need spending from monthly income", () => {
    const incomeSources = [income(500000, "monthly")];
    const categories = [NEED_CAT, WANT_CAT];
    const transactions = [
      expense(NEED_CAT.id, 100000, "2026-03-01"), // need
      expense(WANT_CAT.id, 999999, "2026-03-01"), // want - excluded from needs average
    ];
    // 100000 over 3-month window (1 elapsed month floor doesn't apply here
    // since account predates the window) -> averaged over 3 months = 33333
    const result = computeFreeCashFlow(incomeSources, categories, transactions, localDate("2025-01-01"), localDate("2026-03-15"));
    expect(result.monthlyIncomeCents).toBe(500000);
    expect(result.averageNeedsSpendingCents).toBe(33333);
    expect(result.freeCashFlowCents).toBe(500000 - 33333);
  });

  it("allows free cash flow to go negative when needs spending exceeds income", () => {
    const incomeSources = [income(50000, "monthly")];
    const categories = [NEED_CAT];
    const transactions = [expense(NEED_CAT.id, 900000, "2026-03-01")];
    const result = computeFreeCashFlow(incomeSources, categories, transactions, localDate("2026-03-01"), localDate("2026-03-15"));
    expect(result.freeCashFlowCents).toBeLessThan(0);
  });
});
