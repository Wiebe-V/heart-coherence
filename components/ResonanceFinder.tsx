"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { ResonanceStep } from "@/types";
import { useTrainerStore } from "@/lib/store";
import { resonancePaces, bestPace, summarizeResonance } from "@/lib/resonance";
import { loadSettings } from "@/lib/settings";
import { useSettingsStore } from "@/lib/settingsStore";
import { RESONANCE_INTERVAL_S, RESONANCE_SETTLE_S } from "@/lib/constants";

const TICK_MS = 1000; // 1 Hz sampling loop

type Phase = "idle" | "running" | "done";

/**
 * The Resonance Finder. A guided sweep that holds each candidate pace for
 * `settings.resonanceIntervalS` seconds, ignores the first RESONANCE_SETTLE_S
 * seconds while breathing settles, then averages coherence over the remainder.
 * The pace with the highest sustained average is the user's resonant frequency.
 *
 * Timing lives in refs and a single 1 Hz interval; React state holds only what
 * the screen displays (phase, active pace index, seconds remaining, finished
 * steps). The orb follows along because each step calls setPace().
 */
export default function ResonanceFinder() {
  const connected = useTrainerStore((s) => s.connection.status === "connected");
  const setPace = useTrainerStore((s) => s.setPace);

  const paces = useMemo(() => resonancePaces(), []);
  const intervalS = useMemo(() => {
    const fromSettings = loadSettings().resonanceIntervalS;
    return fromSettings > 0 ? fromSettings : RESONANCE_INTERVAL_S;
  }, []);

  const [phase, setPhase] = useState<Phase>("idle");
  const [stepIndex, setStepIndex] = useState(0); // index of the active pace
  const [secondsLeft, setSecondsLeft] = useState(0); // in the active step
  const [steps, setSteps] = useState<ResonanceStep[]>([]); // completed steps

  // Accumulation lives in refs so 1 Hz sampling never re-renders.
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const indexRef = useRef(0);
  const elapsedRef = useRef(0); // seconds elapsed in the active step
  const sumRef = useRef(0); // running sum of accumulated scores
  const countRef = useRef(0); // number of accumulated samples

  const clearTimer = useCallback((): void => {
    if (timerRef.current !== null) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  // Clean up the timer on unmount.
  useEffect(() => clearTimer, [clearTimer]);

  // Begin a fresh hold at paces[indexRef.current].
  const beginStep = useCallback((): void => {
    const pace = paces[indexRef.current];
    if (pace === undefined) return;
    elapsedRef.current = 0;
    sumRef.current = 0;
    countRef.current = 0;
    setPace(pace);
    setStepIndex(indexRef.current);
    setSecondsLeft(intervalS);
  }, [paces, intervalS, setPace]);

  const tick = useCallback((): void => {
    const pace = paces[indexRef.current];
    if (pace === undefined) return;

    const { coherence, connection } = useTrainerStore.getState();
    // If the signal drops mid-sweep, stop cleanly rather than running a blind
    // sweep (the !connected render branch alone wouldn't halt the interval).
    if (connection.status !== "connected") {
      clearTimer();
      setPhase("idle");
      return;
    }

    elapsedRef.current += 1;

    // Only accumulate once breathing has settled and a full window is ready.
    if (elapsedRef.current > RESONANCE_SETTLE_S && coherence.ready) {
      sumRef.current += coherence.score;
      countRef.current += 1;
    }

    const remaining = intervalS - elapsedRef.current;
    setSecondsLeft(Math.max(0, remaining));

    if (elapsedRef.current >= intervalS) {
      // Finalize this step.
      const avgCoherence = countRef.current > 0 ? sumRef.current / countRef.current : 0;
      const finished: ResonanceStep = {
        paceBpm: pace,
        avgCoherence,
        samples: countRef.current,
      };
      setSteps((prev) => [...prev, finished]);

      // Advance, or finish the sweep.
      indexRef.current += 1;
      if (indexRef.current >= paces.length) {
        clearTimer();
        setPhase("done");
        return;
      }
      beginStep();
    }
  }, [paces, intervalS, beginStep, clearTimer]);

  const start = useCallback((): void => {
    clearTimer();
    indexRef.current = 0;
    setSteps([]);
    setPhase("running");
    beginStep();
    timerRef.current = setInterval(tick, TICK_MS);
  }, [clearTimer, beginStep, tick]);

  const stop = useCallback((): void => {
    clearTimer();
    setPhase("idle");
  }, [clearTimer]);

  const applyBest = useCallback(
    (best: number): void => {
      setPace(best);
      useSettingsStore.getState().update({ pace: best });
    },
    [setPace],
  );

  // ----- Disabled (no signal) -------------------------------------------
  if (!connected) {
    return (
      <div className="flex flex-col items-center gap-2 text-center">
        <p className="text-sm text-fg-muted">find your resonant pace</p>
        <p className="max-w-xs text-xs text-fg-faint">
          Connect a strap, then we can sweep your breathing pace to find where coherence is strongest.
        </p>
        <button type="button" className="btn btn-ghost" disabled>
          find my resonance
        </button>
      </div>
    );
  }

  // ----- Idle -----------------------------------------------------------
  if (phase === "idle") {
    const minutes = Math.round((paces.length * intervalS) / 60);
    return (
      <div className="flex flex-col items-center gap-3 text-center">
        <p className="max-w-xs text-xs text-fg-faint">
          We&apos;ll hold each pace for {Math.round(intervalS / 60)} min and measure your coherence.
          The whole sweep takes about {minutes} min — breathe along with the orb.
        </p>
        <button type="button" className="btn btn-primary" onClick={start}>
          find my resonance
        </button>
      </div>
    );
  }

  // ----- Running --------------------------------------------------------
  if (phase === "running") {
    const activePace = paces[stepIndex] ?? paces[0];
    const settling = secondsLeft > intervalS - RESONANCE_SETTLE_S;
    const mm = Math.floor(secondsLeft / 60);
    const ss = secondsLeft % 60;
    const countdown = `${mm}:${ss.toString().padStart(2, "0")}`;

    // Bars: completed steps plus the in-progress one (shown faint).
    const maxAvg = Math.max(1, ...steps.map((s) => s.avgCoherence));

    return (
      <div className="flex w-full max-w-md flex-col items-center gap-4">
        <div aria-live="polite" className="flex flex-col items-center gap-1 text-center">
          <p className="text-sm text-fg-muted">
            breathing at <span className="tnum text-fg">{activePace}</span> breaths/min
          </p>
          <p className="tnum text-2xl font-light text-zone">{countdown}</p>
          <p className="text-xs text-fg-faint">
            {settling
              ? "settling — breathe with the orb"
              : `pace ${stepIndex + 1} of ${paces.length}`}
          </p>
        </div>

        <PaceBars
          paces={paces}
          steps={steps}
          activeIndex={stepIndex}
          maxAvg={maxAvg}
          bestPaceBpm={null}
        />

        <button type="button" className="btn btn-ghost" onClick={stop}>
          stop
        </button>
      </div>
    );
  }

  // ----- Done -----------------------------------------------------------
  const result = summarizeResonance(steps);
  const best = bestPace(steps);
  const maxAvg = Math.max(1, ...steps.map((s) => s.avgCoherence));

  return (
    <div className="flex w-full max-w-md flex-col items-center gap-4">
      <div className="flex flex-col items-center gap-1 text-center">
        <p className="text-xs uppercase tracking-[0.22em] text-fg-faint">resonant pace</p>
        <p className="text-sm text-fg-muted">
          your resonant pace is <span className="tnum text-zone">{best}</span> breaths/min
        </p>
      </div>

      <PaceBars
        paces={paces}
        steps={result.steps}
        activeIndex={-1}
        maxAvg={maxAvg}
        bestPaceBpm={best}
      />

      <div className="flex flex-wrap items-center justify-center gap-2.5">
        <button type="button" className="btn btn-primary" onClick={() => applyBest(best)}>
          use this pace
        </button>
        <button type="button" className="btn btn-ghost" onClick={start}>
          run again
        </button>
      </div>
    </div>
  );
}

interface PaceBarsProps {
  paces: number[];
  steps: ResonanceStep[];
  /** index of the in-progress pace, or -1 when none */
  activeIndex: number;
  maxAvg: number;
  /** the winning pace once known, else null */
  bestPaceBpm: number | null;
}

/**
 * A compact column chart: one bar per candidate pace. Completed steps fill to
 * their average coherence; the active pace pulses faintly; the winner is
 * highlighted in the zone color. The numbers in the row text carry the meaning,
 * so the chart itself is decorative.
 */
function PaceBars({ paces, steps, activeIndex, maxAvg, bestPaceBpm }: PaceBarsProps) {
  const byPace = new Map(steps.map((s) => [s.paceBpm, s]));

  return (
    <div className="flex w-full items-end justify-between gap-1.5" aria-hidden="true">
      {paces.map((pace, i) => {
        const step = byPace.get(pace);
        const isActive = i === activeIndex;
        const isBest = bestPaceBpm !== null && pace === bestPaceBpm;
        const pct = step ? Math.round((step.avgCoherence / maxAvg) * 100) : isActive ? 8 : 4;

        const barColor = isBest
          ? "var(--zone)"
          : step
            ? "color-mix(in oklab, var(--zone) 55%, transparent)"
            : "var(--line-strong)";

        return (
          <div key={pace} className="flex flex-1 flex-col items-center gap-1">
            <div className="flex h-20 w-full items-end justify-center">
              <div
                className="motion-zone w-full max-w-5 rounded-full"
                style={{
                  height: `${Math.max(2, pct)}%`,
                  background: barColor,
                  opacity: isActive ? 0.6 : 1,
                  boxShadow: isBest ? "0 0 16px 0 var(--zone)" : "none",
                  transition: "height 600ms ease, background 600ms ease, opacity 600ms ease",
                }}
              />
            </div>
            <span
              className="tnum text-[0.65rem]"
              style={{ color: isBest ? "var(--fg-muted)" : "var(--fg-faint)" }}
            >
              {pace}
            </span>
          </div>
        );
      })}
    </div>
  );
}
