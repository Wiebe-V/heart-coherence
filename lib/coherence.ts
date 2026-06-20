import { fft } from "@/lib/fft";
import { resampleIBI } from "@/lib/resample";
import { zoneFor } from "@/lib/zones";
import {
  FS, N, WINDOW_S, PEAK_BAND, TOTAL_BAND, PEAK_HALF_WIDTH_HZ, EMA_ALPHA,
  DEFAULT_ZONE_THRESHOLDS,
} from "@/lib/constants";
import type { Beat, CoherenceResult, ZoneThresholds } from "@/types";

const WINDOW_MS = WINDOW_S * 1000;
const BIN_HZ = FS / N;

function emptyResult(progress: number): CoherenceResult {
  return { ready: false, progress, score: 0, raw: 0, peakFreqHz: 0, zone: "scattered" };
}

/**
 * HeartMath-style spectral coherence over the most recent WINDOW_S of beats.
 * `beats` must carry at least the full window of history (the caller's ring
 * buffer keeps BEAT_BUFFER_S > WINDOW_S); otherwise `progress` saturates to 1
 * before enough signal exists. `now` is on the same timeline as `beat.t`.
 */
export function computeCoherence(
  beats: Beat[],
  now: number,
  prevScore: number | null,
  thresholds: ZoneThresholds = DEFAULT_ZONE_THRESHOLDS,
): CoherenceResult {
  if (beats.length < 2) return emptyResult(0);
  const first = beats[0]!;
  const span = now - first.t;
  if (span < WINDOW_MS) {
    return emptyResult(Math.max(0, Math.min(1, span / WINDOW_MS)));
  }

  const start = now - WINDOW_MS;
  const x = resampleIBI(beats, start, FS, N);

  let mean = 0;
  for (let i = 0; i < N; i++) mean += x[i]!;
  mean /= N;

  const re = new Float64Array(N);
  const im = new Float64Array(N);
  for (let i = 0; i < N; i++) {
    const w = 0.5 * (1 - Math.cos((2 * Math.PI * i) / (N - 1)));
    re[i] = (x[i]! - mean) * w;
  }

  fft(re, im);

  const half = N / 2;
  const power = new Float64Array(half + 1);
  for (let k = 0; k <= half; k++) power[k] = re[k]! ** 2 + im[k]! ** 2;
  const freq = (k: number) => k * BIN_HZ;

  let peakK = -1, peakVal = -1;
  for (let k = 0; k <= half; k++) {
    const f = freq(k);
    if (f < PEAK_BAND.lo || f > PEAK_BAND.hi) continue;
    if (power[k]! > peakVal) { peakVal = power[k]!; peakK = k; }
  }
  // Unreachable with FS=4/N=256 (PEAK_BAND always contains bins), but guards
  // against a degenerate band config rather than indexing power[-1].
  if (peakK < 0) {
    return { ready: true, progress: 1, score: prevScore ?? 0, raw: 0, peakFreqHz: 0, zone: "scattered" };
  }
  const peakF = freq(peakK);

  // PEAK_HALF_WIDTH_HZ (0.015) < BIN_HZ (0.015625), so this captures exactly the
  // peak bin at the current FS/N. Raising N would widen the capture — by design,
  // it's a frequency window, not a fixed bin count.
  let peakPower = 0;
  for (let k = 0; k <= half; k++) {
    if (Math.abs(freq(k) - peakF) <= PEAK_HALF_WIDTH_HZ) peakPower += power[k]!;
  }

  let totalPower = 0;
  for (let k = 0; k <= half; k++) {
    const f = freq(k);
    if (f >= TOTAL_BAND.lo && f <= TOTAL_BAND.hi) totalPower += power[k]!;
  }

  const raw = totalPower > 0 ? (peakPower / totalPower) * 100 : 0;
  const score = prevScore === null ? raw : (1 - EMA_ALPHA) * prevScore + EMA_ALPHA * raw;

  return { ready: true, progress: 1, score, raw, peakFreqHz: peakF, zone: zoneFor(score, thresholds) };
}
