import type { ThemePref } from "@/types";
import { SETTINGS_KEY } from "@/lib/constants";

export type ResolvedTheme = "light" | "dark";

const LIGHT_QUERY = "(prefers-color-scheme: light)";

/**
 * Fired on <window> whenever the resolved theme changes, so imperative
 * consumers (canvas charts that cache CSS-variable colors) can re-read.
 */
export const THEME_CHANGE_EVENT = "coherence:themechange";

/**
 * Resolve a stored preference to a concrete theme. A non-null preference wins;
 * otherwise we follow the system. SSR (no window) resolves to "dark", matching
 * the server-rendered default on <html> so the first paint never mismatches.
 */
export function resolveTheme(pref: ThemePref): ResolvedTheme {
  if (pref === "light" || pref === "dark") return pref;
  if (typeof window !== "undefined" && typeof window.matchMedia === "function") {
    return window.matchMedia(LIGHT_QUERY).matches ? "light" : "dark";
  }
  return "dark";
}

/**
 * Apply the resolved theme to <html> and notify imperative consumers. No-op on
 * SSR. The boot script (see themeBootScript) does the same before first paint;
 * this keeps things in sync for runtime changes (drawer, system shift).
 */
export function applyTheme(pref: ThemePref): void {
  if (typeof document === "undefined") return;
  const resolved = resolveTheme(pref);
  const el = document.documentElement;
  el.setAttribute("data-theme", resolved);
  el.style.colorScheme = resolved;
  window.dispatchEvent(new Event(THEME_CHANGE_EVENT));
}

/**
 * Inline <head> script (as a string) that reads the persisted preference and
 * sets data-theme/color-scheme on <html> synchronously during HTML parsing —
 * before the browser paints — so there is no flash of the wrong theme. Mirrors
 * resolveTheme; the try/catch covers unavailable localStorage.
 */
export function themeBootScript(): string {
  const key = JSON.stringify(SETTINGS_KEY);
  return `(function(){try{var r=localStorage.getItem(${key});var p=r?JSON.parse(r).theme:null;var t=(p==="light"||p==="dark")?p:(window.matchMedia&&window.matchMedia(${JSON.stringify(LIGHT_QUERY)}).matches?"light":"dark");var e=document.documentElement;e.setAttribute("data-theme",t);e.style.colorScheme=t;}catch(_){}})();`;
}
