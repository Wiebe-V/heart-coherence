"use client";

import { useRef, type CSSProperties } from "react";
import type { CoherenceZone } from "@/types";
import { useBreathPacer } from "@/hooks/useBreathPacer";
import { ZONE_VAR } from "@/lib/constants";

interface BreathOrbProps {
  pace: number;
  zone: CoherenceZone;
  /** false → reduced motion: static ring, label still flips. */
  animate: boolean;
  /** CSS length for the orb diameter. Defaults to the hero size. */
  size?: string;
}

export default function BreathOrb({ pace, zone, animate, size }: BreathOrbProps) {
  const orbRef = useRef<HTMLDivElement | null>(null);
  const { inhaling } = useBreathPacer(pace, animate, orbRef);

  const phase = inhaling ? "breathe in" : "breathe out";
  const label = `${phase}. Pacing at ${pace} breaths per minute. Coherence is ${zone}.`;

  const dim = size ?? "min(62vmin, 40vh, 22rem)";
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
