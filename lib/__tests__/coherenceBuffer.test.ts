import { describe, it, expect, beforeEach } from "vitest";
import { pushSample, getSamples, reset, subscribe } from "@/lib/coherenceBuffer";
import { COHERENCE_HISTORY_S } from "@/lib/constants";

beforeEach(() => reset());

describe("coherenceBuffer", () => {
  it("pushSample appends entries in order", () => {
    pushSample(50, "building", 1000);
    pushSample(60, "coherent", 2000);
    const s = getSamples();
    expect(s).toHaveLength(2);
    expect(s[0]!.score).toBe(50);
    expect(s[0]!.zone).toBe("building");
    expect(s[1]!.score).toBe(60);
  });

  it("prunes samples older than COHERENCE_HISTORY_S behind the latest push", () => {
    pushSample(50, "building", 0);       // will be pruned
    pushSample(60, "coherent", 1000);    // will be pruned
    const nowLater = COHERENCE_HISTORY_S * 1000 + 2000; // 182_000
    pushSample(70, "scattered", nowLater);
    // cutoff = 182000 - 180000 = 2000; t=0 and t=1000 both < 2000 → pruned
    const s = getSamples();
    expect(s).toHaveLength(1);
    expect(s[0]!.score).toBe(70);
  });

  it("reset clears buffer and notifies subscribers", () => {
    pushSample(50, "building", 0);
    let notified = false;
    const unsub = subscribe(() => { notified = true; });
    reset();
    expect(getSamples()).toHaveLength(0);
    expect(notified).toBe(true);
    unsub();
  });

  it("subscribe fires on push; unsubscribe stops notifications", () => {
    let n = 0;
    const unsub = subscribe(() => { n++; });
    pushSample(50, "building", 0);
    expect(n).toBe(1);
    unsub();
    pushSample(60, "coherent", 100);
    expect(n).toBe(1); // no further increment
  });

  it("getSamples returns the live array (reference, not a copy)", () => {
    pushSample(42, "scattered", 0);
    const ref1 = getSamples();
    const ref2 = getSamples();
    expect(ref1).toBe(ref2);
  });
});
