import { computeSpent } from "../budgets/budgets";
import { monthKey, type LocalDate } from "../dates";
import { hadLoggingComeback } from "../streaks/streaks";
import { cents, sum } from "../money";
import type { AppEvent, Budget, Goal, Streak, Transaction } from "../types";

export interface BadgeContext {
  goals: readonly Goal[];
  transactions: readonly Transaction[];
  events: readonly AppEvent[];
  budgets: readonly Budget[];
  loggingStreak: Streak;
  accountCreatedAt: LocalDate;
  today: LocalDate;
}

export interface BadgeDefinition {
  id: string;
  name: string;
  description: string;
  criteria: (ctx: BadgeContext) => boolean;
}

function totalContributed(transactions: readonly Transaction[]): number {
  return sum(transactions.filter((t) => t.type === "goalContribution").map((t) => t.amountCents));
}

/** True if any past (fully completed) month with budgets set ended with
 * every one of that month's categories at or under its limit. */
function hadMonthFullyUnderBudget(ctx: BadgeContext): boolean {
  const currentMonth = monthKey(ctx.today);
  const pastMonths = new Set(ctx.budgets.map((b) => b.month).filter((m) => m < currentMonth));
  for (const month of pastMonths) {
    const monthBudgets = ctx.budgets.filter((b) => b.month === month);
    if (monthBudgets.length === 0) continue;
    const allUnder = monthBudgets.every(
      (b) => computeSpent(b.categoryId, b.month, ctx.transactions) <= b.limitCents,
    );
    if (allUnder) return true;
  }
  return false;
}

export const BADGE_CATALOG: readonly BadgeDefinition[] = [
  {
    id: "first-goal",
    name: "First Goal",
    description: "Created your first savings goal.",
    criteria: (ctx) => ctx.goals.length > 0,
  },
  {
    id: "first-100-saved",
    name: "First $100 Saved",
    description: "Contributed $100 total toward your goals.",
    criteria: (ctx) => totalContributed(ctx.transactions) >= cents(10000),
  },
  {
    id: "fully-funded",
    name: "Fully Funded",
    description: "Completed your first savings goal.",
    criteria: (ctx) => ctx.goals.some((g) => g.status === "completed"),
  },
  {
    id: "streak-7",
    name: "7-Day Streak",
    description: "Logged 7 days in a row.",
    criteria: (ctx) => ctx.loggingStreak.best >= 7,
  },
  {
    id: "streak-30",
    name: "30-Day Streak",
    description: "Logged 30 days in a row.",
    criteria: (ctx) => ctx.loggingStreak.best >= 30,
  },
  {
    id: "month-under-budget",
    name: "First Month Under Budget",
    description: "Finished a full month within every category's limit.",
    criteria: hadMonthFullyUnderBudget,
  },
  {
    id: "comeback",
    name: "Comeback",
    description: "Rebuilt your logging streak after losing it.",
    criteria: (ctx) => hadLoggingComeback(ctx.accountCreatedAt, ctx.today, ctx.transactions, ctx.events),
  },
  {
    id: "no-spend-x10",
    name: "No-Spend Day ×10",
    description: "Checked in 10 no-spend days.",
    criteria: (ctx) => ctx.events.filter((e) => e.type === "noSpendDayCheckIn").length >= 10,
  },
];
