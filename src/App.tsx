import { useEffect } from "react";
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

export function App() {
  const isLoaded = useAppStore((s) => s.isLoaded);
  const profile = useAppStore((s) => s.profile);
  const load = useAppStore((s) => s.load);

  useEffect(() => {
    void load();
  }, [load]);

  if (!isLoaded) {
    return <LoadingScreen />;
  }

  return (
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
  );
}
