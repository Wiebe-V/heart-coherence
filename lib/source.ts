import type { ConnectionState, SourceMode } from "@/types";
import { pushRR } from "@/lib/beatBuffer";
import { parseHeartRate } from "@/lib/ble";
import { HR_SERVICE, HR_MEASUREMENT } from "@/lib/constants";

export interface SourceCallbacks {
  onHr?: (hr: number) => void;
  onConnectionState?: (state: ConnectionState) => void;
}

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
  private readonly callbacks: SourceCallbacks;

  constructor(callbacks: SourceCallbacks = {}) {
    this.callbacks = callbacks;
  }

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
      this.callbacks.onHr?.(60000 / ibi);
      this.elapsedMs += ibi;
      this.scheduleTick();
    }, ibi);
  }
}

const GRACE_MS = 6000;

export class BleHeartRateSource implements BeatSource {
  readonly mode: SourceMode = "ble";

  private readonly callbacks: SourceCallbacks;
  private device: BluetoothDevice | null = null;
  private char: BluetoothRemoteGATTCharacteristic | null = null;
  private graceTimer: ReturnType<typeof setTimeout> | null = null;
  private sawRR = false;

  private readonly onValueChanged = (event: Event): void => {
    const value = (event.target as BluetoothRemoteGATTCharacteristic).value;
    if (!value) return;
    const packet = parseHeartRate(value);
    this.callbacks.onHr?.(packet.hr);
    if (packet.hasRR && packet.rr.length) {
      // First RR ever: recover the connection state in case the grace timer
      // already downgraded us to "no-rr" before this (slow-starting) strap began
      // emitting beats. Idempotent if we're already "connected".
      if (!this.sawRR) {
        this.sawRR = true;
        this.callbacks.onConnectionState?.({ status: "connected", deviceName: this.device?.name });
      }
      pushRR(packet.rr, performance.now());
    }
  };

  private readonly onDisconnected = (): void => {
    this.callbacks.onConnectionState?.({
      status: "disconnected",
      deviceName: this.device?.name,
    });
  };

  constructor(callbacks: SourceCallbacks = {}) {
    this.callbacks = callbacks;
  }

  async start(): Promise<void> {
    if (typeof navigator === "undefined" || !navigator.bluetooth) {
      throw new Error("Web Bluetooth is not available");
    }

    const device = await navigator.bluetooth.requestDevice({
      filters: [{ services: [HR_SERVICE] }],
    });
    this.device = device;

    device.addEventListener("gattserverdisconnected", this.onDisconnected);
    this.callbacks.onConnectionState?.({ status: "connecting", deviceName: device.name });

    const gatt = device.gatt;
    if (!gatt) throw new Error("No GATT server on device");

    const server = await gatt.connect();
    const service = await server.getPrimaryService(HR_SERVICE);
    const char = await service.getCharacteristic(HR_MEASUREMENT);
    this.char = char;

    char.addEventListener("characteristicvaluechanged", this.onValueChanged);
    await char.startNotifications();
    this.callbacks.onConnectionState?.({ status: "connected", deviceName: device.name });

    this.graceTimer = setTimeout(() => {
      if (!this.sawRR) {
        this.callbacks.onConnectionState?.({
          status: "no-rr",
          deviceName: device.name,
          message: "This strap isn't sending beat-to-beat data.",
        });
      }
    }, GRACE_MS);
  }

  stop(): void {
    if (this.graceTimer !== null) {
      clearTimeout(this.graceTimer);
      this.graceTimer = null;
    }
    if (this.char) {
      this.char.removeEventListener("characteristicvaluechanged", this.onValueChanged);
      this.char.stopNotifications().catch(() => {});
      this.char = null;
    }
    if (this.device) {
      this.device.removeEventListener("gattserverdisconnected", this.onDisconnected);
      this.device.gatt?.disconnect();
      this.device = null;
    }
    this.sawRR = false;
  }
}
