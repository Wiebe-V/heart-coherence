import type { CoherenceZone } from "@/types";

const ZONES: CoherenceZone[] = ["scattered", "building", "coherent"];

export function zoneProportions(
  zoneSeconds: Record<CoherenceZone, number>,
): Record<CoherenceZone, number> {
  const total = ZONES.reduce((sum, z) => sum + zoneSeconds[z], 0);
  if (total === 0) return { scattered: 0, building: 0, coherent: 0 };
  return {
    scattered: zoneSeconds.scattered / total,
    building: zoneSeconds.building / total,
    coherent: zoneSeconds.coherent / total,
  };
}
