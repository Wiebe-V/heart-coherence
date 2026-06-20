import { describe, it, expect, beforeEach } from "vitest";
import { useTrainerStore, INITIAL_COHERENCE } from "@/lib/store";
import { PACE } from "@/lib/constants";

function resetStore() {
  useTrainerStore.setState({
    mode: null,
    connection: { status: "idle" },
    hr: null,
    coherence: INITIAL_COHERENCE,
    pace: PACE.default,
    isPacing: false,
  });
}

describe("useTrainerStore", () => {
  beforeEach(() => {
    resetStore();
  });

  it("has correct initial state", () => {
    const s = useTrainerStore.getState();
    expect(s.mode).toBeNull();
    expect(s.connection).toEqual({ status: "idle" });
    expect(s.hr).toBeNull();
    expect(s.coherence.ready).toBe(false);
    expect(s.pace).toBe(PACE.default);
    expect(s.isPacing).toBe(false);
  });

  it("setMode updates mode", () => {
    useTrainerStore.getState().setMode("ble");
    expect(useTrainerStore.getState().mode).toBe("ble");
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
    const c = { ready: true, progress: 1, score: 75, raw: 72, peakFreqHz: 0.1, zone: "coherent" as const };
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

  it("resetSignal clears hr to null and coherence.ready to false", () => {
    useTrainerStore.getState().setHr(72);
    useTrainerStore.getState().setCoherence({
      ready: true,
      progress: 1,
      score: 80,
      raw: 78,
      peakFreqHz: 0.1,
      zone: "coherent",
    });
    useTrainerStore.getState().resetSignal();
    const s = useTrainerStore.getState();
    expect(s.hr).toBeNull();
    expect(s.coherence.ready).toBe(false);
  });
});
