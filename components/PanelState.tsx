"use client";

import { warmupLabel } from "@/lib/panelState";

interface PanelStateProps {
  /** `connect` = no strap streaming; `warmup` = filling the first 64 s window */
  mode: "connect" | "warmup";
  /** 0..1 window fill, only read in `warmup` mode */
  progress?: number;
  className?: string;
}

/**
 * The placeholder shown inside a data panel before it has a live reading.
 * `connect` prompts the user to pair a strap; `warmup` shows a counting-down
 * estimate plus a filling bar so the ~60 s first-window wait visibly advances
 * instead of looking frozen on "collecting…".
 */
export default function PanelState({ mode, progress = 0, className = "" }: PanelStateProps) {
  if (mode === "connect") {
    return (
      <div className={`flex h-full items-center justify-center ${className}`}>
        <span className="text-xs uppercase tracking-[0.16em] text-fg-faint">
          connect a strap to begin
        </span>
      </div>
    );
  }

  const { remainingS, percent } = warmupLabel(progress);

  return (
    <div className={`flex h-full items-center justify-center ${className}`}>
      <div className="flex w-full max-w-xs flex-col gap-2">
        <div className="flex items-baseline justify-between">
          <span className="text-xs tracking-[0.04em] text-fg-muted" aria-hidden="true">
            first reading in ~{remainingS}s
          </span>
          <span className="tnum text-xs text-fg-faint" aria-hidden="true">
            {percent}%
          </span>
        </div>
        <div
          className="h-1 w-full overflow-hidden rounded-full"
          style={{ background: "var(--line)" }}
          aria-hidden="true"
        >
          <div
            className="h-full rounded-full bg-zone transition-[width] duration-500 ease-out"
            style={{ width: `${percent}%` }}
          />
        </div>
        <span className="visually-hidden">Warming up — building your first reading.</span>
      </div>
    </div>
  );
}
