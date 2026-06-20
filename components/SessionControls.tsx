"use client";

import { useId } from "react";
import { useTrainerStore } from "@/lib/store";
import { useSettingsStore } from "@/lib/settingsStore";
import { useSession } from "@/hooks/useSession";
import { PACE } from "@/lib/constants";
import AchievementMeter from "@/components/AchievementMeter";
import SessionSummary from "@/components/SessionSummary";

/**
 * Pace slider (persisted to settings), a live achievement meter while a session
 * runs, the start/stop button, and the completion summary card.
 */
export default function SessionControls() {
  const pace = useTrainerStore((s) => s.pace);
  const setPace = useTrainerStore((s) => s.setPace);
  const connected = useTrainerStore((s) => s.connection.status === "connected");
  const updateSettings = useSettingsStore((s) => s.update);
  const { active, summary, start, stop, clearSummary } = useSession();
  const sliderId = useId();

  const onPaceChange = (e: React.ChangeEvent<HTMLInputElement>): void => {
    const next = Number(e.target.value);
    setPace(next);
    updateSettings({ pace: next });
  };

  return (
    <div className="flex w-full max-w-md flex-col gap-4">
      <div className="flex flex-col gap-2">
        <div className="flex items-baseline justify-between">
          <label htmlFor={sliderId} className="text-xs uppercase tracking-[0.18em] text-fg-muted">
            pace
          </label>
          <span className="tnum text-xs text-fg-muted">{pace} breaths/min</span>
        </div>
        <input
          id={sliderId}
          type="range"
          className="pace-slider"
          min={PACE.min}
          max={PACE.max}
          step={PACE.step}
          value={pace}
          onChange={onPaceChange}
        />
      </div>

      {active ? <AchievementMeter /> : null}

      <div className="flex justify-center">
        {active ? (
          <button type="button" className="btn btn-ghost" onClick={() => void stop()}>
            stop session
          </button>
        ) : (
          <button
            type="button"
            className="btn btn-ghost"
            onClick={start}
            disabled={!connected}
            title={connected ? undefined : "connect a source first"}
          >
            start session
          </button>
        )}
      </div>

      {summary ? (
        <SessionSummary
          record={summary}
          canRestart={connected}
          onDone={clearSummary}
          onRestart={() => {
            clearSummary();
            start();
          }}
        />
      ) : null}
    </div>
  );
}
