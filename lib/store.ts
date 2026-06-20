import { create } from "zustand";
import type { ConnectionState, CoherenceResult, SourceMode } from "@/types";
import { PACE } from "@/lib/constants";

const INITIAL_COHERENCE: CoherenceResult = {
  ready: false,
  progress: 0,
  score: 0,
  raw: 0,
  peakFreqHz: 0,
  zone: "scattered",
};

interface TrainerState {
  mode: SourceMode | null;
  connection: ConnectionState;
  hr: number | null;
  coherence: CoherenceResult;
  pace: number;
  isPacing: boolean;
  setMode: (mode: SourceMode | null) => void;
  setConnection: (connection: ConnectionState) => void;
  setHr: (hr: number | null) => void;
  setCoherence: (coherence: CoherenceResult) => void;
  setPace: (pace: number) => void;
  setPacing: (isPacing: boolean) => void;
  resetSignal: () => void;
}

const useTrainerStore = create<TrainerState>((set) => ({
  mode: null,
  connection: { status: "idle" },
  hr: null,
  coherence: INITIAL_COHERENCE,
  pace: PACE.default,
  isPacing: false,
  setMode: (mode) => set({ mode }),
  setConnection: (connection) => set({ connection }),
  setHr: (hr) => set({ hr }),
  setCoherence: (coherence) => set({ coherence }),
  setPace: (pace) => set({ pace }),
  setPacing: (isPacing) => set({ isPacing }),
  resetSignal: () => set({ hr: null, coherence: INITIAL_COHERENCE }),
}));

export { useTrainerStore, INITIAL_COHERENCE };
