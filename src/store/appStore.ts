import { create } from "zustand";
import { createId } from "../lib/id";
import { today } from "../lib/today";
import type {
  Budget,
  Category,
  EarnedBadge,
  Goal,
  IncomeSource,
  PlannerSnapshot,
  Transaction,
  UserProfile,
} from "../domain/types";
import { COLLECTIONS } from "./StorageAdapter";
import { LocalStorageAdapter } from "./LocalStorageAdapter";
import type { StorageAdapter } from "./StorageAdapter";

const adapter: StorageAdapter = new LocalStorageAdapter();

function nowIso(): string {
  return new Date().toISOString();
}

export interface AppState {
  /** False until the initial load from storage has completed - screens
   * should show a loading state rather than treat empty as "no data yet". */
  isLoaded: boolean;
  profile: UserProfile | null;
  incomeSources: IncomeSource[];
  categories: Category[];
  transactions: Transaction[];
  budgets: Budget[];
  goals: Goal[];
  earnedBadges: EarnedBadge[];
  plannerSnapshot: PlannerSnapshot | null;
}

export interface AppActions {
  load: () => Promise<void>;

  setProfile: (profile: UserProfile) => void;

  addIncomeSource: (draft: Omit<IncomeSource, "id">) => IncomeSource;
  updateIncomeSource: (id: string, patch: Partial<Omit<IncomeSource, "id">>) => void;
  removeIncomeSource: (id: string) => void;

  setCategories: (categories: Category[]) => void;
  addCategory: (draft: Omit<Category, "id" | "isArchived">) => Category;
  updateCategory: (id: string, patch: Partial<Omit<Category, "id">>) => void;
  archiveCategory: (id: string) => void;

  addTransaction: (
    draft: Omit<Transaction, "id" | "createdAt" | "updatedAt">,
  ) => Transaction;
  updateTransaction: (
    id: string,
    patch: Partial<Omit<Transaction, "id" | "createdAt" | "updatedAt">>,
  ) => void;
  deleteTransaction: (id: string) => void;

  /** Upserts by (categoryId, month) - at most one budget per category per
   * month, per the data model. */
  setBudget: (draft: Omit<Budget, "id">) => Budget;
  removeBudget: (id: string) => void;

  addGoal: (draft: Omit<Goal, "id" | "createdAt">) => Goal;
  updateGoal: (id: string, patch: Partial<Omit<Goal, "id" | "createdAt">>) => void;
  deleteGoal: (id: string) => void;

  /** The rewards engine computes the full merged badge list (existing +
   * any newly earned) and writes it back here in one call. */
  setEarnedBadges: (badges: EarnedBadge[]) => void;

  setPlannerSnapshot: (snapshot: PlannerSnapshot) => void;

  /** Wipes every collection - used by demo mode's "clear" and account reset. */
  resetAll: () => Promise<void>;
}

export type AppStore = AppState & AppActions;

const initialState: AppState = {
  isLoaded: false,
  profile: null,
  incomeSources: [],
  categories: [],
  transactions: [],
  budgets: [],
  goals: [],
  earnedBadges: [],
  plannerSnapshot: null,
};

export const useAppStore = create<AppStore>((set, get) => ({
  ...initialState,

  load: async () => {
    const [
      profile,
      incomeSources,
      categories,
      transactions,
      budgets,
      goals,
      earnedBadges,
      plannerSnapshot,
    ] = await Promise.all([
      adapter.load<UserProfile>(COLLECTIONS.profile),
      adapter.load<IncomeSource[]>(COLLECTIONS.incomeSources),
      adapter.load<Category[]>(COLLECTIONS.categories),
      adapter.load<Transaction[]>(COLLECTIONS.transactions),
      adapter.load<Budget[]>(COLLECTIONS.budgets),
      adapter.load<Goal[]>(COLLECTIONS.goals),
      adapter.load<EarnedBadge[]>(COLLECTIONS.earnedBadges),
      adapter.load<PlannerSnapshot>(COLLECTIONS.plannerSnapshot),
    ]);
    set({
      isLoaded: true,
      profile: profile ?? null,
      incomeSources: incomeSources ?? [],
      categories: categories ?? [],
      transactions: transactions ?? [],
      budgets: budgets ?? [],
      goals: goals ?? [],
      earnedBadges: earnedBadges ?? [],
      plannerSnapshot: plannerSnapshot ?? null,
    });
  },

  setProfile: (profile) => {
    set({ profile });
    void adapter.save(COLLECTIONS.profile, profile);
  },

  addIncomeSource: (draft) => {
    const source: IncomeSource = { ...draft, id: createId() };
    const incomeSources = [...get().incomeSources, source];
    set({ incomeSources });
    void adapter.save(COLLECTIONS.incomeSources, incomeSources);
    return source;
  },
  updateIncomeSource: (id, patch) => {
    const incomeSources = get().incomeSources.map((s) =>
      s.id === id ? { ...s, ...patch } : s,
    );
    set({ incomeSources });
    void adapter.save(COLLECTIONS.incomeSources, incomeSources);
  },
  removeIncomeSource: (id) => {
    const incomeSources = get().incomeSources.filter((s) => s.id !== id);
    set({ incomeSources });
    void adapter.save(COLLECTIONS.incomeSources, incomeSources);
  },

  setCategories: (categories) => {
    set({ categories });
    void adapter.save(COLLECTIONS.categories, categories);
  },
  addCategory: (draft) => {
    const category: Category = { ...draft, id: createId(), isArchived: false };
    const categories = [...get().categories, category];
    set({ categories });
    void adapter.save(COLLECTIONS.categories, categories);
    return category;
  },
  updateCategory: (id, patch) => {
    const categories = get().categories.map((c) => (c.id === id ? { ...c, ...patch } : c));
    set({ categories });
    void adapter.save(COLLECTIONS.categories, categories);
  },
  archiveCategory: (id) => {
    const categories = get().categories.map((c) =>
      c.id === id ? { ...c, isArchived: true } : c,
    );
    set({ categories });
    void adapter.save(COLLECTIONS.categories, categories);
  },

  addTransaction: (draft) => {
    const ts = nowIso();
    const transaction: Transaction = { ...draft, id: createId(), createdAt: ts, updatedAt: ts };
    const transactions = [...get().transactions, transaction];
    set({ transactions });
    void adapter.save(COLLECTIONS.transactions, transactions);
    return transaction;
  },
  updateTransaction: (id, patch) => {
    const transactions = get().transactions.map((t) =>
      t.id === id ? { ...t, ...patch, updatedAt: nowIso() } : t,
    );
    set({ transactions });
    void adapter.save(COLLECTIONS.transactions, transactions);
  },
  deleteTransaction: (id) => {
    const transactions = get().transactions.filter((t) => t.id !== id);
    set({ transactions });
    void adapter.save(COLLECTIONS.transactions, transactions);
  },

  setBudget: (draft) => {
    const existing = get().budgets.find(
      (b) => b.categoryId === draft.categoryId && b.month === draft.month,
    );
    const budget: Budget = existing
      ? { ...existing, limitCents: draft.limitCents }
      : { ...draft, id: createId() };
    const budgets = existing
      ? get().budgets.map((b) => (b.id === budget.id ? budget : b))
      : [...get().budgets, budget];
    set({ budgets });
    void adapter.save(COLLECTIONS.budgets, budgets);
    return budget;
  },
  removeBudget: (id) => {
    const budgets = get().budgets.filter((b) => b.id !== id);
    set({ budgets });
    void adapter.save(COLLECTIONS.budgets, budgets);
  },

  addGoal: (draft) => {
    const goal: Goal = { ...draft, id: createId(), createdAt: today() };
    const goals = [...get().goals, goal];
    set({ goals });
    void adapter.save(COLLECTIONS.goals, goals);
    return goal;
  },
  updateGoal: (id, patch) => {
    const goals = get().goals.map((g) => (g.id === id ? { ...g, ...patch } : g));
    set({ goals });
    void adapter.save(COLLECTIONS.goals, goals);
  },
  deleteGoal: (id) => {
    const goals = get().goals.filter((g) => g.id !== id);
    set({ goals });
    void adapter.save(COLLECTIONS.goals, goals);
  },

  setEarnedBadges: (badges) => {
    set({ earnedBadges: badges });
    void adapter.save(COLLECTIONS.earnedBadges, badges);
  },

  setPlannerSnapshot: (snapshot) => {
    set({ plannerSnapshot: snapshot });
    void adapter.save(COLLECTIONS.plannerSnapshot, snapshot);
  },

  resetAll: async () => {
    await Promise.all(Object.values(COLLECTIONS).map((c) => adapter.clear(c)));
    set({ ...initialState, isLoaded: true });
  },
}));
