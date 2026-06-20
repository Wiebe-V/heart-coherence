import type { SourceMode } from "@/types";
import { pushRR } from "@/lib/beatBuffer";

export interface BeatSource {
  readonly mode: SourceMode;
  start(): Promise<void>;
  stop(): void;
}

/**
 * Pure helper: IBI (ms) of a ~0.1 Hz resonance sine at `elapsedMs` into the session.
 * meanIbi + amp * sin(2π * freqHz * elapsedMs / 1000)
 */
export function simulatedIbiAt(
  elapsedMs: number,
  meanIbi = 850,
  amp = 60,
  freqHz = 0.1,
): number {
  return meanIbi + amp * Math.sin(2 * Math.PI * freqHz * (elapsedMs / 1000));
}

export class SimulatedSource implements BeatSource {
  readonly mode: SourceMode = "simulator";

  private timer: ReturnType<typeof setTimeout> | null = null;
  private elapsedMs = 0;
  private running = false;

  start(): Promise<void> {
    this.running = true;
    this.elapsedMs = 0;
    this.scheduleTick();
    return Promise.resolve();
  }

  stop(): void {
    this.running = false;
    if (this.timer !== null) {
      clearTimeout(this.timer);
      this.timer = null;
    }
  }

  private scheduleTick(): void {
    const ibi = simulatedIbiAt(this.elapsedMs);
    this.timer = setTimeout(() => {
      if (!this.running) return;
      pushRR([ibi], performance.now());
      this.elapsedMs += ibi;
      this.scheduleTick();
    }, ibi);
  }
}

export class BleHeartRateSource implements BeatSource {
  readonly mode: SourceMode = "ble";

  start(): Promise<void> {
    return Promise.reject(new Error("BLE transport not implemented yet"));
  }

  stop(): void {
    // no-op: stub
  }
}
