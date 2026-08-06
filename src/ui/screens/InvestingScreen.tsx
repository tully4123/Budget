import { FlagIcon, TrendingUpIcon, WalletIcon } from "../components/icons";
import { ScreenHeader } from "../components/ScreenHeader";
import styles from "./investing/Investing.module.css";

/** No functionality, no fake data - the Holding/Portfolio types (see
 * domain/types/investing.ts) are wired into the data model already so a
 * future phase can build on them without a migration. */
export function InvestingScreen() {
  return (
    <>
      <ScreenHeader title="Investing" />
      <div className={styles.wrap}>
        <div className={styles.iconDot}>
          <TrendingUpIcon width={32} height={32} />
        </div>
        <div className={styles.title}>Coming in a future phase</div>
        <p className={styles.body}>
          Once your budgeting and savings habits are dialed in, Investing will help put spare cash to
          work - right from the same app.
        </p>
        <div className={styles.featureList}>
          <div className={styles.featureRow}>
            <span className={styles.featureIcon}>
              <WalletIcon width={16} height={16} />
            </span>
            <div>
              <div className={styles.featureTitle}>Portfolio tracking</div>
              <div className={styles.featureBody}>See your holdings and performance alongside your budget.</div>
            </div>
          </div>
          <div className={styles.featureRow}>
            <span className={styles.featureIcon}>
              <FlagIcon width={16} height={16} />
            </span>
            <div>
              <div className={styles.featureTitle}>Goal-linked investing</div>
              <div className={styles.featureBody}>
                Point a long-term goal at an investment account instead of a savings one.
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
