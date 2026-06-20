"use client";

import { useRef, type CSSProperties } from "react";
import type { CoherenceZone } from "@/types";
import { useBreathPacer } from "@/hooks/useBreathPacer";

interface BreathOrbProps {
  pace: number;
  zone: CoherenceZone;
  /** false → reduced motion: static ring, label still flips. */
  animate: boolean;
}

const ZONE_VAR: Record<CoherenceZone, string> = {
  scattered: "var(--zone-scattered)",
  building: "var(--zone-building)",
  coherent: "var(--zone-coherent)",
};

/**
 * The hero. A large soft orb whose glow/fill follows the current coherence
 * zone (transitioning smoothly) and whose scale is driven imperatively by the
 * breath pacer hook through `orbRef` — no React re-render per frame. Under
 * reduced motion it renders a static ring that still shows the in/out label.
 */
export default function BreathOrb({ pace, zone, animate }: BreathOrbProps) {
  const orbRef = useRef<HTMLDivElement | null>(null);
  const { inhaling } = useBreathPacer(pace, animate, orbRef);

  const phase = inhaling ? "breathe in" : "breathe out";
  const label = `${phase}. Pacing at ${pace} breaths per minute. Coherence is ${zone}.`;

  // The orb's --zone variable is the only thing that changes with the zone;
  // the CSS transition on the orb turns a zone change into a slow color drift.
  // Size with viewport width AND height so the orb stays a generous hero on
  // mobile (vmin) yet never forces the single screen to scroll on a short
  // desktop window (the 40vh cap and the rem ceiling keep it in budget).
  const dim = "min(62vmin, 40vh, 22rem)";
  const zoneStyle: CSSProperties = {
    ["--zone" as string]: ZONE_VAR[zone],
    width: dim,
    height: dim,
  };

  return (
    <div role="img" aria-label={label} className="grid place-items-center" style={zoneStyle}>
      {animate ? (
        <div ref={orbRef} className="orb h-full w-full">
          <span className="orb-label">{phase}</span>
        </div>
      ) : (
        <div className="orb-ring h-full w-full">
          <span className="orb-label">{phase}</span>
        </div>
      )}
    </div>
  );
}
