import { COHERENCE_HISTORY_S } from "@/lib/constants";
import type { CoherenceZone } from "@/types";

export interface CoherenceSample {
  /** performance.now() timeline ms */
  t: number;
  score: number;
  zone: CoherenceZone;
}

let samples: CoherenceSample[] = [];
const listeners = new Set<() => void>();

export function pushSample(score: number, zone: CoherenceZone, now: number): void {
  samples.push({ t: now, score, zone });
  const cutoff = now - COHERENCE_HISTORY_S * 1000;
  if (samples.length && samples[0]!.t < cutoff) {
    samples = samples.filter((s) => s.t >= cutoff);
  }
  listeners.forEach((l) => l());
}

export function getSamples(): CoherenceSample[] {
  return samples;
}

export function reset(): void {
  samples = [];
  listeners.forEach((l) => l());
}

export function subscribe(fn: () => void): () => void {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}
