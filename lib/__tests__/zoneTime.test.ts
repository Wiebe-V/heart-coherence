import { describe, it, expect } from "vitest";
import { zoneProportions } from "@/lib/zoneTime";

describe("zoneProportions", () => {
  it("proportions are correct and sum to 1 when data is present", () => {
    const p = zoneProportions({ scattered: 30, building: 20, coherent: 10 });
    expect(p.scattered).toBeCloseTo(0.5, 6);
    expect(p.building).toBeCloseTo(1 / 3, 5);
    expect(p.coherent).toBeCloseTo(1 / 6, 5);
    expect(p.scattered + p.building + p.coherent).toBeCloseTo(1, 10);
  });

  it("all-zero case returns all zeros without divide-by-zero", () => {
    const p = zoneProportions({ scattered: 0, building: 0, coherent: 0 });
    expect(p.scattered).toBe(0);
    expect(p.building).toBe(0);
    expect(p.coherent).toBe(0);
  });

  it("single non-zero zone gets proportion 1", () => {
    const p = zoneProportions({ scattered: 0, building: 60, coherent: 0 });
    expect(p.building).toBe(1);
    expect(p.scattered).toBe(0);
    expect(p.coherent).toBe(0);
  });
});
