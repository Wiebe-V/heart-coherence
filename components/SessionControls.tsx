"use client";

import { useId } from "react";
import { useTrainerStore } from "@/lib/store";
import { useSession } from "@/hooks/useSession";
import { loadSettings, saveSettings } from "@/lib/settings";
import { PACE } from "@/lib/constants";

/**
 * The quiet control strip: a paced-breathing slider (persisted to settings) and
 * a minimal start/stop session button. The simulator affordance lives in
 * ConnectionButton, so it isn't duplicated here. Session recording UX beyond
 * start/stop (history, detail) is D7.
 */
export default function SessionControls() {
  const pace = useTrainerStore((s) => s.pace);
  const setPace = useTrainerStore((s) => s.setPace);
  const connected = useTrainerStore((s) => s.connection.status === "connected");
  const { active, start, stop } = useSession();
  const sliderId = useId();

  const onPaceChange = (e: React.ChangeEvent<HTMLInputElement>): void => {
    const next = Number(e.target.value);
    setPace(next);
    saveSettings({ ...loadSettings(), pace: next });
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
    </div>
  );
}
