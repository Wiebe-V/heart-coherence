import type { CoherenceZone, ZoneThresholds } from "@/types";

export function zoneFor(score: number, thresholds: ZoneThresholds): CoherenceZone {
  if (score >= thresholds.coherent) return "coherent";
  if (score >= thresholds.building) return "building";
  return "scattered";
}
