import type { CoherenceZone, Settings, ZoneThresholds } from "@/types";

export const FS = 4; // Hz resample grid
export const N = 256; // FFT length
export const WINDOW_S = N / FS; // 64 s
export const BEAT_BUFFER_S = 130; // prune beats older than this
export const COHERENCE_HISTORY_S = 180; // prune coherence samples older than this (3 min)

export const PEAK_BAND = { lo: 0.04, hi: 0.26 } as const; // peak search range
export const TOTAL_BAND = { lo: 0.04, hi: 0.4 } as const; // total-power range
export const SPECTRUM_BAND = { lo: 0.04, hi: 0.4 } as const; // display band for spectrum chart
export const PEAK_HALF_WIDTH_HZ = 0.015; // ± around peak for peak power
export const EMA_ALPHA = 0.2; // display = 0.8*prev + 0.2*new

export const DEFAULT_ZONE_THRESHOLDS: ZoneThresholds = {
  building: 40,
  coherent: 65,
};

export const PACE = { min: 4.5, max: 7, step: 0.5, default: 6 } as const;

export const RESONANCE_INTERVAL_S = 120; // hold per pace
export const RESONANCE_SETTLE_S = 20; // ignore first N s of each step when averaging

// Web Bluetooth GATT
export const HR_SERVICE = "heart_rate"; // 0x180D
export const HR_MEASUREMENT = "heart_rate_measurement"; // 0x2A37

export const DEFAULT_SETTINGS: Settings = {
  pace: PACE.default,
  zoneThresholds: DEFAULT_ZONE_THRESHOLDS,
  resonanceIntervalS: RESONANCE_INTERVAL_S,
  reducedMotionOverride: null,
};

export const SETTINGS_KEY = "coherence.settings.v1";

/** Maps a coherence zone to the CSS custom property holding its color. */
export const ZONE_VAR: Record<CoherenceZone, string> = {
  scattered: "var(--zone-scattered)",
  building: "var(--zone-building)",
  coherent: "var(--zone-coherent)",
};
