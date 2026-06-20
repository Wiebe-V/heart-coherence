import { describe, it, expect } from "vitest";
import { computeCoherence } from "@/lib/coherence";
import { WINDOW_S } from "@/lib/constants";
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
  it("reports progress (not ready) before the window fills", () => {
    const beats = sineBeats(0.1, 20);
    const r = computeCoherence(beats, 20_000, null);
    expect(r.ready).toBe(false);
    expect(r.progress).toBeGreaterThan(0);
    expect(r.progress).toBeLessThan(1);
  });
  it("pure 0.1 Hz IBI -> HIGH coherence ratio", () => {
    const beats = sineBeats(0.1, WINDOW_S + 10);
    const r = computeCoherence(beats, NOW, null);
    expect(r.ready).toBe(true);
    expect(r.raw).toBeGreaterThan(60);
    expect(r.peakFreqHz).toBeGreaterThan(0.08);
    expect(r.peakFreqHz).toBeLessThan(0.12);
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
    expect(r.raw).toBeLessThan(40);
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
