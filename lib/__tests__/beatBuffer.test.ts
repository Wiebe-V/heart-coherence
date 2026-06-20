import { describe, it, expect, beforeEach } from "vitest";
import { pushRR, getBeats, nowOnTimeline, reset, subscribe } from "@/lib/beatBuffer";
import { BEAT_BUFFER_S } from "@/lib/constants";

beforeEach(() => reset());

describe("beatBuffer", () => {
  it("seeds first beat from nowPerf, then accumulates by ibi", () => {
    pushRR([800, 800], 10_000);
    const b = getBeats();
    expect(b.map((x) => x.t)).toEqual([10_000, 10_800]);
    expect(b[0]!.hr).toBeCloseTo(75, 4); // 60000/800
    pushRR([800], 999_999); // later nowPerf ignored for seeding
    expect(getBeats().map((x) => x.t)).toEqual([10_000, 10_800, 11_600]);
    expect(nowOnTimeline()).toBe(11_600);
  });

  it("prunes beats older than BEAT_BUFFER_S behind the latest", () => {
    pushRR([1000], 0); // t=0
    const many = Array.from({ length: BEAT_BUFFER_S + 10 }, () => 1000); // +1s each
    pushRR(many, 0);
    const b = getBeats();
    const latest = nowOnTimeline();
    expect(b[0]!.t).toBeGreaterThanOrEqual(latest - BEAT_BUFFER_S * 1000);
  });

  it("notifies subscribers and unsubscribe stops notifications", () => {
    let n = 0;
    const unsub = subscribe(() => { n++; });
    pushRR([800], 0);
    expect(n).toBe(1);
    unsub();
    pushRR([800], 0);
    expect(n).toBe(1); // no further increment after unsubscribe
  });

  it("reset clears beats and notifies subscribers", () => {
    pushRR([800], 0);
    let notified = false;
    const unsub = subscribe(() => { notified = true; });
    reset();
    expect(getBeats()).toHaveLength(0);
    expect(nowOnTimeline()).toBe(0);
    expect(notified).toBe(true);
    unsub();
  });
});
