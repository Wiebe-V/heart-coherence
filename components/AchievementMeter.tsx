"use client";

import type { CSSProperties } from "react";
import { useTrainerStore } from "@/lib/store";
import { useSettingsStore } from "@/lib/settingsStore";

/**
 * Compact live readout of session progress — "achievement 128 / 300" over a
 * thin bar that fills in the current zone color (--zone, set by Trainer).
 * Points come from the trainer store, the goal from the settings store.
 */
export default function AchievementMeter() {
  const achievement = useTrainerStore((s) => s.achievement);
  const goal = useSettingsStore((s) => s.settings.achievementGoal);
  const pct = goal > 0 ? Math.min(100, (achievement / goal) * 100) : 0;

  const fillStyle: CSSProperties = {
    width: `${pct}%`,
    background: "var(--zone)",
    boxShadow: "0 0 12px 0 var(--zone)",
    transition: "width 600ms ease, background 700ms ease",
  };

  return (
    <div className="flex w-full max-w-md flex-col gap-1.5">
      <div className="flex items-baseline justify-between">
        <span className="text-xs uppercase tracking-[0.18em] text-fg-muted">achievement</span>
        <span className="tnum text-xs text-fg-muted">
          {achievement} / {goal}
        </span>
      </div>
      <div
        className="h-1 w-full overflow-hidden rounded-full"
        style={{ background: "var(--line-strong)" }}
        role="progressbar"
        aria-valuenow={achievement}
        aria-valuemin={0}
        aria-valuemax={goal}
      >
        <div className="h-full rounded-full" style={fillStyle} />
      </div>
    </div>
  );
}
