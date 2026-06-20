import type { CoherenceZone, ZoneThresholds } from "@/types";

export function zoneFor(score: number, t: ZoneThresholds): CoherenceZone {
  if (score >= t.coherent) return "coherent";
  if (score >= t.building) return "building";
  return "scattered";
}
