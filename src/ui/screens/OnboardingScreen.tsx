import { OnboardingWizard } from "./onboarding/OnboardingWizard";

/** Renders outside AppShell - no nav chrome until a profile exists. */
export function OnboardingScreen() {
  return <OnboardingWizard />;
}
