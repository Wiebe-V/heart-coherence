import { describe, it, expect } from "vitest";
import { fft } from "@/lib/fft";

describe("fft", () => {
  it("DC input puts all energy in bin 0", () => {
    const n = 8;
    const re = new Float64Array(n).fill(1);
    const im = new Float64Array(n);
    fft(re, im);
    expect(re[0]).toBeCloseTo(8, 6);
    expect(im[0]).toBeCloseTo(0, 6);
    for (let k = 1; k < n; k++) {
      expect(Math.hypot(re[k]!, im[k]!)).toBeCloseTo(0, 6);
    }
  });

  it("pure cosine at bin m concentrates power at k=m and k=n-m", () => {
    const n = 16, m = 3;
    const re = new Float64Array(n);
    const im = new Float64Array(n);
    for (let i = 0; i < n; i++) re[i] = Math.cos((2 * Math.PI * m * i) / n);
    fft(re, im);
    const power = Array.from({ length: n }, (_, k) => re[k]! ** 2 + im[k]! ** 2);
    const peak = power.indexOf(Math.max(...power));
    expect([m, n - m]).toContain(peak);
  });
});
