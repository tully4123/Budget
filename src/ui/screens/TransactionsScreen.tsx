import { useState } from "react";
import type { Transaction } from "../../domain/types";
import { ScreenHeader } from "../components/ScreenHeader";
import { NoSpendCheckIn } from "./transactions/NoSpendCheckIn";
import { TransactionForm } from "./transactions/TransactionForm";
import { TransactionList } from "./transactions/TransactionList";

export function TransactionsScreen() {
  const [editing, setEditing] = useState<Transaction | null>(null);

  return (
    <>
      <ScreenHeader title="Activity" subtitle="Log spending fast, and see where it all went." />
      <TransactionForm
        key={editing?.id ?? "new"}
        editing={editing ?? undefined}
        onDone={() => setEditing(null)}
      />
      <NoSpendCheckIn />
      <TransactionList onEdit={setEditing} />
    </>
  );
}
