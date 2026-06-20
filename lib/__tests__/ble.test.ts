import { describe, it, expect } from "vitest";
import { parseHeartRate } from "@/lib/ble";

function view(bytes: number[]): DataView {
  return new DataView(new Uint8Array(bytes).buffer);
}
// RR raw is uint16 LE in 1/1024 s. 1024 -> 1000 ms. LE bytes of 1024 = [0x00, 0x04].
const RR_1024_LE = [0x00, 0x04];

describe("parseHeartRate", () => {
  it("uint8 HR, no RR (flags=0x00)", () => {
    const p = parseHeartRate(view([0x00, 70]));
    expect(p.hr).toBe(70);
    expect(p.hasRR).toBe(false);
    expect(p.rr).toEqual([]);
  });
  it("uint16 HR (flags bit0=1)", () => {
    const p = parseHeartRate(view([0x01, 0x2c, 0x01])); // 300
    expect(p.hr).toBe(300);
    expect(p.hasRR).toBe(false);
  });
  it("single RR present (flags bit4=1) converts 1/1024 s -> ms", () => {
    const p = parseHeartRate(view([0x10, 70, ...RR_1024_LE]));
    expect(p.hasRR).toBe(true);
    expect(p.rr).toHaveLength(1);
    expect(p.rr[0]).toBeCloseTo(1000, 6);
  });
  it("multiple RR intervals in one packet", () => {
    const p = parseHeartRate(view([0x10, 70, ...RR_1024_LE, 0x00, 0x02])); // 512 -> 500ms
    expect(p.rr).toHaveLength(2);
    expect(p.rr[0]).toBeCloseTo(1000, 6);
    expect(p.rr[1]).toBeCloseTo(500, 6);
  });
  it("energy-expended present (bit3) is skipped before RR", () => {
    const p = parseHeartRate(view([0x18, 70, 0xaa, 0xbb, ...RR_1024_LE])); // bit3+bit4
    expect(p.energyExpended).toBe(0xbbaa);
    expect(p.rr).toHaveLength(1);
    expect(p.rr[0]).toBeCloseTo(1000, 6);
  });
  it("uint16 HR + EE + multiple RR all together", () => {
    const p = parseHeartRate(view([0x19, 0x48, 0x00, 0xaa, 0xbb, ...RR_1024_LE, 0x00, 0x02]));
    expect(p.hr).toBe(0x48);
    expect(p.energyExpended).toBe(0xbbaa);
    expect(p.rr).toHaveLength(2);
  });
  it("no RR flag: hasRR false even if trailing bytes exist is N/A; with bit4 unset returns empty", () => {
    const p = parseHeartRate(view([0x00, 0x50]));
    expect(p.hasRR).toBe(false);
    expect(p.rr).toEqual([]);
  });
});
