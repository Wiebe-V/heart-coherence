import type { Beat } from "@/types";

export function buildGrid(startMs: number, fs: number, n: number): Float64Array {
  const step = 1000 / fs;
  const g = new Float64Array(n);
  for (let i = 0; i < n; i++) g[i] = startMs + i * step;
  return g;
}

export function resampleIBI(beats: Beat[], startMs: number, fs: number, n: number): Float64Array {
  const out = new Float64Array(n);
  const step = 1000 / fs;
  if (beats.length === 0) return out;
  let j = 0; // monotone cursor: grid times only increase, so j never rewinds
  for (let i = 0; i < n; i++) {
    const tg = startMs + i * step;
    // Hold-first / hold-last for grid points outside the beat range.
    if (tg <= beats[0]!.t) { out[i] = beats[0]!.ibi; continue; }
    const last = beats[beats.length - 1]!;
    if (tg >= last.t) { out[i] = last.ibi; continue; }
    while (j < beats.length - 1 && beats[j + 1]!.t <= tg) j++;
    const a = beats[j]!, b = beats[j + 1]!;
    const frac = (tg - a.t) / (b.t - a.t);
    out[i] = a.ibi + frac * (b.ibi - a.ibi);
  }
  return out;
}
