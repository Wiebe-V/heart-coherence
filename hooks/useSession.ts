import { useCallback, useEffect, useRef, useState } from "react";
import type { SessionRecord } from "@/types";
import { useTrainerStore } from "@/lib/store";
import { useSettingsStore } from "@/lib/settingsStore";
import { saveSession } from "@/lib/db";
import { zonePoints, goalReached } from "@/lib/achievement";

const MAX_TRACE_POINTS = 3600;

const round1 = (n: number): number => Math.round(n * 10) / 10;
const round0 = (n: number): number => Math.round(n);

/** Keep at most ~MAX_TRACE_POINTS by dropping to every Nth sample. */
function decimate(trace: number[]): number[] {
  if (trace.length <= MAX_TRACE_POINTS) return trace.slice();
  const step = Math.ceil(trace.length / MAX_TRACE_POINTS);
  const out: number[] = [];
  for (let i = 0; i < trace.length; i += step) {
    const v = trace[i];
    if (v !== undefined) out.push(v);
  }
  return out;
}

let idCounter = 0;
function makeId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  idCounter += 1;
  return `session-${Date.now()}-${idCounter}`;
}

/**
 * Records a training session: once per second it samples the store's coherence
 * score and HR into in-ref traces and accrues zone-weighted achievement points.
 * The session auto-completes when achievement reaches the configured goal;
 * `stop()` ends it manually. Either path builds, persists, and surfaces a
 * SessionRecord via `summary` (or null if nothing was captured). Traces never
 * live in React state, so sampling causes no re-renders.
 */
export function useSession(): {
  active: boolean;
  summary: SessionRecord | null;
  start: () => void;
  stop: () => Promise<SessionRecord | null>;
  clearSummary: () => void;
} {
  const active = useTrainerStore((s) => s.sessionActive);
  const [summary, setSummary] = useState<SessionRecord | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startedAtRef = useRef(0);
  const coherenceTraceRef = useRef<number[]>([]);
  const hrTraceRef = useRef<number[]>([]);

  const clearTimer = useCallback((): void => {
    if (intervalRef.current !== null) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  // Stops recording, builds + persists a record (with achievement), and shows
  // its summary. Shared by manual stop and goal-reached auto-completion.
  const finalize = useCallback(async (): Promise<SessionRecord | null> => {
    clearTimer();
    useTrainerStore.getState().setSessionActive(false);

    const coherenceTrace = coherenceTraceRef.current;
    if (coherenceTrace.length === 0) return null;

    const sum = coherenceTrace.reduce((a, b) => a + b, 0);
    const avgCoherence = sum / coherenceTrace.length;
    const peakCoherence = Math.max(...coherenceTrace);

    const record: SessionRecord = {
      id: makeId(),
      startedAt: startedAtRef.current,
      durationS: round0((Date.now() - startedAtRef.current) / 1000),
      pace: useTrainerStore.getState().pace,
      avgCoherence: round1(avgCoherence),
      peakCoherence: round1(peakCoherence),
      coherenceTrace: decimate(coherenceTrace),
      hrTrace: decimate(hrTraceRef.current),
      achievement: useTrainerStore.getState().achievement,
    };

    await saveSession(record);
    setSummary(record);
    return record;
  }, [clearTimer]);

  const start = useCallback((): void => {
    clearTimer();
    coherenceTraceRef.current = [];
    hrTraceRef.current = [];
    startedAtRef.current = Date.now();
    setSummary(null);
    useTrainerStore.getState().resetAchievement();
    useTrainerStore.getState().setSessionActive(true);
    intervalRef.current = setInterval(() => {
      const store = useTrainerStore.getState();
      if (store.coherence.ready) {
        coherenceTraceRef.current.push(round1(store.coherence.score));
        store.addAchievement(zonePoints(store.coherence.zone));
      }
      if (store.hr !== null) hrTraceRef.current.push(store.hr);

      const goal = useSettingsStore.getState().settings.achievementGoal;
      if (goalReached(useTrainerStore.getState().achievement, goal)) {
        void finalize();
      }
    }, 1000);
  }, [clearTimer, finalize]);

  const stop = useCallback((): Promise<SessionRecord | null> => finalize(), [finalize]);

  const clearSummary = useCallback((): void => setSummary(null), []);

  useEffect(() => clearTimer, [clearTimer]);

  return { active, summary, start, stop, clearSummary };
}
