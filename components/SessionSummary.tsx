"use client";

import { useEffect, useRef } from "react";
import type { SessionRecord } from "@/types";

/** mm:ss from a whole-second duration. */
function formatDuration(durationS: number): string {
  const mm = Math.floor(durationS / 60);
  const ss = Math.round(durationS % 60);
  return `${mm}:${ss.toString().padStart(2, "0")}`;
}

interface SessionSummaryProps {
  record: SessionRecord;
  /** whether a fresh session can be started (source connected) */
  canRestart: boolean;
  onDone: () => void;
  onRestart: () => void;
}

/**
 * Lightweight completion card shown on goal-reached or manual stop. Backdrop
 * click or Escape dismisses; the primary button starts another session.
 */
export default function SessionSummary({
  record,
  canRestart,
  onDone,
  onRestart,
}: SessionSummaryProps) {
  const doneRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    doneRef.current?.focus();
    const onKey = (e: KeyboardEvent): void => {
      if (e.key === "Escape") onDone();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onDone]);

  const stats: { label: string; value: string }[] = [
    { label: "duration", value: formatDuration(record.durationS) },
    { label: "achievement", value: String(record.achievement) },
    { label: "avg", value: String(Math.round(record.avgCoherence)) },
    { label: "peak", value: String(Math.round(record.peakCoherence)) },
  ];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-6"
      role="dialog"
      aria-modal="true"
      aria-label="session complete"
    >
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onDone} aria-hidden="true" />
      <div
        className="relative z-10 flex w-full max-w-sm flex-col gap-5 rounded-2xl border p-6"
        style={{ background: "var(--bg-elevated)", borderColor: "var(--line-strong)" }}
      >
        <h2 className="text-sm uppercase tracking-[0.22em] text-fg-muted">session complete</h2>
        <dl className="grid grid-cols-2 gap-4">
          {stats.map((s) => (
            <div key={s.label} className="flex flex-col gap-1">
              <dt className="text-[0.68rem] uppercase tracking-[0.18em] text-fg-faint">{s.label}</dt>
              <dd className="tnum text-2xl text-fg">{s.value}</dd>
            </div>
          ))}
        </dl>
        <div className="flex justify-end gap-2.5">
          <button ref={doneRef} type="button" className="btn btn-ghost" onClick={onDone}>
            done
          </button>
          <button
            type="button"
            className="btn btn-primary"
            onClick={onRestart}
            disabled={!canRestart}
            title={canRestart ? undefined : "connect a source first"}
          >
            new session
          </button>
        </div>
      </div>
    </div>
  );
}
