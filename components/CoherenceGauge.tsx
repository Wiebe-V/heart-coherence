"use client";

import { useTrainerStore } from "@/lib/store";

/**
 * The live coherence readout. Before the first 64 s window is ready it shows a
 * collecting progress percentage; afterwards a large, light-weight 0–100 score
 * accented by the current zone. HR sits quietly beneath. The score region is
 * aria-live="polite" so screen readers hear its ~1 Hz updates.
 */
export default function CoherenceGauge() {
  const coherence = useTrainerStore((s) => s.coherence);
  const hr = useTrainerStore((s) => s.hr);

  return (
    <div className="flex flex-col items-center gap-1">
      <div aria-live="polite" className="flex flex-col items-center">
        {coherence.ready ? (
          <span className="tnum text-6xl font-light leading-none text-zone sm:text-7xl">
            {Math.round(coherence.score)}
          </span>
        ) : (
          <span className="flex flex-col items-center gap-1 text-fg-muted">
            <span className="text-sm">collecting…</span>
            <span className="tnum text-2xl font-light text-fg">
              {Math.round(coherence.progress * 100)}%
            </span>
          </span>
        )}
      </div>
      <span className="text-xs uppercase tracking-[0.22em] text-fg-faint">coherence</span>
      <span className="tnum mt-1 text-xs text-fg-muted">
        {hr === null ? "-- bpm" : `${hr} bpm`}
      </span>
    </div>
  );
}
