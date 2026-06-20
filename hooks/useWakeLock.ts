import { useEffect } from "react";

/**
 * Holds a screen wake lock while `active` is true so the display doesn't sleep
 * mid-session. The browser auto-releases the lock when the tab is hidden, so we
 * re-acquire on visibilitychange. Feature-detected — a silent no-op where the
 * Wake Lock API (or `navigator`) is unavailable, or if the request is rejected.
 */
export function useWakeLock(active: boolean): void {
  useEffect(() => {
    if (!active) return;
    if (typeof navigator === "undefined" || !("wakeLock" in navigator)) return;

    let sentinel: WakeLockSentinel | null = null;
    let cancelled = false;

    const request = async (): Promise<void> => {
      try {
        const next = await navigator.wakeLock.request("screen");
        if (cancelled) {
          void next.release();
          return;
        }
        sentinel = next;
      } catch {
        // NotAllowedError (tab not visible, denied, etc.) — ignore.
      }
    };

    const onVisibility = (): void => {
      if (document.visibilityState === "visible") void request();
    };

    void request();
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      cancelled = true;
      document.removeEventListener("visibilitychange", onVisibility);
      if (sentinel) {
        void sentinel.release();
        sentinel = null;
      }
    };
  }, [active]);
}
