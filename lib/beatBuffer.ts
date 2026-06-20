import { BEAT_BUFFER_S } from "@/lib/constants";
import type { Beat } from "@/types";

let beats: Beat[] = [];
let lastT: number | null = null; // cumulative timeline cursor (ms)
const listeners = new Set<() => void>();

/** Append RR intervals (ms). First-ever beat seeds the timeline from `nowPerf`. */
export function pushRR(rrMs: number[], nowPerf: number): void {
  for (const ibi of rrMs) {
    if (lastT === null) lastT = nowPerf;
    else lastT += ibi;
    beats.push({ t: lastT, ibi, hr: 60000 / ibi });
  }
  const cutoff = (lastT ?? 0) - BEAT_BUFFER_S * 1000;
  if (beats.length && beats[0]!.t < cutoff) beats = beats.filter((b) => b.t >= cutoff);
  listeners.forEach((l) => l());
}

/** The live buffer (do NOT mutate). Readers iterate it directly. */
export function getBeats(): Beat[] {
  return beats;
}

/** Latest cumulative timestamp; use as `now` for the coherence metric. */
export function nowOnTimeline(): number {
  return lastT ?? 0;
}

export function reset(): void {
  beats = [];
  lastT = null;
  listeners.forEach((l) => l());
}

export function subscribe(fn: () => void): () => void {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}
