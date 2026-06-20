export interface PacerState {
  phase: number;
  scale: number;
  inhaling: boolean;
}

/** Clock-driven breathing phase. scale: 0 = fully exhaled, 1 = fully inhaled. */
export function pacerState(nowMs: number, periodMs: number): PacerState {
  const phase = (nowMs % periodMs) / periodMs;
  const scale = 0.5 - 0.5 * Math.cos(2 * Math.PI * phase);
  return { phase, scale, inhaling: phase < 0.5 };
}

export function periodMsForPace(paceBpm: number): number {
  return 60000 / paceBpm;
}
