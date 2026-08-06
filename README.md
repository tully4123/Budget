# Budget

A personal budgeting app: put in your money, set savings and budgeting goals, and see exactly
where it goes. A rule-based planner builds savings plans around your own goals, and streaks/
rewards make sticking to a budget feel motivating instead of punishing.

v1 is a responsive, mobile-first web app that runs entirely client-side with local persistence
(no backend, no account, no sync). It's architected so a backend, auth, and AI-powered advice can
be added later without a rewrite - see [Architecture](#architecture) below.

## Setup

```bash
npm install
npm run dev       # starts the app at http://localhost:5173
```

Other scripts:

```bash
npm run test       # Vitest, once
npm run test:watch # Vitest, watch mode
npm run typecheck  # tsc -b, no emit
npm run lint       # oxlint
npm run build      # typecheck + production build
```

On first run you'll land in onboarding: name, currency, at least one income source, confirm your
categories, and create a first goal - takes under two minutes. After that, everything lives behind
the bottom tab bar (desktop: a left rail instead, at 768px+).

**Nothing here ever leaves your browser.** All data is in `localStorage`, namespaced under
`budget-app:*`. Clearing site data / a different browser / a different device means starting over
- there's no account and nothing to log into.

## Demo mode

Settings → **Load demo data** seeds about three months of realistic activity - income, rent,
groceries, dining, a couple of goals in progress with contributions - so every screen has
something real to show instantly. It runs through the exact same store actions
(`addTransaction`, `addGoal`, `setBudget`, ...) that onboarding and every screen's forms use, so
seeded data is exactly as valid as anything a real user could produce. Rewards, streaks, and
badges are never seeded separately - they're fully derived (see [Rule 4](#rule-4-derived-state)
below), so they emerge naturally from the seeded ledger the same way they would from real use.

**Load demo data** replaces whatever's currently in the app. **Clear all data** wipes everything
and returns you to onboarding.

## Architecture

```
src/
  domain/        pure TypeScript - no React, no store, no Date.now()
    money.ts         Cents (branded), all arithmetic, rounding, parsing/formatting
    dates.ts         LocalDate/MonthKey (branded), all date arithmetic (date-fns)
    analytics.ts     shared trailing-window-average helper
    types/           the whole v1 data model
    budgets/         spent/remaining/pace, daily allowance, month rollover
    goals/           funded amount, pace projection, milestone detection
    streaks/         logging/on-budget/goal streaks (one shared run-length algorithm)
    rewards/         points table, levels, badge catalog, the rewards engine
    planner/         free cash flow, goal allocation, suggested budgets,
                      safe-to-spend, insights - composed behind an Advisor interface
  store/          Zustand store, StorageAdapter + LocalStorageAdapter, hooks
                  (usePlannerResult, useRewardState) that bridge domain -> UI
  ui/
    tokens.css       every visual value in the app - see Design below
    base.css         resets, built only from tokens
    components/      presentational, token-driven, no store access
    screens/         one folder per nav destination; containers that read the
                      store and pass typed props down to components
  lib/            id generation, `today()` (the *only* place allowed to read
                   the system clock outside a component), formatting helpers
  seed/           demo mode's data generator
tests/            mirrors src/domain/ - Vitest, domain logic only (no UI tests in v1)
```

### Engineering rules this codebase holds itself to

- **All money is integer cents.** `Cents` is a branded `number`; there is no float money anywhere.
  Formatting to a currency string happens only at the display edge (`formatCents`, the `<Money>`
  component).
- **Domain logic is pure.** Everything under `src/domain/` is typed pure functions - no side
  effects, no framework, no reading the clock. `today()` (in `src/lib/`, not `src/domain/`) is
  the one function allowed to call `new Date()`, and only the store/UI layer calls it - domain
  functions always receive "today" as a parameter. This is what makes every domain module
  independently unit-testable and keeps the door open to moving logic server-side later without
  touching it.
- **Local calendar dates, not timestamps.** `LocalDate` is a `YYYY-MM-DD` string built entirely on
  local (not UTC) `Date` fields, so a transaction logged at 11pm never rolls onto the wrong day.
  <a name="rule-4-derived-state"></a>
- **Derived state is recomputed, not accumulated.** Budget "spent," a goal's "funded" amount,
  every streak, and reward points/level are never stored - they're computed fresh from the
  transaction ledger (+ the event log, for the no-spend-day check-in) every time they're needed.
  Edit or delete a transaction from six months ago and everything downstream - that month's
  budget status, a goal's progress, a streak that ran through that date, total points - is
  automatically correct on the next render. The one deliberate exception: a badge, once earned,
  stays earned permanently (its `earnedAt` timestamp is real persisted state), even if a later
  ledger edit means its criteria would no longer currently hold.
- **Persistence goes through one interface.** `StorageAdapter` (`load`/`save`/`clear` per
  collection) is the only thing allowed to touch `localStorage` - `LocalStorageAdapter` is v1's
  only implementation. Swapping in an API-backed adapter later is a matter of writing one new
  class, not hunting down scattered `localStorage` calls across the app.
- **The planner sits behind an `Advisor` interface.** `RuleBasedAdvisor` is v1's only
  implementation; every call site depends on `Advisor`, never on the rule-based logic directly.
  A future `AIAdvisor` (LLM-backed) is a drop-in second implementation - no call site changes.

## Design & the Claude Design handoff

Every visual value in the app - every color, size, spacing step, radius, shadow, and motion
duration - is a CSS custom property in **`src/ui/tokens.css`**. Components consume tokens only;
there are no hard-coded hex colors or pixel sizes in component code. Light and dark themes are
both fully defined (automatic via `prefers-color-scheme`, with a `data-theme` attribute override
hook already wired for a future manual toggle).

When the Claude Design direction is ready, applying it should mean **editing `tokens.css`** (and
adding new tokens if the new system needs them) and refining screen compositions - not
restructuring components. If you find yourself needing to touch component internals to apply a
new visual direction, that's a sign the component wasn't built token-clean and should be fixed
rather than worked around.

A few structural things worth knowing before that handoff:

- The nav (`src/ui/components/NavBar.tsx`) is the one piece of layout chrome outside the
  per-screen content area - it already handles the mobile bottom-tab / desktop left-rail switch
  at the `768px` breakpoint via CSS alone (see `NavBar.module.css`).
- The `<Money>` component (`src/ui/components/Money.tsx`) is the only place money is ever
  formatted for display - if the new design wants different number treatment (color rules, sign
  display, weight), it's one file.
- Icons are plain inline SVG components (`src/ui/components/icons.tsx`), deliberately simple
  stroke-based geometry - not tied to any icon library, easy to swap wholesale.

## Testing

Vitest coverage lives entirely under `tests/domain/`, mirroring `src/domain/`'s structure. Highest
priority (per the build spec) and covered: money rounding rules, daily allowance math, streak
qualification and recompute-after-ledger-edit, planner feasibility and priority-waterfall
allocation, milestone detection (exact integer arithmetic, no floating-point edge cases), month
rollover, and a leap-year/DST-boundary date case. UI is not unit-tested in v1 - every milestone
was instead verified by actually driving the running app through a headless browser (Playwright)
and confirming real screenshots, not just that the code compiled.

```bash
npm run test
```

## Out of scope for v1

Bank/Plaid connections, authentication, multi-user, a real backend or sync, push notifications,
currency conversion, LLM integration, actual investing functionality (the Investing tab is a
placeholder - see `src/domain/types/investing.ts` for the stub types a future phase builds on),
native mobile builds.

## Status

All 9 build milestones are complete: scaffold; money/types/persistence; onboarding/transactions;
budgets; goals; the planner engine; streaks/rewards; dashboard/investing-placeholder/demo mode;
polish pass. `npm install && npm run dev` gets you a working app end to end.
