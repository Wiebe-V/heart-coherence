import { useEffect, useRef } from "react";
import type { ZoneThresholds } from "@/types";
import { useTrainerStore } from "@/lib/store";
import { computeCoherence } from "@/lib/coherence";
import { getBeats, nowOnTimeline } from "@/lib/beatBuffer";
import { pushSample } from "@/lib/coherenceBuffer";
import { DEFAULT_ZONE_THRESHOLDS } from "@/lib/constants";

/**
 * Once the sensor is connected, recomputes the coherence metric ~1× per second
 * and pushes the result to the store, coherenceBuffer, and zoneSeconds counter.
 * The EMA carry-over (`prevScore`) is held in a ref so it never triggers a
 * re-render, and resets whenever we leave the connected state.
 */
export function useCoherence(thresholds: ZoneThresholds = DEFAULT_ZONE_THRESHOLDS): void {
  const status = useTrainerStore((s) => s.connection.status);
  const prevScoreRef = useRef<number | null>(null);
  const { building, coherent } = thresholds;

  useEffect(() => {
    if (status !== "connected") {
      prevScoreRef.current = null;
      return;
    }
    const interval = setInterval(() => {
      const result = computeCoherence(getBeats(), nowOnTimeline(), prevScoreRef.current, {
        building,
        coherent,
      });
      if (result.ready) {
        prevScoreRef.current = result.score;
        pushSample(result.score, result.zone, performance.now());
        useTrainerStore.getState().bumpZoneSecond(result.zone);
      }
      useTrainerStore.getState().setCoherence(result);
    }, 1000);

    return () => {
      clearInterval(interval);
    };
  }, [status, building, coherent]);
}
