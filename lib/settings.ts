import type { Settings, ThemePref } from "@/types";
import { DEFAULT_SETTINGS, PACE, SETTINGS_KEY, DEFAULT_ZONE_THRESHOLDS } from "@/lib/constants";

/**
 * Pure merge/validate: no window access. Start from DEFAULT_SETTINGS, overlay
 * valid fields from `partial`. Invalid values fall back to defaults.
 */
export function mergeSettings(partial: Partial<Settings>): Settings {
  // pace
  let pace = DEFAULT_SETTINGS.pace;
  if (typeof partial.pace === "number" && isFinite(partial.pace)) {
    pace = Math.min(PACE.max, Math.max(PACE.min, partial.pace));
  }

  // zoneThresholds
  let zoneThresholds = DEFAULT_ZONE_THRESHOLDS;
  const pt = partial.zoneThresholds;
  if (pt !== undefined) {
    const building = pt.building;
    const coherent = pt.coherent;
    if (
      typeof building === "number" &&
      isFinite(building) &&
      typeof coherent === "number" &&
      isFinite(coherent) &&
      building < coherent
    ) {
      zoneThresholds = { building, coherent };
    }
  }

  // resonanceIntervalS
  let resonanceIntervalS = DEFAULT_SETTINGS.resonanceIntervalS;
  if (
    typeof partial.resonanceIntervalS === "number" &&
    isFinite(partial.resonanceIntervalS) &&
    partial.resonanceIntervalS > 0
  ) {
    resonanceIntervalS = partial.resonanceIntervalS;
  }

  // reducedMotionOverride: only true | false | null are valid
  let reducedMotionOverride: boolean | null = null;
  const rmo = partial.reducedMotionOverride;
  if (rmo === true || rmo === false || rmo === null) {
    reducedMotionOverride = rmo;
  }

  // achievementGoal
  let achievementGoal = DEFAULT_SETTINGS.achievementGoal;
  if (
    typeof partial.achievementGoal === "number" &&
    isFinite(partial.achievementGoal) &&
    partial.achievementGoal > 0
  ) {
    achievementGoal = partial.achievementGoal;
  }

  // theme: only "light" | "dark" | null are valid
  let theme: ThemePref = DEFAULT_SETTINGS.theme;
  const th = partial.theme;
  if (th === "light" || th === "dark" || th === null) {
    theme = th;
  }

  return { pace, zoneThresholds, resonanceIntervalS, reducedMotionOverride, achievementGoal, theme };
}

/**
 * Load settings from localStorage. Returns DEFAULT_SETTINGS on SSR or any error.
 */
export function loadSettings(): Settings {
  if (typeof window === "undefined") {
    return DEFAULT_SETTINGS;
  }
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (raw === null) return DEFAULT_SETTINGS;
    const parsed = JSON.parse(raw) as Partial<Settings>;
    return mergeSettings(parsed);
  } catch {
    return DEFAULT_SETTINGS;
  }
}

/**
 * Persist settings to localStorage. No-ops on SSR or quota errors.
 */
export function saveSettings(s: Settings): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(s));
  } catch {
    // ignore QuotaExceededError and similar
  }
}
