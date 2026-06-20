import { describe, it, expect } from "vitest";
import { resonancePaces, bestPace, summarizeResonance } from "@/lib/resonance";
import { PACE } from "@/lib/constants";
import type { ResonanceStep } from "@/types";

const step = (paceBpm: number, avgCoherence: number, samples = 100): ResonanceStep => ({
  paceBpm,
  avgCoherence,
  samples,
});

describe("resonancePaces", () => {
  it("sweeps the default range inclusively with clean 0.1-rounded values", () => {
    expect(resonancePaces()).toEqual([4.5, 5, 5.5, 6, 6.5, 7]);
  });

  it("has no float drift (no values like 5.000001)", () => {
    for (const p of resonancePaces()) {
      expect(p).toBe(Math.round(p * 10) / 10);
    }
  });

  it("honors a custom min/max/step", () => {
    expect(resonancePaces(5, 6, 0.5)).toEqual([5, 5.5, 6]);
  });
});

describe("bestPace", () => {
  it("picks the pace with the highest average coherence", () => {
    const steps = [step(4.5, 30), step(5.5, 70), step(6, 50)];
    expect(bestPace(steps)).toBe(5.5);
  });

  it("resolves ties to the first occurrence", () => {
    const steps = [step(5, 60), step(6, 60), step(7, 60)];
    expect(bestPace(steps)).toBe(5);
  });

  it("returns the default pace for an empty list", () => {
    expect(bestPace([])).toBe(PACE.default);
  });
});

describe("summarizeResonance", () => {
  it("wraps the steps and the winning pace", () => {
    const steps = [step(5, 40), step(6, 80), step(7, 55)];
    expect(summarizeResonance(steps)).toEqual({ steps, bestPaceBpm: 6 });
  });

  it("uses the default pace when there are no steps", () => {
    expect(summarizeResonance([])).toEqual({ steps: [], bestPaceBpm: PACE.default });
  });
});
