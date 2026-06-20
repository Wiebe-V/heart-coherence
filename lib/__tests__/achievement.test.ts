import { describe, it, expect } from "vitest";
import { zonePoints, goalReached } from "@/lib/achievement";

describe("zonePoints", () => {
  it("scattered is worth 0", () => {
    expect(zonePoints("scattered")).toBe(0);
  });

  it("building is worth 1", () => {
    expect(zonePoints("building")).toBe(1);
  });

  it("coherent is worth 2", () => {
    expect(zonePoints("coherent")).toBe(2);
  });
});

describe("goalReached", () => {
  it("is false below the goal", () => {
    expect(goalReached(299, 300)).toBe(false);
  });

  it("is true exactly at the goal", () => {
    expect(goalReached(300, 300)).toBe(true);
  });

  it("is true above the goal", () => {
    expect(goalReached(301, 300)).toBe(true);
  });
});
