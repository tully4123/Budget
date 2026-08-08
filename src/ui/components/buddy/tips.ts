/** Contextual tip copy for the floating Buddy helper, keyed by route. Plain
 * content data - no React, no store - so it's trivial to extend as screens
 * change. General app-usage guidance only; never a source for financial
 * facts (see CLAUDE.md's no-fabrication rule). */
export interface Tip {
  id: string;
  route: string;
  message: string;
}

export const TIPS: Tip[] = [
  {
    id: "dashboard",
    route: "/dashboard",
    message:
      "This is your at-a-glance view. Tap into the Weekly Plan below to adjust how your money splits across rent, savings, spending, and more.",
  },
  {
    id: "transactions",
    route: "/transactions",
    message:
      "Log spending here as it happens - the more consistent you are, the more accurate today's \"safe to spend\" number gets.",
  },
  {
    id: "budgets",
    route: "/budgets",
    message:
      "Set a monthly limit per category and I'll track your pace against it automatically, including whether you're running ahead or behind.",
  },
  {
    id: "goals",
    route: "/goals",
    message:
      "Create a goal and contribute to it from any transaction - I'll track progress and project when you'll hit your target.",
  },
  {
    id: "rewards",
    route: "/rewards",
    message: "Keep logging spending and staying on budget to build streaks and level up.",
  },
  {
    id: "investing",
    route: "/investing",
    message: "This section's a placeholder for now - investing tools are coming in a future update.",
  },
  {
    id: "settings",
    route: "/settings",
    message:
      "Add your income sources here, or load demo data if you just want to explore the app with sample numbers first.",
  },
];

export function tipForRoute(pathname: string): Tip | null {
  return TIPS.find((t) => pathname.startsWith(t.route)) ?? null;
}
