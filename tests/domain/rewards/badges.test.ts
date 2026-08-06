import { describe, expect, it } from "vitest";
import { BADGE_CATALOG, type BadgeContext } from "../../../src/domain/rewards/badges";
import { localDate, type MonthKey } from "../../../src/domain/dates";
import { cents } from "../../../src/domain/money";
import type { Budget, Goal, Streak, Transaction } from "../../../src/domain/types";

const TODAY = localDate("2026-04-15");
const ACCOUNT_CREATED = localDate("2026-01-01");

const IDLE_STREAK: Streak = { type: "logging", current: 0, best: 0, lastQualifiedDate: null };

function baseCtx(overrides: Partial<BadgeContext> = {}): BadgeContext {
  return {
    goals: [],
    transactions: [],
    events: [],
    budgets: [],
    loggingStreak: IDLE_STREAK,
    accountCreatedAt: ACCOUNT_CREATED,
    today: TODAY,
    ...overrides,
  };
}

function criteria(id: string) {
  const badge = BADGE_CATALOG.find((b) => b.id === id);
  if (!badge) throw new Error(`no badge ${id}`);
  return badge.criteria;
}

function goal(partial: Partial<Goal> & Pick<Goal, "id">): Goal {
  return {
    name: partial.id,
    iconKey: "flag",
    targetCents: cents(100000),
    priority: "medium",
    status: "active",
    createdAt: ACCOUNT_CREATED,
    ...partial,
  };
}

let txCounter = 0;
function contribution(goalId: string, amount: number, date: string): Transaction {
  txCounter += 1;
  return {
    id: `tx-${txCounter}`,
    type: "goalContribution",
    amountCents: cents(amount),
    categoryId: "sys-savings",
    goalId,
    date: localDate(date),
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
  };
}

describe("first-goal", () => {
  it("requires at least one goal", () => {
    expect(criteria("first-goal")(baseCtx())).toBe(false);
    expect(criteria("first-goal")(baseCtx({ goals: [goal({ id: "g1" })] }))).toBe(true);
  });
});

describe("first-100-saved", () => {
  it("requires $100 total contributed across all goals", () => {
    const under = baseCtx({ transactions: [contribution("g1", 9999, "2026-02-01")] });
    const over = baseCtx({
      transactions: [contribution("g1", 5000, "2026-02-01"), contribution("g2", 5000, "2026-02-02")],
    });
    expect(criteria("first-100-saved")(under)).toBe(false);
    expect(criteria("first-100-saved")(over)).toBe(true);
  });
});

describe("fully-funded", () => {
  it("requires at least one completed goal", () => {
    const active = baseCtx({ goals: [goal({ id: "g1", status: "active" })] });
    const completed = baseCtx({ goals: [goal({ id: "g1", status: "completed" })] });
    expect(criteria("fully-funded")(active)).toBe(false);
    expect(criteria("fully-funded")(completed)).toBe(true);
  });
});

describe("streak-7 / streak-30", () => {
  it("uses the streak's best, not current - a badge earned once stays earned", () => {
    const brokenButOnceHit7 = baseCtx({ loggingStreak: { type: "logging", current: 0, best: 7, lastQualifiedDate: localDate("2026-02-01") } });
    expect(criteria("streak-7")(brokenButOnceHit7)).toBe(true);
    expect(criteria("streak-30")(brokenButOnceHit7)).toBe(false);
  });
});

describe("month-under-budget", () => {
  it("requires a past completed month where every budgeted category stayed under limit", () => {
    const budget: Budget = { id: "b1", categoryId: "cat", month: "2026-03" as MonthKey, limitCents: cents(10000) };
    const under = baseCtx({
      budgets: [budget],
      transactions: [{ id: "t1", type: "expense", amountCents: cents(5000), categoryId: "cat", date: localDate("2026-03-15"), createdAt: "x", updatedAt: "x" }],
    });
    const over = baseCtx({
      budgets: [budget],
      transactions: [{ id: "t1", type: "expense", amountCents: cents(15000), categoryId: "cat", date: localDate("2026-03-15"), createdAt: "x", updatedAt: "x" }],
    });
    expect(criteria("month-under-budget")(under)).toBe(true);
    expect(criteria("month-under-budget")(over)).toBe(false);
  });

  it("ignores the current, still-in-progress month", () => {
    const budget: Budget = { id: "b1", categoryId: "cat", month: "2026-04" as MonthKey, limitCents: cents(10000) };
    const ctx = baseCtx({ budgets: [budget], transactions: [] }); // TODAY is in April - not a past month yet
    expect(criteria("month-under-budget")(ctx)).toBe(false);
  });
});

describe("no-spend-x10", () => {
  it("requires 10 no-spend day check-in events", () => {
    const events = Array.from({ length: 9 }, (_, i) => ({
      id: `e${i}`,
      type: "noSpendDayCheckIn" as const,
      date: localDate(`2026-02-${String(i + 1).padStart(2, "0")}`),
      createdAt: "x",
    }));
    expect(criteria("no-spend-x10")(baseCtx({ events }))).toBe(false);
    expect(criteria("no-spend-x10")(baseCtx({ events: [...events, { id: "e10", type: "noSpendDayCheckIn", date: localDate("2026-02-10"), createdAt: "x" }] }))).toBe(true);
  });
});
