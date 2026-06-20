import { create } from "zustand";
import type { ConnectionState, CoherenceResult, CoherenceZone } from "@/types";
import { PACE } from "@/lib/constants";

export const INITIAL_COHERENCE: CoherenceResult = {
  ready: false,
  progress: 0,
  score: 0,
  raw: 0,
  peakFreqHz: 0,
  zone: "scattered",
  spectrum: [],
};

export const INITIAL_ZONE_SECONDS: Record<CoherenceZone, number> = {
  scattered: 0,
  building: 0,
  coherent: 0,
};

interface TrainerState {
  connection: ConnectionState;
  hr: number | null;
  coherence: CoherenceResult;
  pace: number;
  isPacing: boolean;
  zoneSeconds: Record<CoherenceZone, number>;
  /** zone-weighted points accrued during the active session */
  achievement: number;
  /** whether a training session is currently recording */
  sessionActive: boolean;
  setConnection: (connection: ConnectionState) => void;
  setHr: (hr: number | null) => void;
  setCoherence: (coherence: CoherenceResult) => void;
  setPace: (pace: number) => void;
  setPacing: (isPacing: boolean) => void;
  bumpZoneSecond: (zone: CoherenceZone) => void;
  addAchievement: (pts: number) => void;
  resetAchievement: () => void;
  setSessionActive: (sessionActive: boolean) => void;
  resetSignal: () => void;
}

const useTrainerStore = create<TrainerState>((set) => ({
  connection: { status: "idle" },
  hr: null,
  coherence: INITIAL_COHERENCE,
  pace: PACE.default,
  isPacing: false,
  zoneSeconds: { ...INITIAL_ZONE_SECONDS },
  achievement: 0,
  sessionActive: false,
  setConnection: (connection) => set({ connection }),
  setHr: (hr) => set({ hr }),
  setCoherence: (coherence) => set({ coherence }),
  setPace: (pace) => set({ pace }),
  setPacing: (isPacing) => set({ isPacing }),
  bumpZoneSecond: (zone) =>
    set((s) => ({
      zoneSeconds: { ...s.zoneSeconds, [zone]: s.zoneSeconds[zone] + 1 },
    })),
  addAchievement: (pts) => set((s) => ({ achievement: s.achievement + pts })),
  resetAchievement: () => set({ achievement: 0 }),
  setSessionActive: (sessionActive) => set({ sessionActive }),
  resetSignal: () =>
    set({ hr: null, coherence: INITIAL_COHERENCE, zoneSeconds: { ...INITIAL_ZONE_SECONDS } }),
}));

export { useTrainerStore };
