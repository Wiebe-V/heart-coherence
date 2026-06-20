import { describe, it, expect, beforeEach } from "vitest";
import { useTrainerStore, INITIAL_COHERENCE, INITIAL_ZONE_SECONDS } from "@/lib/store";
import { PACE } from "@/lib/constants";

function resetStore() {
  useTrainerStore.setState({
    connection: { status: "idle" },
    hr: null,
    coherence: INITIAL_COHERENCE,
    pace: PACE.default,
    isPacing: false,
    zoneSeconds: INITIAL_ZONE_SECONDS,
  });
}

describe("useTrainerStore", () => {
  beforeEach(() => {
    resetStore();
  });

  it("has correct initial state", () => {
    const s = useTrainerStore.getState();
    expect(s.connection).toEqual({ status: "idle" });
    expect(s.hr).toBeNull();
    expect(s.coherence.ready).toBe(false);
    expect(s.pace).toBe(PACE.default);
    expect(s.isPacing).toBe(false);
    expect(s.zoneSeconds).toEqual({ scattered: 0, building: 0, coherent: 0 });
  });

  it("setConnection updates connection", () => {
    useTrainerStore.getState().setConnection({ status: "connected", deviceName: "Polar H10" });
    expect(useTrainerStore.getState().connection).toEqual({
      status: "connected",
      deviceName: "Polar H10",
    });
  });

  it("setHr updates hr", () => {
    useTrainerStore.getState().setHr(70);
    expect(useTrainerStore.getState().hr).toBe(70);
  });

  it("setCoherence updates coherence", () => {
    const c = {
      ready: true, progress: 1, score: 75, raw: 72, peakFreqHz: 0.1,
      zone: "coherent" as const, spectrum: [],
    };
    useTrainerStore.getState().setCoherence(c);
    expect(useTrainerStore.getState().coherence).toEqual(c);
  });

  it("setPace updates pace", () => {
    useTrainerStore.getState().setPace(5);
    expect(useTrainerStore.getState().pace).toBe(5);
  });

  it("setPacing updates isPacing", () => {
    useTrainerStore.getState().setPacing(true);
    expect(useTrainerStore.getState().isPacing).toBe(true);
  });

  it("bumpZoneSecond increments the specified zone", () => {
    useTrainerStore.getState().bumpZoneSecond("coherent");
    useTrainerStore.getState().bumpZoneSecond("coherent");
    useTrainerStore.getState().bumpZoneSecond("building");
    const s = useTrainerStore.getState();
    expect(s.zoneSeconds.coherent).toBe(2);
    expect(s.zoneSeconds.building).toBe(1);
    expect(s.zoneSeconds.scattered).toBe(0);
  });

  it("resetSignal clears hr, coherence.ready, and zoneSeconds", () => {
    useTrainerStore.getState().setHr(72);
    useTrainerStore.getState().setCoherence({
      ready: true, progress: 1, score: 80, raw: 78, peakFreqHz: 0.1,
      zone: "coherent", spectrum: [],
    });
    useTrainerStore.getState().bumpZoneSecond("coherent");
    useTrainerStore.getState().resetSignal();
    const s = useTrainerStore.getState();
    expect(s.hr).toBeNull();
    expect(s.coherence.ready).toBe(false);
    expect(s.zoneSeconds).toEqual({ scattered: 0, building: 0, coherent: 0 });
  });
});
