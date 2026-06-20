"use client";

import type { CSSProperties } from "react";
import type { CoherenceZone, ZoneThresholds } from "@/types";
import { useTrainerStore } from "@/lib/store";
import { DEFAULT_ZONE_THRESHOLDS } from "@/lib/constants";

interface ZoneBarProps {
  thresholds?: ZoneThresholds;
}

interface Segment {
  zone: CoherenceZone;
  label: string;
  color: string;
  /** lower bound, shown subtly under the segment; null = the floor (0) */
  from: number | null;
}

/**
 * Three labeled segments — scattered / building / coherent — in the zone
 * colors. The active segment (from store.coherence.zone) brightens; the others
 * recede. Threshold numbers from `thresholds` sit quietly beneath the seams.
 */
export default function ZoneBar({ thresholds = DEFAULT_ZONE_THRESHOLDS }: ZoneBarProps) {
  const zone = useTrainerStore((s) => s.coherence.zone);

  const segments: Segment[] = [
    { zone: "scattered", label: "scattered", color: "var(--zone-scattered)", from: null },
    { zone: "building", label: "building", color: "var(--zone-building)", from: thresholds.building },
    { zone: "coherent", label: "coherent", color: "var(--zone-coherent)", from: thresholds.coherent },
  ];

  return (
    <div className="flex w-full max-w-md flex-col gap-1.5" aria-hidden="true">
      <div className="flex gap-1.5">
        {segments.map((seg) => {
          const active = seg.zone === zone;
          const style: CSSProperties = {
            background: seg.color,
            opacity: active ? 1 : 0.28,
            boxShadow: active ? `0 0 16px 0 ${seg.color}` : "none",
            transition: "opacity 700ms ease, box-shadow 700ms ease",
          };
          return <div key={seg.zone} className="h-1 flex-1 rounded-full" style={style} />;
        })}
      </div>
      <div className="flex gap-1.5">
        {segments.map((seg) => {
          const active = seg.zone === zone;
          return (
            <div key={seg.zone} className="flex flex-1 items-baseline justify-between">
              <span
                className="text-[0.7rem]"
                style={{
                  color: active ? "var(--fg-muted)" : "var(--fg-faint)",
                  transition: "color 700ms ease",
                }}
              >
                {seg.label}
              </span>
              {seg.from !== null ? (
                <span className="tnum text-[0.65rem] text-fg-faint">{seg.from}</span>
              ) : null}
            </div>
          );
        })}
      </div>
    </div>
  );
}
