import { describe, expect, it } from "vitest";
import { computeSuggestedBudgets } from "../../../src/domain/planner/suggestedBudgets";
import { localDate } from "../../../src/domain/dates";
import { cents } from "../../../src/domain/money";
import type { Category, Transaction } from "../../../src/domain/types";

const TODAY = localDate("2026-03-15");
const ACCOUNT_CREATED = localDate("2025-01-01");

function category(partial: Partial<Category> & Pick<Category, "id" | "kind">): Category {
  return {
    name: partial.id,
    iconKey: "box",
    colorToken: "cat-1",
    isArchived: false,
    ...partial,
  };
}

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

describe("computeSuggestedBudgets - history-based suggestions", () => {
  it("suggests the category's own 3-month average when it has spending history", () => {
    const housing = category({ id: "housing", kind: "need" });
    const transactions = [
      expense("housing", 100000, "2026-01-05"),
      expense("housing", 100000, "2026-02-05"),
      expense("housing", 100000, "2026-03-05"),
    ];
    const results = computeSuggestedBudgets(
      [housing],
      transactions,
      cents(500000),
      cents(0),
      cents(500000),
      ACCOUNT_CREATED,
      TODAY,
      "USD",
    );
    expect(results).toHaveLength(1);
    expect(results[0]?.suggestedLimitCents).toBe(100000);
    expect(results[0]?.reason).toContain("Averaging $1,000.00/mo");
  });
});

describe("computeSuggestedBudgets - baseline fallback for no history", () => {
  it("splits the 50/30/20 baseline evenly among no-history categories of the same kind", () => {
    const dining = category({ id: "dining", kind: "want" });
    const entertainment = category({ id: "entertainment", kind: "want" });
    // income 300000, wants share 30% -> 90000 pool / 2 categories = 45000 each
    const results = computeSuggestedBudgets(
      [dining, entertainment],
      [],
      cents(300000),
      cents(0),
      cents(300000),
      ACCOUNT_CREATED,
      TODAY,
      "USD",
    );
    expect(results).toHaveLength(2);
    for (const r of results) {
      expect(r.suggestedLimitCents).toBe(45000);
      expect(r.reason).toContain("50/30/20 baseline");
    }
  });

  it("a mix of history and no-history categories of the same kind don't affect each other's baseline pool", () => {
    const withHistory = category({ id: "withHistory", kind: "need" });
    const withoutHistory = category({ id: "withoutHistory", kind: "need" });
    const transactions = [expense("withHistory", 80000, "2026-03-01")];
    // income 400000, needs share 50% -> 200000 pool, only 1 no-history category -> gets the full pool
    const results = computeSuggestedBudgets(
      [withHistory, withoutHistory],
      transactions,
      cents(400000),
      cents(0),
      cents(400000),
      ACCOUNT_CREATED,
      TODAY,
      "USD",
    );
    const a = results.find((r) => r.categoryId === "withHistory");
    const b = results.find((r) => r.categoryId === "withoutHistory");
    // 80000 over a 3-month window with 1 transaction -> averaged over 3 months = 26667
    expect(a?.suggestedLimitCents).toBe(26667);
    expect(b?.suggestedLimitCents).toBe(200000);
  });
});

describe("computeSuggestedBudgets - excludes non-spending categories", () => {
  it("excludes system and archived categories", () => {
    const system = category({ id: "sys", kind: "savings", isSystem: true });
    const archived = category({ id: "arch", kind: "need", isArchived: true });
    const income = category({ id: "inc", kind: "income", isSystem: true });
    const results = computeSuggestedBudgets(
      [system, archived, income],
      [],
      cents(300000),
      cents(0),
      cents(300000),
      ACCOUNT_CREATED,
      TODAY,
      "USD",
    );
    expect(results).toEqual([]);
  });
});

describe("computeSuggestedBudgets - trims wants to leave room for goals", () => {
  it("scales want suggestions down proportionally when they'd crowd out the goals plan", () => {
    const dining = category({ id: "dining", kind: "want" });
    const transactions = [
      expense("dining", 100000, "2026-01-05"),
      expense("dining", 100000, "2026-02-05"),
      expense("dining", 100000, "2026-03-05"),
    ];
    // suggested (avg) = 100000. available for wants = freeCashFlow(150000) - goalsRequired(100000) = 50000.
    // 100000 > 50000 -> trim factor 0.5 -> 50000.
    const results = computeSuggestedBudgets(
      [dining],
      transactions,
      cents(500000),
      cents(100000),
      cents(150000),
      ACCOUNT_CREATED,
      TODAY,
      "USD",
    );
    expect(results[0]?.suggestedLimitCents).toBe(50000);
    expect(results[0]?.reason).toContain("Trimmed from $1,000.00");
  });

  it("leaves want suggestions untouched when they already fit alongside the goals plan", () => {
    const dining = category({ id: "dining", kind: "want" });
    const transactions = [expense("dining", 150000, "2026-01-05"), expense("dining", 150000, "2026-02-05"), expense("dining", 150000, "2026-03-05")];
    // avg=150000, available for wants = 400000-50000=350000 >= 150000 -> no trim
    const results = computeSuggestedBudgets(
      [dining],
      transactions,
      cents(500000),
      cents(50000),
      cents(400000),
      ACCOUNT_CREATED,
      TODAY,
      "USD",
    );
    expect(results[0]?.suggestedLimitCents).toBe(150000);
    expect(results[0]?.reason).not.toContain("Trimmed");
  });

  it("never trims need suggestions, even when free cash flow is entirely consumed by goals", () => {
    const housing = category({ id: "housing", kind: "need" });
    const transactions = [expense("housing", 100000, "2026-01-05"), expense("housing", 100000, "2026-02-05"), expense("housing", 100000, "2026-03-05")];
    const results = computeSuggestedBudgets(
      [housing],
      transactions,
      cents(500000),
      cents(500000),
      cents(0),
      ACCOUNT_CREATED,
      TODAY,
      "USD",
    );
    expect(results[0]?.suggestedLimitCents).toBe(100000);
    expect(results[0]?.reason).not.toContain("Trimmed");
  });
});
