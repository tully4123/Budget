import { describe, expect, it } from "vitest";
import { computeMonthlyAverage } from "../../src/domain/analytics";
import { localDate } from "../../src/domain/dates";
import { cents } from "../../src/domain/money";
import type { Transaction } from "../../src/domain/types";

let txCounter = 0;
function tx(amount: number, date: string, type: Transaction["type"] = "expense"): Transaction {
  txCounter += 1;
  return {
    id: `tx-${txCounter}`,
    type,
    amountCents: cents(amount),
    categoryId: "cat-1",
    date: localDate(date),
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
  };
}

describe("computeMonthlyAverage", () => {
  it("averages matching transactions over the trailing window", () => {
    const transactions = [tx(10000, "2026-01-10"), tx(20000, "2026-02-10"), tx(30000, "2026-03-10")];
    // window [2025-12-15, 2026-03-15], 3 elapsed months, 60000 total -> 20000/mo
    const avg = computeMonthlyAverage(transactions, () => true, localDate("2025-01-01"), localDate("2026-03-15"));
    expect(avg).toBe(20000);
  });

  it("uses earliestDate as the window start when it's more recent than the window", () => {
    const transactions = [tx(9000, "2026-02-15")];
    const avg = computeMonthlyAverage(transactions, () => true, localDate("2026-02-01"), localDate("2026-03-15"));
    expect(avg).toBe(9000); // 1 elapsed month since earliestDate
  });

  it("respects the predicate", () => {
    const transactions = [tx(1000, "2026-03-01", "expense"), tx(9999, "2026-03-01", "income")];
    const avg = computeMonthlyAverage(
      transactions,
      (t) => t.type === "expense",
      localDate("2026-03-01"),
      localDate("2026-03-15"),
    );
    expect(avg).toBe(1000);
  });

  it("floors elapsed months at 1 and returns 0 with no matches", () => {
    expect(computeMonthlyAverage([], () => true, localDate("2026-03-01"), localDate("2026-03-15"))).toBe(0);
  });

  it("excludes transactions dated before the effective window start", () => {
    const transactions = [tx(50000, "2025-06-01"), tx(3000, "2026-03-01")];
    const avg = computeMonthlyAverage(transactions, () => true, localDate("2025-01-01"), localDate("2026-03-15"));
    // Only the 3000 falls within [2025-12-15, 2026-03-15]; 3 elapsed months -> 1000/mo
    expect(avg).toBe(1000);
  });
});
