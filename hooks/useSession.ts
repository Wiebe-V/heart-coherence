import { useCallback, useEffect, useRef, useState } from "react";
import type { SessionRecord } from "@/types";
import { useTrainerStore } from "@/lib/store";
import { saveSession } from "@/lib/db";

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
 * score and HR into in-ref traces; `stop()` builds, persists, and returns a
 * SessionRecord (or null if nothing was captured). Traces never live in React
 * state, so sampling causes no re-renders.
 */
export function useSession(): {
  active: boolean;
  start: () => void;
  stop: () => Promise<SessionRecord | null>;
} {
  const [active, setActive] = useState(false);
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

  const start = useCallback((): void => {
    clearTimer();
    coherenceTraceRef.current = [];
    hrTraceRef.current = [];
    startedAtRef.current = Date.now();
    setActive(true);
    intervalRef.current = setInterval(() => {
      const { coherence, hr } = useTrainerStore.getState();
      if (coherence.ready) coherenceTraceRef.current.push(round1(coherence.score));
      if (hr !== null) hrTraceRef.current.push(hr);
    }, 1000);
  }, [clearTimer]);

  const stop = useCallback(async (): Promise<SessionRecord | null> => {
    clearTimer();
    setActive(false);

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
    };

    await saveSession(record);
    return record;
  }, [clearTimer]);

  useEffect(() => clearTimer, [clearTimer]);

  return { active, start, stop };
}
