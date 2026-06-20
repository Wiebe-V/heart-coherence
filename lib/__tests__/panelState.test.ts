import { describe, it, expect } from "vitest";
import { panelMode, warmupLabel } from "@/lib/panelState";

describe("panelMode", () => {
  it("returns 'connect' whenever the sensor is not connected", () => {
    expect(panelMode("idle", false)).toBe("connect");
    expect(panelMode("requesting", false)).toBe("connect");
    expect(panelMode("connecting", false)).toBe("connect");
    expect(panelMode("disconnected", true)).toBe("connect");
    expect(panelMode("error", true)).toBe("connect");
    expect(panelMode("unsupported", false)).toBe("connect");
    expect(panelMode("no-rr", false)).toBe("connect");
  });

  it("returns 'warmup' when connected but the first window isn't ready", () => {
    expect(panelMode("connected", false)).toBe("warmup");
  });

  it("returns 'live' when connected and ready", () => {
    expect(panelMode("connected", true)).toBe("live");
  });
});

describe("warmupLabel", () => {
  it("reports a full 64s window remaining at zero progress", () => {
    expect(warmupLabel(0)).toEqual({ remainingS: 64, percent: 0 });
  });

  it("reports half the window remaining at 50% progress", () => {
    expect(warmupLabel(0.5)).toEqual({ remainingS: 32, percent: 50 });
  });

  it("rounds remaining seconds up so it never shows ~0s mid-fill", () => {
    expect(warmupLabel(0.99)).toEqual({ remainingS: 1, percent: 99 });
  });

  it("floors remaining at 1s and caps percent at 100 when complete", () => {
    expect(warmupLabel(1)).toEqual({ remainingS: 1, percent: 100 });
  });

  it("clamps out-of-range progress", () => {
    expect(warmupLabel(-0.5)).toEqual({ remainingS: 64, percent: 0 });
    expect(warmupLabel(1.5)).toEqual({ remainingS: 1, percent: 100 });
  });
});
