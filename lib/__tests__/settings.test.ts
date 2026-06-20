import { describe, it, expect } from "vitest";
import { mergeSettings } from "@/lib/settings";
import { DEFAULT_SETTINGS, PACE, DEFAULT_ZONE_THRESHOLDS } from "@/lib/constants";

describe("mergeSettings", () => {
  it("empty object returns DEFAULT_SETTINGS", () => {
    expect(mergeSettings({})).toEqual(DEFAULT_SETTINGS);
  });

  it("null/undefined-like partial returns DEFAULT_SETTINGS", () => {
    expect(mergeSettings({})).toEqual(DEFAULT_SETTINGS);
  });

  it("pace 99 is clamped to PACE.max", () => {
    const s = mergeSettings({ pace: 99 });
    expect(s.pace).toBe(PACE.max);
  });

  it("pace 1 is clamped to PACE.min", () => {
    const s = mergeSettings({ pace: 1 });
    expect(s.pace).toBe(PACE.min);
  });

  it("pace 'abc' string falls back to default", () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const s = mergeSettings({ pace: "abc" as any });
    expect(s.pace).toBe(DEFAULT_SETTINGS.pace);
  });

  it("pace NaN falls back to default", () => {
    const s = mergeSettings({ pace: NaN });
    expect(s.pace).toBe(DEFAULT_SETTINGS.pace);
  });

  it("thresholds where building >= coherent falls back to defaults", () => {
    const s = mergeSettings({ zoneThresholds: { building: 70, coherent: 50 } });
    expect(s.zoneThresholds).toEqual(DEFAULT_ZONE_THRESHOLDS);
  });

  it("thresholds where building === coherent falls back to defaults", () => {
    const s = mergeSettings({ zoneThresholds: { building: 50, coherent: 50 } });
    expect(s.zoneThresholds).toEqual(DEFAULT_ZONE_THRESHOLDS);
  });

  it("valid zoneThresholds are preserved", () => {
    const s = mergeSettings({ zoneThresholds: { building: 30, coherent: 60 } });
    expect(s.zoneThresholds).toEqual({ building: 30, coherent: 60 });
  });

  it("thresholds with non-finite value falls back to defaults", () => {
    const s = mergeSettings({ zoneThresholds: { building: NaN, coherent: 60 } });
    expect(s.zoneThresholds).toEqual(DEFAULT_ZONE_THRESHOLDS);
  });

  it("resonanceIntervalS non-positive falls back to default", () => {
    const s = mergeSettings({ resonanceIntervalS: 0 });
    expect(s.resonanceIntervalS).toBe(DEFAULT_SETTINGS.resonanceIntervalS);
  });

  it("resonanceIntervalS negative falls back to default", () => {
    const s = mergeSettings({ resonanceIntervalS: -10 });
    expect(s.resonanceIntervalS).toBe(DEFAULT_SETTINGS.resonanceIntervalS);
  });

  it("valid resonanceIntervalS preserved", () => {
    const s = mergeSettings({ resonanceIntervalS: 90 });
    expect(s.resonanceIntervalS).toBe(90);
  });

  it("reducedMotionOverride: true is preserved", () => {
    const s = mergeSettings({ reducedMotionOverride: true });
    expect(s.reducedMotionOverride).toBe(true);
  });

  it("reducedMotionOverride: false is preserved", () => {
    const s = mergeSettings({ reducedMotionOverride: false });
    expect(s.reducedMotionOverride).toBe(false);
  });

  it("reducedMotionOverride: null is preserved", () => {
    const s = mergeSettings({ reducedMotionOverride: null });
    expect(s.reducedMotionOverride).toBeNull();
  });

  it("reducedMotionOverride: junk value falls back to null", () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const s = mergeSettings({ reducedMotionOverride: "yes" as any });
    expect(s.reducedMotionOverride).toBeNull();
  });

  it("valid pace within range is preserved exactly", () => {
    const s = mergeSettings({ pace: 5.5 });
    expect(s.pace).toBe(5.5);
  });
});
