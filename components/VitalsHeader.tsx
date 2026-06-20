"use client";

import { useTrainerStore } from "@/lib/store";
import ConnectionButton from "@/components/ConnectionButton";

export default function VitalsHeader() {
  const coherence = useTrainerStore((s) => s.coherence);
  const hr = useTrainerStore((s) => s.hr);
  const zone = useTrainerStore((s) => s.coherence.zone);

  return (
    <header
      className="flex w-full flex-wrap items-center justify-between gap-x-6 gap-y-3 border-b pb-4"
      style={{ borderColor: "var(--line)" }}
    >
      <ConnectionButton />

      <div className="flex items-center gap-6">
        <div aria-live="polite" className="flex flex-col items-end">
          {coherence.ready ? (
            <span className="tnum text-2xl font-light leading-none text-zone">
              {Math.round(coherence.score)}
            </span>
          ) : (
            <span className="tnum text-base leading-none text-fg-muted">
              {Math.round(coherence.progress * 100)}%
            </span>
          )}
          <span className="text-[0.65rem] uppercase tracking-[0.18em] text-fg-faint">
            coherence
          </span>
        </div>

        <div className="flex flex-col items-end">
          <span className="tnum text-base leading-none text-fg-muted">
            {hr === null ? "—" : String(hr)}
          </span>
          <span className="text-[0.65rem] uppercase tracking-[0.18em] text-fg-faint">bpm</span>
        </div>

        <div className="flex flex-col items-end">
          <span className="text-base capitalize leading-none text-zone">{zone}</span>
          <span className="text-[0.65rem] uppercase tracking-[0.18em] text-fg-faint">zone</span>
        </div>
      </div>
    </header>
  );
}
