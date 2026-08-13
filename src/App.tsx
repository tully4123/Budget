import { useEffect, useState } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { AppShell } from "./ui/components/AppShell";
import { ErrorBoundary } from "./ui/components/ErrorBoundary";
import { ThemePreview } from "./ui/components/ThemePreview";
import { LoadingScreen } from "./ui/screens/LoadingScreen";
import { DashboardScreen } from "./ui/screens/DashboardScreen";
import { TransactionsScreen } from "./ui/screens/TransactionsScreen";
import { BudgetsScreen } from "./ui/screens/BudgetsScreen";
import { GoalsScreen } from "./ui/screens/GoalsScreen";
import { RewardsScreen } from "./ui/screens/RewardsScreen";
import { InvestingScreen } from "./ui/screens/InvestingScreen";
import { SettingsScreen } from "./ui/screens/SettingsScreen";
import { OnboardingScreen } from "./ui/screens/OnboardingScreen";
import { useAppStore } from "./store/appStore";

/* The store loads near-instantly, so the splash holds a beat past load to
 * let its intro animation read, then cross-fades out over the mounted app. */
const SPLASH_MIN_MS = 1100;
const SPLASH_EXIT_MS = 450;

export function App() {
  const isLoaded = useAppStore((s) => s.isLoaded);
  const profile = useAppStore((s) => s.profile);
  const load = useAppStore((s) => s.load);

  const [splashMinElapsed, setSplashMinElapsed] = useState(false);
  const [splashGone, setSplashGone] = useState(false);
  const splashLeaving = isLoaded && splashMinElapsed;

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    const t = window.setTimeout(() => setSplashMinElapsed(true), SPLASH_MIN_MS);
    return () => window.clearTimeout(t);
  }, []);

  useEffect(() => {
    if (!splashLeaving) return;
    const t = window.setTimeout(() => setSplashGone(true), SPLASH_EXIT_MS);
    return () => window.clearTimeout(t);
  }, [splashLeaving]);

  return (
    <>
      {!splashGone && <LoadingScreen leaving={splashLeaving} />}
      {isLoaded && (
        <ErrorBoundary>
          <ThemePreview />
          <Routes>
            <Route
              path="/onboarding"
              element={profile ? <Navigate to="/dashboard" replace /> : <OnboardingScreen />}
            />
            <Route element={profile ? <AppShell /> : <Navigate to="/onboarding" replace />}>
              <Route path="/" element={<Navigate to="/dashboard" replace />} />
              <Route path="/dashboard" element={<DashboardScreen />} />
              <Route path="/transactions" element={<TransactionsScreen />} />
              <Route path="/budgets" element={<BudgetsScreen />} />
              <Route path="/goals" element={<GoalsScreen />} />
              <Route path="/rewards" element={<RewardsScreen />} />
              <Route path="/investing" element={<InvestingScreen />} />
              <Route path="/settings" element={<SettingsScreen />} />
              <Route path="*" element={<Navigate to="/dashboard" replace />} />
            </Route>
          </Routes>
        </ErrorBoundary>
      )}
    </>
  );
}
