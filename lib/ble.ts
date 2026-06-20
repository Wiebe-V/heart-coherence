import type { HeartRatePacket } from "@/types";

const RR_UNIT_MS = 1000 / 1024;

/** Parse one heart_rate_measurement (0x2A37) notification value. Pure. */
export function parseHeartRate(view: DataView): HeartRatePacket {
  const flags = view.getUint8(0);
  const hr16 = (flags & 0x01) !== 0;
  const hasEE = (flags & 0x08) !== 0;
  const hasRR = (flags & 0x10) !== 0;

  let offset = 1;
  let hr: number;
  if (hr16) {
    hr = view.getUint16(offset, true);
    offset += 2;
  } else {
    hr = view.getUint8(offset);
    offset += 1;
  }

  let energyExpended: number | undefined;
  if (hasEE) {
    energyExpended = view.getUint16(offset, true);
    offset += 2;
  }

  const rr: number[] = [];
  if (hasRR) {
    for (; offset + 1 < view.byteLength; offset += 2) {
      rr.push(view.getUint16(offset, true) * RR_UNIT_MS);
    }
  }

  return { hr, rr, hasRR, energyExpended };
}
