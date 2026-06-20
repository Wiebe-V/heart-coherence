import { describe, it, expect } from "vitest";
import { computeCoherence } from "@/lib/coherence";
import { WINDOW_S, FS, N, SPECTRUM_BAND } from "@/lib/constants";
import type { Beat } from "@/types";

function sineBeats(freqHz: number, durationS: number, meanIbi = 850, amp = 60): Beat[] {
  const beats: Beat[] = [];
  let t = 0;
  while (t < durationS * 1000) {
    const ibi = meanIbi + amp * Math.sin(2 * Math.PI * freqHz * (t / 1000));
    beats.push({ t, ibi, hr: 60000 / ibi });
    t += ibi;
  }
  return beats;
}
const NOW = (WINDOW_S + 5) * 1000;

describe("computeCoherence", () => {
  it("zero or one beat -> not ready, progress 0", () => {
    expect(computeCoherence([], 0, null).ready).toBe(false);
    const one = sineBeats(0.1, 1)[0]!;
    expect(computeCoherence([one], 0, null).progress).toBe(0);
  });
  it("reports progress (not ready) before the window fills", () => {
    const beats = sineBeats(0.1, 20);
    const r = computeCoherence(beats, 20_000, null);
    expect(r.ready).toBe(false);
    expect(r.progress).toBeGreaterThan(0);
    expect(r.progress).toBeLessThan(1);
  });
  it("pure 0.1 Hz IBI -> high coherence with dominant peak near 0.1 Hz", () => {
    const beats = sineBeats(0.1, WINDOW_S + 10);
    const r = computeCoherence(beats, NOW, null);
    expect(r.ready).toBe(true);
    // 6 bpm = 0.1 Hz lands mid-bin (bin 6.4; bin width FS/N = 0.015625 Hz), so the
    // signal energy splits across bins 6 and 7 while the spec's ±0.015 Hz peak
    // window captures a single bin -> ~54. Unambiguously "high" vs the ~10 of noise.
    expect(r.raw).toBeGreaterThan(50);
    expect(r.peakFreqHz).toBeGreaterThan(0.08);
    expect(r.peakFreqHz).toBeLessThan(0.12);
  });
  it("a bin-aligned resonance sine reaches the coherent zone (raw > 65)", () => {
    // 7 * (FS/N) = 0.109375 Hz lands exactly on an FFT bin -> no leakage penalty.
    const beats = sineBeats(7 * (FS / N), WINDOW_S + 10);
    const r = computeCoherence(beats, NOW, null);
    expect(r.raw).toBeGreaterThan(65);
  });
  it("white-noise IBI -> LOW coherence ratio", () => {
    const beats: Beat[] = [];
    let t = 0, seed = 12345;
    for (let i = 0; i < 800; i++) {
      seed = (seed * 1103515245 + 12345) & 0x7fffffff;
      const ibi = 850 + ((seed % 200) - 100);
      beats.push({ t, ibi, hr: 60000 / ibi });
      t += ibi;
    }
    const r = computeCoherence(beats, NOW, null);
    expect(r.raw).toBeLessThan(25);
  });
  it("flat IBI -> no NaN, finite score (no divide-by-zero)", () => {
    const beats: Beat[] = [];
    for (let t = 0; t < (WINDOW_S + 10) * 1000; t += 850) beats.push({ t, ibi: 850, hr: 60000 / 850 });
    const r = computeCoherence(beats, NOW, null);
    expect(Number.isFinite(r.raw)).toBe(true);
    expect(Number.isFinite(r.score)).toBe(true);
  });
  it("EMA: display = 0.8*prev + 0.2*new", () => {
    const beats = sineBeats(0.1, WINDOW_S + 10);
    const r = computeCoherence(beats, NOW, 0);
    expect(r.score).toBeCloseTo(0.2 * r.raw, 6);
  });
});

const BIN_HZ = FS / N; // 0.015625

describe("computeCoherence spectrum", () => {
  it("returns empty spectrum when not ready", () => {
    const r = computeCoherence([], 0, null);
    expect(r.spectrum).toEqual([]);
  });

  it("returns non-empty spectrum within SPECTRUM_BAND when ready", () => {
    const beats = sineBeats(0.1, WINDOW_S + 10);
    const r = computeCoherence(beats, NOW, null);
    expect(r.ready).toBe(true);
    expect(r.spectrum.length).toBeGreaterThan(0);
    for (const bin of r.spectrum) {
      expect(bin.freqHz).toBeGreaterThanOrEqual(SPECTRUM_BAND.lo - 0.001);
      expect(bin.freqHz).toBeLessThanOrEqual(SPECTRUM_BAND.hi + 0.001);
      expect(bin.power).toBeGreaterThanOrEqual(0);
    }
  });

  it("max-power bin in spectrum is at peakFreqHz (within one bin)", () => {
    const beats = sineBeats(0.1, WINDOW_S + 10);
    const r = computeCoherence(beats, NOW, null);
    expect(r.ready).toBe(true);
    const maxBin = r.spectrum.reduce((a, b) => (a.power > b.power ? a : b));
    expect(Math.abs(maxBin.freqHz - r.peakFreqHz)).toBeLessThanOrEqual(BIN_HZ + 0.001);
  });
});
