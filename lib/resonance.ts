import { PACE } from "@/lib/constants";
import type { ResonanceStep, ResonanceResult } from "@/types";

/** Inclusive pace sweep, rounded to 0.1 to avoid float drift. */
export function resonancePaces(
  min: number = PACE.min,
  max: number = PACE.max,
  step: number = PACE.step,
): number[] {
  const out: number[] = [];
  for (let p = min; p <= max + 1e-9; p += step) out.push(Math.round(p * 10) / 10);
  return out;
}

/** Pace with the highest sustained avg coherence; ties resolve to the first. */
export function bestPace(steps: ResonanceStep[]): number {
  const first = steps[0];
  if (first === undefined) return PACE.default;
  let best = first;
  for (const s of steps) if (s.avgCoherence > best.avgCoherence) best = s;
  return best.paceBpm;
}

export function summarizeResonance(steps: ResonanceStep[]): ResonanceResult {
  return { steps, bestPaceBpm: bestPace(steps) };
}
