import { Component, type ErrorInfo, type ReactNode } from "react";
import { Button } from "./Button";
import styles from "./ErrorBoundary.module.css";

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  error: Error | null;
}

/** Catches render crashes anywhere below it and shows a recoverable
 * screen instead of a blank white page. Local data is untouched - "Try
 * again" just re-renders; nothing here can lose the user's ledger. */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  override state: ErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error };
  }

  override componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error("Unhandled error in the app tree:", error, info.componentStack);
  }

  override render() {
    if (this.state.error) {
      return (
        <div className={styles.wrap}>
          <div className={styles.title}>Something went wrong</div>
          <p className={styles.body}>
            This screen hit an unexpected error. Your data is stored locally and hasn't been
            touched - reloading usually fixes it.
          </p>
          <p className={styles.detail}>{this.state.error.message}</p>
          <Button onClick={() => this.setState({ error: null })}>Try again</Button>
        </div>
      );
    }
    return this.props.children;
  }
}
