import { useSyncExternalStore } from "react";

const QUERY = "(prefers-reduced-motion: reduce)";

function subscribe(onChange: () => void): () => void {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
    return () => {};
  }
  const mql = window.matchMedia(QUERY);
  mql.addEventListener("change", onChange);
  return () => {
    mql.removeEventListener("change", onChange);
  };
}

function getSnapshot(): boolean {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
    return false;
  }
  return window.matchMedia(QUERY).matches;
}

function getServerSnapshot(): boolean {
  return false;
}

/**
 * Resolved reduced-motion preference. `override` wins when non-null; otherwise
 * follows the system setting. Uses useSyncExternalStore so reads happen during
 * render (no cascading setState-in-effect) while staying SSR-safe — the server
 * snapshot and first client render are both `false`.
 */
export function useReducedMotion(override: boolean | null): boolean {
  const systemPref = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  return override ?? systemPref;
}
