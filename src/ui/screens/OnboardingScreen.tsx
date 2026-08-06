import { ScreenHeader } from "../components/ScreenHeader";
import styles from "./OnboardingScreen.module.css";

/** Renders outside AppShell - no nav chrome until a profile exists. */
export function OnboardingScreen() {
  return (
    <div className={styles.wrap}>
      <ScreenHeader
        title="Welcome to Budget"
        subtitle="Let's get your profile, income, and first goal set up - under 2 minutes."
      />
      <p>Onboarding flow arrives in Milestone 3.</p>
    </div>
  );
}
