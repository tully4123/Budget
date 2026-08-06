import { loggedDaysSet } from "../../../domain/streaks/streaks";
import { today } from "../../../lib/today";
import { useAppStore } from "../../../store/appStore";
import { Button } from "../../components/Button";
import { CheckIcon } from "../../components/icons";
import styles from "./Transactions.module.css";

/** Nothing to log today? This is the logging streak's alternative to a
 * transaction - a lightweight event, not a $0 transaction. */
export function NoSpendCheckIn() {
  const events = useAppStore((s) => s.events);
  const transactions = useAppStore((s) => s.transactions);
  const addNoSpendDayCheckIn = useAppStore((s) => s.addNoSpendDayCheckIn);

  const loggedToday = loggedDaysSet(transactions, events).has(today());

  if (loggedToday) {
    return (
      <p className={styles.checkedInRow}>
        <CheckIcon width={14} height={14} /> Today's logged - streak's safe.
      </p>
    );
  }

  return (
    <div className={styles.checkInButtonRow}>
      <Button variant="secondary" small onClick={() => addNoSpendDayCheckIn(today())}>
        Nothing to log today? Check in a no-spend day
      </Button>
    </div>
  );
}
