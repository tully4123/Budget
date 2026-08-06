import type { Points } from "../types/rewards";

export interface LevelInfo {
  level: number;
  name: string;
  threshold: number;
}

/** Cumulative-point thresholds. Not specified numerically by the spec
 * beyond "~10 levels, encouraging names" - chosen to feel achievable
 * early and meaningfully paced later. */
export const LEVELS: readonly LevelInfo[] = [
  { level: 1, name: "Getting Started", threshold: 0 },
  { level: 2, name: "Building Habits", threshold: 100 },
  { level: 3, name: "On Track", threshold: 300 },
  { level: 4, name: "Steady Saver", threshold: 600 },
  { level: 5, name: "Budget Pro", threshold: 1000 },
  { level: 6, name: "Money Minded", threshold: 1500 },
  { level: 7, name: "Financially Fit", threshold: 2500 },
  { level: 8, name: "Wealth Builder", threshold: 4000 },
  { level: 9, name: "Master Planner", threshold: 6000 },
  { level: 10, name: "Financial Guru", threshold: 10000 },
];

export function computeLevel(totalPoints: Points): number {
  let current = LEVELS[0]!.level;
  for (const l of LEVELS) {
    if (totalPoints >= l.threshold) current = l.level;
    else break;
  }
  return current;
}

export function levelInfo(level: number): LevelInfo {
  return LEVELS.find((l) => l.level === level) ?? LEVELS[0]!;
}

export function nextLevelInfo(level: number): LevelInfo | null {
  return LEVELS.find((l) => l.level === level + 1) ?? null;
}
