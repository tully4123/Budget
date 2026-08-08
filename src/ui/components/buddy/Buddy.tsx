import { useEffect, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import { useAppStore } from "../../../store/appStore";
import { Button } from "../Button";
import { BuddyIcon, XIcon } from "../icons";
import { tipForRoute } from "./tips";
import styles from "./Buddy.module.css";

/** Always-on floating helper: a small avatar that shows a short, contextual
 * tip for whatever screen you're on. Tips can be dismissed (per id, so they
 * don't nag again) but the avatar stays clickable to reopen the same
 * message on demand - see Settings' "Show tips again" to reset. */
export function Buddy() {
  const location = useLocation();
  const dismissedTips = useAppStore((s) => s.dismissedTips);
  const dismissTip = useAppStore((s) => s.dismissTip);
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  const tip = tipForRoute(location.pathname);
  const isUnseen = tip !== null && !dismissedTips.includes(tip.id);

  useEffect(() => {
    setOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    if (!open) return;
    function onPointerDown(e: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  function handleGotIt() {
    if (tip) dismissTip(tip.id);
    setOpen(false);
  }

  return (
    <div className={styles.wrap} ref={wrapRef}>
      {open && (
        <div className={styles.bubble} role="dialog" aria-label="Tip">
          <div className={styles.bubbleHeader}>
            <span className={styles.bubbleTitle}>Tip</span>
            <button
              type="button"
              className={styles.closeButton}
              aria-label="Close tip"
              onClick={() => setOpen(false)}
            >
              <XIcon width={14} height={14} />
            </button>
          </div>
          <p className={styles.bubbleMessage}>
            {tip ? tip.message : "You're all caught up on tips here - check other screens for more."}
          </p>
          {tip && (
            <div className={styles.bubbleActions}>
              <Button variant="ghost" small onClick={handleGotIt}>
                Got it
              </Button>
            </div>
          )}
        </div>
      )}
      <button
        type="button"
        className={styles.avatarButton}
        aria-label={open ? "Close tips" : "Open tips"}
        onClick={() => setOpen((o) => !o)}
      >
        <BuddyIcon width={26} height={26} />
        {isUnseen && !open && <span className={styles.badge} aria-hidden="true" />}
      </button>
    </div>
  );
}
