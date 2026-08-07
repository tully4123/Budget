import { Outlet } from "react-router-dom";
import { Buddy } from "./buddy/Buddy";
import { NavBar } from "./NavBar";
import styles from "./AppShell.module.css";

/** Layout route: nav chrome + routed screen content. Onboarding renders
 * outside this shell (no nav until the user has a profile). */
export function AppShell() {
  return (
    <div className={styles.shell}>
      <NavBar />
      <main className={styles.content}>
        <div className={styles.contentInner}>
          <Outlet />
        </div>
      </main>
      <Buddy />
    </div>
  );
}
