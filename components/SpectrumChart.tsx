"use client";

import { useTrainerStore } from "@/lib/store";
import { FS, N, SPECTRUM_BAND } from "@/lib/constants";

const BIN_HZ = FS / N; // 0.015625 Hz
const CHART_H = 48;
const LABEL_H = 8;
const TOTAL_H = CHART_H + LABEL_H;

function freqToX(freqHz: number): number {
  return ((freqHz - SPECTRUM_BAND.lo) / (SPECTRUM_BAND.hi - SPECTRUM_BAND.lo)) * 100;
}

export default function SpectrumChart() {
  const spectrum = useTrainerStore((s) => s.coherence.spectrum);
  const peakFreqHz = useTrainerStore((s) => s.coherence.peakFreqHz);
  const ready = useTrainerStore((s) => s.coherence.ready);

  const maxPower = spectrum.length > 0 ? Math.max(...spectrum.map((b) => b.power)) : 1;
  const barSpacing = spectrum.length > 0 ? 95 / spectrum.length : 4;
  const barW = barSpacing * 0.75;

  return (
    <div role="img" aria-label="HRV power spectrum" className="h-16 w-full">
      <svg
        viewBox={`0 0 100 ${TOTAL_H}`}
        preserveAspectRatio="none"
        className="h-full w-full"
        aria-hidden="true"
      >
        {!ready ? (
          <>
            {[0.06, 0.1, 0.15, 0.2, 0.25, 0.3, 0.35].map((f) => (
              <rect
                key={f}
                x={freqToX(f) - barW / 2}
                y={CHART_H - 3}
                width={barW}
                height={3}
                fill="var(--fg-faint)"
                opacity={0.2}
              />
            ))}
            <text
              x="50"
              y={CHART_H / 2 + 2}
              textAnchor="middle"
              fontSize="5"
              fill="var(--fg-faint)"
            >
              collecting…
            </text>
          </>
        ) : (
          spectrum.map((bin, i) => {
            const h = maxPower > 0 ? (bin.power / maxPower) * CHART_H : 0;
            const isPeak = Math.abs(bin.freqHz - peakFreqHz) <= BIN_HZ * 0.6;
            const x = freqToX(bin.freqHz);
            return (
              <rect
                key={i}
                x={x - barW / 2}
                y={CHART_H - Math.max(h, 0.5)}
                width={barW}
                height={Math.max(h, 0.5)}
                fill={isPeak ? "var(--zone)" : "var(--fg-faint)"}
                opacity={isPeak ? 0.9 : 0.3}
              />
            );
          })
        )}
        {/* X-axis labels */}
        <text x={freqToX(0.1)} y={TOTAL_H} textAnchor="middle" fontSize="4.5" fill="var(--fg-faint)">
          0.1
        </text>
        <text x={freqToX(0.2)} y={TOTAL_H} textAnchor="middle" fontSize="4.5" fill="var(--fg-faint)">
          0.2
        </text>
        <text x={freqToX(0.3)} y={TOTAL_H} textAnchor="middle" fontSize="4.5" fill="var(--fg-faint)">
          0.3
        </text>
      </svg>
      <span className="visually-hidden">
        HRV power spectrum from 0.04 to 0.4 Hz. The bar at the peak frequency is highlighted.
      </span>
    </div>
  );
}
