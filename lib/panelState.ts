import type { ConnectionStatus } from "@/types";
import { WINDOW_S } from "@/lib/constants";

/**
 * Display state for a data panel that is gated on the first full coherence
 * window. `connect` whenever the sensor isn't streaming, `warmup` while the
 * 64 s window fills, `live` once a real reading exists.
 */
export type PanelMode = "connect" | "warmup" | "live";

export function panelMode(status: ConnectionStatus, ready: boolean): PanelMode {
  if (status !== "connected") return "connect";
  return ready ? "live" : "warmup";
}

export interface WarmupLabel {
  /** whole seconds until the first reading; floored at 1 so it never reads ~0s */
  remainingS: number;
  /** 0..100, how full the first window is */
  percent: number;
}

/** Turns the 0..1 coherence `progress` into a countdown + percentage. */
export function warmupLabel(progress: number): WarmupLabel {
  const clamped = Math.max(0, Math.min(1, progress));
  return {
    remainingS: Math.max(1, Math.ceil((1 - clamped) * WINDOW_S)),
    percent: Math.round(clamped * 100),
  };
}
