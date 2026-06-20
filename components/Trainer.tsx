"use client";

import { useEffect, useId, useState, type CSSProperties } from "react";
import Link from "next/link";
import type { Settings } from "@/types";
import { useTrainerStore } from "@/lib/store";
import { useCoherence } from "@/hooks/useCoherence";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import { loadSettings } from "@/lib/settings";
import { ZONE_VAR } from "@/lib/constants";
import VitalsHeader from "@/components/VitalsHeader";
import BreathOrb from "@/components/BreathOrb";
import LiveWaveform from "@/components/LiveWaveform";
import CoherenceGraph from "@/components/CoherenceGraph";
import BarChartPanel from "@/components/BarChartPanel";
import SessionControls from "@/components/SessionControls";
import ResonanceFinder from "@/components/ResonanceFinder";

export default function Trainer() {
  const [settings] = useState<Settings>(loadSettings);

  const reduced = useReducedMotion(settings.reducedMotionOverride);
  const animate = !reduced;

  useCoherence(settings.zoneThresholds);

  const pace = useTrainerStore((s) => s.pace);
  const setPace = useTrainerStore((s) => s.setPace);
  const zone = useTrainerStore((s) => s.coherence.zone);

  const [resonanceOpen, setResonanceOpen] = useState(false);
  const resonanceId = useId();

  useEffect(() => {
    setPace(settings.pace);
  }, [settings.pace, setPace]);

  const screenStyle: CSSProperties = { ["--zone" as string]: ZONE_VAR[zone] };

  return (
    <div style={screenStyle} className="relative isolate flex flex-1 flex-col">
      <div className="app-atmosphere" aria-hidden="true" />

      <main className="relative z-10 mx-auto flex min-h-0 w-full max-w-4xl flex-1 flex-col gap-5 px-6 py-6">
        <VitalsHeader />

        {/* Two columns on md+; single column stacked below */}
        <div className="flex flex-1 flex-col gap-5 md:flex-row md:items-start md:gap-6">

          {/* Left ~38%: breath orb + controls */}
          <div className="flex flex-col items-center gap-6 md:w-[38%]">
            <BreathOrb
              size="min(34vmin, 16rem)"
              pace={pace}
              zone={zone}
              animate={animate}
            />

            <SessionControls />

            <div className="flex w-full max-w-xs flex-col items-center gap-4">
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
          </div>

          {/* Right ~62%: graph stack */}
          <div className="flex flex-col gap-4 md:flex-1">
            <LiveWaveform />
            <CoherenceGraph thresholds={settings.zoneThresholds} />
            <BarChartPanel />
          </div>
        </div>
      </main>
    </div>
  );
}
