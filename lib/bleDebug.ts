export interface BleDebugPacket {
  ts: number;
  hex: string;
  hr: number;
  hasRR: boolean;
  rr: number[];
}

const MAX = 80;
let packets: BleDebugPacket[] = [];
const listeners = new Set<() => void>();

export function pushDebugPacket(packet: BleDebugPacket): void {
  packets = packets.length >= MAX ? [...packets.slice(1), packet] : [...packets, packet];
  listeners.forEach((l) => l());
}

export function getDebugPackets(): BleDebugPacket[] {
  return packets;
}

export function subscribeDebug(fn: () => void): () => void {
  listeners.add(fn);
  return () => { listeners.delete(fn); };
}

export function clearDebugPackets(): void {
  packets = [];
  listeners.forEach((l) => l());
}
