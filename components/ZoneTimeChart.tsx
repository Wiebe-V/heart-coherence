"use client";

import { useTrainerStore } from "@/lib/store";
import { zoneProportions } from "@/lib/zoneTime";
import type { CoherenceZone } from "@/types";

const ZONES: CoherenceZone[] = ["scattered", "building", "coherent"];

const ZONE_COLOR: Record<CoherenceZone, string> = {
  scattered: "var(--zone-scattered)",
  building: "var(--zone-building)",
  coherent: "var(--zone-coherent)",
};

function fmtSeconds(s: number): string {
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${m}:${String(sec).padStart(2, "0")}`;
}

export default function ZoneTimeChart() {
  const zoneSeconds = useTrainerStore((s) => s.zoneSeconds);
  const proportions = zoneProportions(zoneSeconds);

  return (
    <div className="flex flex-col gap-2.5">
      {ZONES.map((zone) => (
        <div key={zone} className="flex flex-col gap-1">
          <div className="flex items-baseline justify-between">
            <span className="text-[0.68rem] uppercase tracking-[0.12em] text-fg-faint capitalize">
              {zone}
            </span>
            <span className="tnum text-[0.68rem] text-fg-faint">
              {fmtSeconds(zoneSeconds[zone])}
            </span>
          </div>
          <div
            className="h-1.5 overflow-hidden rounded-full"
            style={{ background: "var(--line)" }}
            role="progressbar"
            aria-valuenow={Math.round(proportions[zone] * 100)}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label={`${zone}: ${fmtSeconds(zoneSeconds[zone])}`}
          >
            <div
              className="h-full rounded-full"
              style={{
                width: `${proportions[zone] * 100}%`,
                background: ZONE_COLOR[zone],
                transition: "width 700ms ease",
              }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}
