import { describe, it, expect } from "vitest";
import { BleHeartRateSource } from "@/lib/source";

describe("BleHeartRateSource", () => {
  it("rejects when navigator.bluetooth is unavailable (node has none)", async () => {
    expect(typeof navigator === "undefined" || !navigator.bluetooth).toBe(true);
    const src = new BleHeartRateSource();
    await expect(src.start()).rejects.toThrow(/Web Bluetooth is not available/);
  });

  it("stop is idempotent and does not throw", () => {
    const src = new BleHeartRateSource();
    expect(() => src.stop()).not.toThrow();
    expect(() => src.stop()).not.toThrow();
  });
});
