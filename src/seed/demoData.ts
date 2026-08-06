import { createDefaultCategories, findSystemCategory } from "../domain/defaultCategories";
import { addDays, addMonths, isSameOrBefore, localDate, monthKey, type LocalDate } from "../domain/dates";
import { cents } from "../domain/money";
import { createId } from "../lib/id";
import type { AppStore } from "../store/appStore";

/**
 * Seeds ~3 months of realistic activity so every screen is reviewable
 * instantly. Goes entirely through the normal store actions (the same
 * ones onboarding/Transactions/Budgets/Goals use) rather than writing
 * data directly - so seeded data is exactly as valid as anything a real
 * user could produce, and rewards/streaks/badges derive from it
 * naturally with no separate "fake" reward seeding needed.
 */
export function seedDemoData(store: AppStore, today: LocalDate = localDate(new Date().toISOString().slice(0, 10))): void {
  const accountCreatedAt = addMonths(today, -3);

  store.setProfile({
    id: createId(),
    displayName: "Demo User",
    currency: "USD",
    payFrequency: "monthly",
    createdAt: accountCreatedAt,
  });

  const categories = createDefaultCategories(createId);
  store.setCategories(categories);
  const byName = new Map(categories.map((c) => [c.name, c]));
  const housing = byName.get("Housing")!;
  const groceries = byName.get("Groceries")!;
  const transport = byName.get("Transport")!;
  const dining = byName.get("Dining")!;
  const entertainment = byName.get("Entertainment")!;
  const subscriptions = byName.get("Subscriptions")!;
  const health = byName.get("Health")!;
  const misc = byName.get("Misc")!;
  const incomeCategory = findSystemCategory(categories, "income");
  const savingsCategory = findSystemCategory(categories, "savings");

  store.addIncomeSource({
    name: "Paycheck",
    amountCents: cents(520000),
    frequency: "monthly",
    nextDate: addMonths(today, 1),
  });

  const emergencyFund = store.addGoal({
    name: "Emergency Fund",
    iconKey: "flag",
    targetCents: cents(500000),
    targetDate: addMonths(today, 6),
    priority: "high",
    status: "active",
  });
  const vacation = store.addGoal({
    name: "Vacation",
    iconKey: "flag",
    targetCents: cents(200000),
    targetDate: addMonths(today, 4),
    priority: "medium",
    status: "active",
  });

  // Budgets for the last two months, including the current one.
  const limits: Array<[typeof housing, number]> = [
    [housing, 150000],
    [groceries, 60000],
    [transport, 20000],
    [dining, 15000],
    [entertainment, 8000],
    [subscriptions, 5000],
    [health, 10000],
    [misc, 8000],
  ];
  for (const monthOffset of [-1, 0]) {
    const month = monthKey(addMonths(today, monthOffset));
    for (const [category, limit] of limits) {
      store.setBudget({ categoryId: category.id, month, limitCents: cents(limit) });
    }
  }

  // Walk every day from account creation to today, logging a believable
  // pattern of income, recurring bills, and everyday spending.
  let day = accountCreatedAt;
  let dayIndex = 0;
  while (isSameOrBefore(day, today)) {
    // Monthly income deposit and rent, on day 1 of each month.
    if (day.endsWith("-01")) {
      store.addTransaction({
        type: "income",
        amountCents: cents(520000),
        categoryId: incomeCategory.id,
        date: day,
        note: "Paycheck",
      });
      store.addTransaction({
        type: "expense",
        amountCents: cents(145000),
        categoryId: housing.id,
        date: day,
        note: "Rent",
      });
      store.addTransaction({
        type: "expense",
        amountCents: cents(4500),
        categoryId: subscriptions.id,
        date: day,
        note: "Streaming + apps",
      });
    }

    // Groceries roughly every 5 days.
    if (dayIndex % 5 === 0) {
      store.addTransaction({
        type: "expense",
        amountCents: cents(6000 + (dayIndex % 3) * 1500),
        categoryId: groceries.id,
        date: day,
        note: "Groceries",
      });
    }

    // Dining out a couple of times a week.
    if (dayIndex % 3 === 1) {
      store.addTransaction({
        type: "expense",
        amountCents: cents(2200 + (dayIndex % 4) * 800),
        categoryId: dining.id,
        date: day,
        note: "Dinner out",
      });
    }

    // Transport most weekdays.
    if (dayIndex % 7 < 5) {
      store.addTransaction({
        type: "expense",
        amountCents: cents(650),
        categoryId: transport.id,
        date: day,
        note: "Transit",
      });
    }

    // Entertainment weekly.
    if (dayIndex % 7 === 5) {
      store.addTransaction({
        type: "expense",
        amountCents: cents(3500),
        categoryId: entertainment.id,
        date: day,
        note: "Movie night",
      });
    }

    // Occasional misc/health spend.
    if (dayIndex % 11 === 0) {
      store.addTransaction({
        type: "expense",
        amountCents: cents(2500),
        categoryId: misc.id,
        date: day,
        note: "Odds and ends",
      });
    }
    if (dayIndex % 17 === 0) {
      store.addTransaction({
        type: "expense",
        amountCents: cents(4000),
        categoryId: health.id,
        date: day,
        note: "Pharmacy",
      });
    }

    // Goal contributions roughly every two weeks, alternating goals.
    if (dayIndex % 14 === 3) {
      store.addTransaction({
        type: "goalContribution",
        amountCents: cents(15000),
        categoryId: savingsCategory.id,
        goalId: emergencyFund.id,
        date: day,
        note: "Emergency Fund contribution",
      });
    }
    if (dayIndex % 14 === 10) {
      store.addTransaction({
        type: "goalContribution",
        amountCents: cents(8000),
        categoryId: savingsCategory.id,
        goalId: vacation.id,
        date: day,
        note: "Vacation contribution",
      });
    }

    day = addDays(day, 1);
    dayIndex += 1;
  }
}

/** Demo mode's "clear" - just resetAll, same as a real account reset,
 * so re-entering demo mode (or onboarding fresh) always starts clean. */
export function clearDemoData(store: Pick<AppStore, "resetAll">): Promise<void> {
  return store.resetAll();
}
