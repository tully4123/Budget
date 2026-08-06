import { useEffect, useMemo } from "react";
import { RuleBasedAdvisor } from "../domain/planner/planner";
import type { PlannerResult } from "../domain/planner/types";
import { today } from "../lib/today";
import { useAppStore } from "./appStore";

const advisor = new RuleBasedAdvisor();

/** Computes the current PlannerResult from live store state (cheap enough
 * to recompute on every relevant change at this data scale) and mirrors
 * it into the store's cached plannerSnapshot, so it's available instantly
 * on the next load per the PlannerSnapshot data-model design. Returns
 * null before onboarding (no profile yet). */
export function usePlannerResult(): PlannerResult | null {
  const profile = useAppStore((s) => s.profile);
  const incomeSources = useAppStore((s) => s.incomeSources);
  const categories = useAppStore((s) => s.categories);
  const transactions = useAppStore((s) => s.transactions);
  const budgets = useAppStore((s) => s.budgets);
  const goals = useAppStore((s) => s.goals);
  const setPlannerSnapshot = useAppStore((s) => s.setPlannerSnapshot);

  const result = useMemo(() => {
    if (!profile) return null;
    return advisor.getPlan({ profile, incomeSources, categories, transactions, budgets, goals, today: today() });
  }, [profile, incomeSources, categories, transactions, budgets, goals]);

  useEffect(() => {
    if (result) setPlannerSnapshot(result);
  }, [result, setPlannerSnapshot]);

  return result;
}
