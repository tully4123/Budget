import styles from "./LoadingScreen.module.css";

interface LoadingScreenProps {
  /** Plays the fade-out; the app is already mounted underneath. */
  leaving?: boolean;
}

/** Branded splash shown while the store loads, and briefly after so the
 * intro animation reads before cross-fading into the app. */
export function LoadingScreen({ leaving = false }: LoadingScreenProps) {
  return (
    <div
      className={leaving ? `${styles.wrap} ${styles.leaving}` : styles.wrap}
      aria-hidden={leaving}
    >
      <div className={styles.mark}>
        <div className={styles.ring} />
        <div className={styles.coin}>$</div>
      </div>
      <div className={styles.name}>Budget</div>
      <div className={styles.dots} role="status" aria-label="Loading">
        <span className={styles.dot} />
        <span className={styles.dot} />
        <span className={styles.dot} />
      </div>
    </div>
  );
}
