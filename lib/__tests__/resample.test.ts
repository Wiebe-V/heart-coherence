import { describe, it, expect } from "vitest";
import { buildGrid, resampleIBI } from "@/lib/resample";
import type { Beat } from "@/types";

const FS = 4, N = 256;
function beat(t: number, ibi: number): Beat { return { t, ibi, hr: 60000 / ibi }; }

describe("buildGrid", () => {
  it("produces exactly N evenly spaced timestamps at 1/FS spacing", () => {
    const g = buildGrid(1000, FS, N);
    expect(g.length).toBe(N);
    expect(g[0]).toBe(1000);
    for (let i = 1; i < N; i++) expect(g[i]! - g[i - 1]!).toBeCloseTo(250, 9);
    expect(g[N - 1]).toBeCloseTo(1000 + 255 * 250, 6);
  });
});

describe("resampleIBI", () => {
  it("returns exactly N samples", () => {
    const beats = Array.from({ length: 100 }, (_, i) => beat(i * 800, 800));
    expect(resampleIBI(beats, 0, FS, N).length).toBe(N);
  });
  it("linearly interpolates between bracketing beats", () => {
    const beats = [beat(0, 800), beat(1000, 1000)];
    const out = resampleIBI(beats, 0, FS, N);
    expect(out[0]).toBeCloseTo(800, 6);
    expect(out[2]).toBeCloseTo(900, 6);
    expect(out[4]).toBeCloseTo(1000, 6);
    expect(out[10]).toBeCloseTo(1000, 6);
  });
});
