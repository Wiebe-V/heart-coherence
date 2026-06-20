"use client";

import { useEffect, useId, useState, type CSSProperties } from "react";
import Link from "next/link";
import type { Settings } from "@/types";
import { useTrainerStore } from "@/lib/store";
import { useCoherence } from "@/hooks/useCoherence";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import { loadSettings } from "@/lib/settings";
import { ZONE_VAR } from "@/lib/constants";
import ConnectionButton from "@/components/ConnectionButton";
import BreathOrb from "@/components/BreathOrb";
import CoherenceGauge from "@/components/CoherenceGauge";
import ZoneBar from "@/components/ZoneBar";
import LiveWaveform from "@/components/LiveWaveform";
import SessionControls from "@/components/SessionControls";
import ResonanceFinder from "@/components/ResonanceFinder";

/**
 * Client root. Composes the single-screen trainer: connection at the top, the
 * breathing orb as the centered hero flanked by the live coherence readout, a
 * zone bar, a quiet waveform strip, and the control strip. Sets --zone at the
 * screen level so the atmosphere gradient, gauge number, and slider thumb all
 * follow the current coherence zone with a smooth transition.
 */
export default function Trainer() {
  // Lazy init is client-only safe: this file is "use client" and reaches the
  // browser only behind the page's dynamic ssr:false import.
  const [settings] = useState<Settings>(loadSettings);

  const reduced = useReducedMotion(settings.reducedMotionOverride);
  const animate = !reduced;

  // Run the 1 Hz coherence metric loop once, with the user's thresholds.
  useCoherence(settings.zoneThresholds);

  const pace = useTrainerStore((s) => s.pace);
  const setPace = useTrainerStore((s) => s.setPace);
  const zone = useTrainerStore((s) => s.coherence.zone);

  // The resonance finder is a quiet, opt-in panel so the default screen stays
  // a single calm breath cycle. It drives the orb's pace while open.
  const [resonanceOpen, setResonanceOpen] = useState(false);
  const resonanceId = useId();

  // Push the persisted pace into the store once on mount.
  useEffect(() => {
    setPace(settings.pace);
  }, [settings.pace, setPace]);

  const screenStyle: CSSProperties = { ["--zone" as string]: ZONE_VAR[zone] };

  return (
    <div style={screenStyle} className="relative isolate flex flex-1 flex-col">
      <div className="app-atmosphere" aria-hidden="true" />

      <main className="relative z-10 mx-auto flex min-h-0 w-full max-w-2xl flex-1 flex-col items-center justify-between gap-5 px-6 py-6 sm:gap-6">
        {/* Top: connection */}
        <header className="flex w-full flex-col items-center gap-3">
          <ConnectionButton />
        </header>

        {/* Center: the hero orb with the live readout beneath it */}
        <section className="flex flex-col items-center gap-6">
          <BreathOrb pace={pace} zone={zone} animate={animate} />
          <CoherenceGauge />
        </section>

        {/* Quiet edges: zone bar, waveform, controls */}
        <section className="flex w-full flex-col items-center gap-6">
          <ZoneBar thresholds={settings.zoneThresholds} />
          <LiveWaveform />
          <SessionControls />

          <div className="flex w-full max-w-md flex-col items-center gap-4">
            <button
              type="button"
              className="text-xs uppercase tracking-[0.18em] text-fg-faint underline-offset-4 transition-colors hover:text-fg-muted focus-visible:text-fg-muted"
              aria-expanded={resonanceOpen}
              aria-controls={resonanceId}
              onClick={() => setResonanceOpen((open) => !open)}
            >
              {resonanceOpen ? "hide resonance finder" : "find my resonance"}
            </button>
            {resonanceOpen ? (
              <div id={resonanceId} className="flex w-full justify-center">
                <ResonanceFinder />
              </div>
            ) : null}
          </div>

          <Link
            href="/history"
            className="text-xs text-fg-faint underline-offset-4 transition-colors hover:text-fg-muted focus-visible:text-fg-muted"
          >
            history
          </Link>
        </section>
      </main>
    </div>
  );
}
