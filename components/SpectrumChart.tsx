"use client";

import { useEffect, useRef } from "react";
import { useTrainerStore } from "@/lib/store";
import { panelMode } from "@/lib/panelState";
import { FS, N, SPECTRUM_BAND } from "@/lib/constants";
import PanelState from "@/components/PanelState";

const BIN_HZ = FS / N; // 0.015625 Hz
const TOP_PAD = 4; // px so the tallest bar doesn't touch the top edge
const BAND_HALF_BPM = 0.75; // target band half-width, in breaths/min
const AXIS_BPM = [6, 12, 18]; // x-axis ticks — same positions as 0.1/0.2/0.3 Hz

/** Percentage (0–100) of the chart width for a given frequency. */
function freqToX(freqHz: number): number {
  return ((freqHz - SPECTRUM_BAND.lo) / (SPECTRUM_BAND.hi - SPECTRUM_BAND.lo)) * 100;
}

export default function SpectrumChart() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const spectrum = useTrainerStore((s) => s.coherence.spectrum);
  const peakFreqHz = useTrainerStore((s) => s.coherence.peakFreqHz);
  const ready = useTrainerStore((s) => s.coherence.ready);
  const zone = useTrainerStore((s) => s.coherence.zone);
  const pace = useTrainerStore((s) => s.pace);
  const status = useTrainerStore((s) => s.connection.status);
  const progress = useTrainerStore((s) => s.coherence.progress);

  const mode = panelMode(status, ready);

  // Redraw on change (~1 Hz) rather than a perpetual rAF loop: the spectrum is
  // static between updates, unlike the scrolling sibling charts. The canvas is
  // only mounted in `live` mode, so this bails until then.
  useEffect(() => {
    const canvas = canvasRef.current;
    if (canvas === null) return;
    const ctx = canvas.getContext("2d");
    if (ctx === null) return;

    let cssW = 0;
    let cssH = 0;

    const fit = (): void => {
      const dpr = window.devicePixelRatio || 1;
      const rect = canvas.getBoundingClientRect();
      cssW = rect.width;
      cssH = rect.height;
      canvas.width = Math.max(1, Math.round(cssW * dpr));
      canvas.height = Math.max(1, Math.round(cssH * dpr));
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    const styles = getComputedStyle(document.documentElement);
    const faint = styles.getPropertyValue("--fg-faint").trim() || "#4d5667";
    const zoneColor = styles.getPropertyValue(`--zone-${zone}`).trim() || "#6b7ba8";

    const xOf = (freqHz: number): number => (freqToX(freqHz) / 100) * cssW;

    const draw = (): void => {
      ctx.clearRect(0, 0, cssW, cssH);
      if (spectrum.length === 0) return;

      // Target band: where your peak should land, around the breathing pace.
      const paceHz = pace / 60;
      const halfHz = BAND_HALF_BPM / 60;
      const bandX0 = xOf(paceHz - halfHz);
      const bandX1 = xOf(paceHz + halfHz);
      ctx.fillStyle = zoneColor + "14";
      ctx.fillRect(bandX0, 0, Math.max(bandX1 - bandX0, 1), cssH);

      // Bars
      const maxPower = Math.max(...spectrum.map((b) => b.power), 1e-9);
      const usableH = cssH - TOP_PAD;
      const barW = (cssW / spectrum.length) * 0.7;

      for (const bin of spectrum) {
        const h = Math.max((bin.power / maxPower) * usableH, 1);
        const cx = xOf(bin.freqHz);
        const isPeak = Math.abs(bin.freqHz - peakFreqHz) <= BIN_HZ * 0.6;
        ctx.fillStyle = isPeak ? zoneColor : faint;
        ctx.globalAlpha = isPeak ? 0.95 : 0.3;
        ctx.fillRect(cx - barW / 2, cssH - h, barW, h);
      }
      ctx.globalAlpha = 1;
    };

    fit();
    draw();

    const ro = new ResizeObserver(() => {
      fit();
      draw();
    });
    ro.observe(canvas);

    return () => {
      ro.disconnect();
    };
  }, [spectrum, peakFreqHz, ready, zone, pace]);

  if (mode !== "live") {
    return (
      <div role="img" aria-label="HRV power spectrum" className="h-44 w-full">
        <PanelState mode={mode} progress={progress} />
      </div>
    );
  }

  const peakBpm = peakFreqHz > 0 ? (peakFreqHz * 60).toFixed(1) : null;

  return (
    <div
      role="img"
      aria-label="HRV power spectrum, breaths per minute"
      className="relative flex h-44 w-full flex-col"
    >
      {peakBpm !== null ? (
        <span
          className="absolute right-0 top-0 z-10 tnum text-[0.6rem] tracking-wide"
          style={{ color: "var(--zone)" }}
        >
          peak {peakBpm} /min
        </span>
      ) : null}
      <canvas ref={canvasRef} className="min-h-0 w-full flex-1" />
      {/* HTML axis so the labels aren't subject to canvas scaling */}
      <div className="relative h-4 w-full shrink-0">
        {AXIS_BPM.map((b) => (
          <span
            key={b}
            className="absolute -translate-x-1/2 text-[0.6rem] tabular-nums"
            style={{ left: `${freqToX(b / 60)}%`, color: "var(--fg-faint)" }}
          >
            {b}
          </span>
        ))}
        <span
          className="absolute right-0 text-[0.55rem] uppercase tracking-[0.1em]"
          style={{ color: "var(--fg-faint)" }}
        >
          br/min
        </span>
      </div>
      <span className="visually-hidden">
        HRV power spectrum across breathing rates from about 2 to 24 breaths per minute.
        The bar at the peak frequency is highlighted, and the shaded band marks your
        current breathing pace.
      </span>
    </div>
  );
}
