import { Navigate, Route, Routes } from "react-router-dom";
import { AppShell } from "./ui/components/AppShell";
import { DashboardScreen } from "./ui/screens/DashboardScreen";
import { TransactionsScreen } from "./ui/screens/TransactionsScreen";
import { BudgetsScreen } from "./ui/screens/BudgetsScreen";
import { GoalsScreen } from "./ui/screens/GoalsScreen";
import { RewardsScreen } from "./ui/screens/RewardsScreen";
import { InvestingScreen } from "./ui/screens/InvestingScreen";
import { SettingsScreen } from "./ui/screens/SettingsScreen";
import { OnboardingScreen } from "./ui/screens/OnboardingScreen";

export function App() {
  return (
    <Routes>
      <Route path="/onboarding" element={<OnboardingScreen />} />
      <Route element={<AppShell />}>
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
  );
}
