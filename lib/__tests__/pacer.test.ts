import { describe, it, expect } from "vitest";
import { pacerState, periodMsForPace } from "@/lib/pacer";

describe("pacerState", () => {
  it("is fully exhaled and inhaling at the start of the cycle", () => {
    const s = pacerState(0, 10000);
    expect(s.phase).toBeCloseTo(0, 10);
    expect(s.scale).toBeCloseTo(0, 10);
    expect(s.inhaling).toBe(true);
  });

  it("is fully inhaled and exhaling at the half cycle", () => {
    const s = pacerState(5000, 10000);
    expect(s.phase).toBeCloseTo(0.5, 10);
    expect(s.scale).toBeCloseTo(1, 10);
    expect(s.inhaling).toBe(false);
  });

  it("keeps scale within [0, 1] across a full sweep", () => {
    const period = 10000;
    for (let i = 0; i <= 100; i++) {
      const { scale } = pacerState((i / 100) * period, period);
      expect(scale).toBeGreaterThanOrEqual(0);
      expect(scale).toBeLessThanOrEqual(1);
    }
  });

  it("does not drift: phase is identical after whole-period offsets", () => {
    const period = 10000;
    for (const t of [0, 1234, 5000, 7777, 9999]) {
      const a = pacerState(t, period).phase;
      const b = pacerState(t + 600000, period).phase; // +60 whole periods
      expect(b).toBeCloseTo(a, 9);
    }
  });
});

describe("periodMsForPace", () => {
  it("converts breaths-per-minute into a period in ms", () => {
    expect(periodMsForPace(6)).toBeCloseTo(10000, 10); // 6 bpm -> 10 s
    expect(periodMsForPace(5)).toBeCloseTo(12000, 10);
    expect(periodMsForPace(4.5)).toBeCloseTo(60000 / 4.5, 10);
  });
});
