import { describe, it, expect, vi, afterEach } from "vitest";
import { simulatedIbiAt, SimulatedSource, BleHeartRateSource } from "@/lib/source";
import { reset, getBeats } from "@/lib/beatBuffer";

afterEach(() => {
  reset();
  vi.useRealTimers();
});

describe("simulatedIbiAt", () => {
  it("oscillates around mean by amplitude", () => {
    expect(simulatedIbiAt(0)).toBeCloseTo(850, 6);     // sin(0)=0
    expect(simulatedIbiAt(2500)).toBeCloseTo(910, 6);  // 0.1Hz -> quarter period at 2.5s -> sin=1 -> +60
    expect(simulatedIbiAt(7500)).toBeCloseTo(790, 6);  // 3/4 period -> sin=-1 -> -60
  });

  it("accepts custom params", () => {
    expect(simulatedIbiAt(0, 1000, 100, 0.1)).toBeCloseTo(1000, 6);
    expect(simulatedIbiAt(2500, 1000, 100, 0.1)).toBeCloseTo(1100, 6);
  });
});

describe("SimulatedSource", () => {
  it("has simulator mode and feeds beats into the buffer", async () => {
    vi.useFakeTimers();
    // Spy on performance.now so it advances with fake time
    let perfTime = 0;
    vi.spyOn(performance, "now").mockImplementation(() => perfTime);

    const src = new SimulatedSource();
    expect(src.mode).toBe("simulator");

    await src.start();
    // Advance time by 3000ms — should produce ~3 beats (IBIs ~850ms)
    perfTime = 3000;
    vi.advanceTimersByTime(3000);
    src.stop();

    expect(getBeats().length).toBeGreaterThan(0);
  });
});

describe("BleHeartRateSource", () => {
  it("has ble mode", () => {
    const src = new BleHeartRateSource();
    expect(src.mode).toBe("ble");
  });

  it("rejects when navigator.bluetooth is unavailable (node has none)", async () => {
    // node has no `navigator.bluetooth`, so start() must reject before any GATT work.
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
