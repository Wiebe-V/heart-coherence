"use client";

import { useCallback, useEffect, useId, useState, type CSSProperties } from "react";
import Link from "next/link";
import { useTrainerStore } from "@/lib/store";
import { useSettingsStore } from "@/lib/settingsStore";
import { useCoherence } from "@/hooks/useCoherence";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import { useWakeLock } from "@/hooks/useWakeLock";
import { ZONE_VAR, ONBOARDED_KEY } from "@/lib/constants";
import BleDebugPanel from "@/components/BleDebugPanel";
import VitalsHeader from "@/components/VitalsHeader";
import BreathOrb from "@/components/BreathOrb";
import LiveWaveform from "@/components/LiveWaveform";
import CoherenceGraph from "@/components/CoherenceGraph";
import BarChartPanel from "@/components/BarChartPanel";
import SessionControls from "@/components/SessionControls";
import ResonanceFinder from "@/components/ResonanceFinder";
import SettingsDrawer from "@/components/SettingsDrawer";
import OnboardingOverlay from "@/components/OnboardingOverlay";
import InfoBubble from "@/components/InfoBubble";
import { INFO } from "@/lib/infoText";

export default function Trainer() {
  const settings = useSettingsStore((s) => s.settings);

  const reduced = useReducedMotion(settings.reducedMotionOverride);
  const animate = !reduced;

  useCoherence(settings.zoneThresholds);
  useWakeLock(useTrainerStore((s) => s.sessionActive));

  const pace = useTrainerStore((s) => s.pace);
  const setPace = useTrainerStore((s) => s.setPace);
  const zone = useTrainerStore((s) => s.coherence.zone);

  const [resonanceOpen, setResonanceOpen] = useState(false);
  const resonanceId = useId();
  const [settingsOpen, setSettingsOpen] = useState(false);
  // Open on first run (no onboarded flag yet). Read lazily during render, the
  // same client-only pattern as isDebug below.
  const [onboardingOpen, setOnboardingOpen] = useState(() => {
    if (typeof window === "undefined") return false;
    try {
      return localStorage.getItem(ONBOARDED_KEY) === null;
    } catch {
      return false;
    }
  });
  const [isDebug] = useState(
    () => typeof window !== "undefined" && new URLSearchParams(window.location.search).get("debug") === "1",
  );

  useEffect(() => {
    setPace(settings.pace);
  }, [settings.pace, setPace]);

  // Stable so the drawer's focus-trap effect doesn't re-run (and steal focus)
  // on Trainer's ~1 Hz re-renders.
  const closeSettings = useCallback((): void => setSettingsOpen(false), []);

  const closeOnboarding = useCallback((): void => {
    setOnboardingOpen(false);
    try {
      localStorage.setItem(ONBOARDED_KEY, "1");
    } catch {
      // ignore
    }
  }, []);

  const screenStyle: CSSProperties = { ["--zone" as string]: ZONE_VAR[zone] };

  return (
    <div style={screenStyle} className="relative isolate flex flex-1 flex-col">
      <div className="app-atmosphere" aria-hidden="true" />

      <button
        type="button"
        aria-label="settings"
        onClick={() => setSettingsOpen(true)}
        className="absolute right-5 top-5 z-20 text-fg-faint transition-colors hover:text-fg-muted focus-visible:text-fg-muted"
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true">
          <circle cx="12" cy="12" r="3" />
          <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
        </svg>
      </button>

      <main className="relative z-10 mx-auto flex min-h-0 w-full max-w-7xl flex-1 flex-col justify-center gap-5 px-8 py-6">
        <VitalsHeader />

        {/* Two columns on md+; single column stacked below */}
        <div className="flex flex-col gap-5 md:flex-row md:items-start md:gap-6">

          {/* Left ~48%: breath orb + controls */}
          <div className="flex flex-col items-center gap-6 md:w-[48%]">
            <div className="relative">
              <BreathOrb
                size="min(46vmin, 28rem)"
                pace={pace}
                zone={zone}
                animate={animate}
              />
              <span className="absolute right-0 top-0">
                <InfoBubble {...INFO.breathOrb} />
              </span>
            </div>

            <SessionControls />

            <div className="flex w-full max-w-xs flex-col items-center gap-4">
              <span className="flex items-center gap-1.5">
                <button
                  type="button"
                  className="text-xs uppercase tracking-[0.18em] text-fg-faint underline-offset-4 transition-colors hover:text-fg-muted focus-visible:text-fg-muted"
                  aria-expanded={resonanceOpen}
                  aria-controls={resonanceId}
                  onClick={() => setResonanceOpen((open) => !open)}
                >
                  {resonanceOpen ? "hide resonance finder" : "find my resonance"}
                </button>
                <InfoBubble {...INFO.resonance} />
              </span>
              {resonanceOpen ? (
                <div id={resonanceId} className="flex w-full justify-center">
                  <ResonanceFinder />
                </div>
              ) : null}
            </div>

            <div className="flex items-center gap-5">
              <button
                type="button"
                onClick={() => setOnboardingOpen(true)}
                className="text-xs text-fg-faint underline-offset-4 transition-colors hover:text-fg-muted focus-visible:text-fg-muted"
              >
                how it works
              </button>
              <Link
                href="/history"
                className="text-xs text-fg-faint underline-offset-4 transition-colors hover:text-fg-muted focus-visible:text-fg-muted"
              >
                history
              </Link>
            </div>
          </div>

          {/* Right ~62%: graph stack */}
          <div className="flex flex-col gap-4 md:flex-1">
            <LiveWaveform />
            <CoherenceGraph thresholds={settings.zoneThresholds} />
            <BarChartPanel />
          </div>
        </div>
      </main>

      <SettingsDrawer open={settingsOpen} onClose={closeSettings} reduced={reduced} />
      {onboardingOpen ? <OnboardingOverlay onClose={closeOnboarding} /> : null}

      {isDebug && <BleDebugPanel />}
    </div>
  );
}
