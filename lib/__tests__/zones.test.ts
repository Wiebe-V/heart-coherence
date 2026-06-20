import { describe, it, expect } from "vitest";
import { zoneFor } from "@/lib/zones";
import { DEFAULT_ZONE_THRESHOLDS } from "@/lib/constants";

const T = DEFAULT_ZONE_THRESHOLDS; // {building:40, coherent:65}

describe("zoneFor", () => {
  it("classifies scattered/building/coherent", () => {
    expect(zoneFor(30, T)).toBe("scattered");
    expect(zoneFor(50, T)).toBe("building");
    expect(zoneFor(80, T)).toBe("coherent");
  });
  it("boundaries are inclusive at thresholds", () => {
    expect(zoneFor(40, T)).toBe("building");
    expect(zoneFor(65, T)).toBe("coherent");
    expect(zoneFor(39.999, T)).toBe("scattered");
  });
});
