import type { CoherenceZone } from "@/types";
import { ZONE_POINTS } from "@/lib/constants";

/** Points earned for one second spent in the given coherence zone. */
export function zonePoints(zone: CoherenceZone): number {
  return ZONE_POINTS[zone];
}

/** Whether accrued achievement points have reached the session goal. */
export function goalReached(points: number, goal: number): boolean {
  return points >= goal;
}
