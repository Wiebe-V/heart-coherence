import { useEffect, useRef, useState, type RefObject } from "react";
import { pacerState, periodMsForPace } from "@/lib/pacer";

/**
 * Drives the breath orb from a single rAF loop. The scale transform is written
 * imperatively to `targetRef` (no React re-render per frame); React state only
 * flips the inhale/exhale label, at most ~2× per breath. When `animate` is
 * false the orb is left static but the label still updates. Never runs on the
 * server.
 */
export function useBreathPacer(
  pace: number,
  animate: boolean,
  targetRef: RefObject<HTMLElement | null>,
): { inhaling: boolean } {
  const [inhaling, setInhaling] = useState(true);
  const prevInhalingRef = useRef(true);

  useEffect(() => {
    if (typeof window === "undefined" || typeof window.requestAnimationFrame !== "function") {
      return;
    }
    const periodMs = periodMsForPace(pace);
    let rafId = 0;

    const frame = (): void => {
      const { scale, inhaling: nextInhaling } = pacerState(performance.now(), periodMs);
      if (animate && targetRef.current) {
        targetRef.current.style.transform = `scale(${0.55 + 0.45 * scale})`;
      }
      if (nextInhaling !== prevInhalingRef.current) {
        prevInhalingRef.current = nextInhaling;
        setInhaling(nextInhaling);
      }
      rafId = window.requestAnimationFrame(frame);
    };

    rafId = window.requestAnimationFrame(frame);
    return () => {
      window.cancelAnimationFrame(rafId);
    };
  }, [pace, animate, targetRef]);

  return { inhaling };
}
