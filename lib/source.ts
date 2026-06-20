import type { ConnectionState } from "@/types";
import { pushRR } from "@/lib/beatBuffer";
import { parseHeartRate } from "@/lib/ble";
import { HR_SERVICE, HR_MEASUREMENT } from "@/lib/constants";

export interface SourceCallbacks {
  onHr?: (hr: number) => void;
  onConnectionState?: (state: ConnectionState) => void;
}

const GRACE_MS = 6000;

export class BleHeartRateSource {
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
