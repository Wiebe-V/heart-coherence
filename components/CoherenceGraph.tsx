"use client";

import { useEffect, useRef } from "react";
import type { ZoneThresholds } from "@/types";
import { getSamples } from "@/lib/coherenceBuffer";
import { useTrainerStore } from "@/lib/store";
import { DEFAULT_ZONE_THRESHOLDS, COHERENCE_HISTORY_S } from "@/lib/constants";
import MetricPanel from "@/components/MetricPanel";

const PADDING = 8;

interface CoherenceGraphProps {
  thresholds?: ZoneThresholds;
}

export default function CoherenceGraph({ thresholds = DEFAULT_ZONE_THRESHOLDS }: CoherenceGraphProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  // Subscribe for the panel value label (1 Hz re-render is fine here)
  const coherence = useTrainerStore((s) => s.coherence);
  const { building, coherent } = thresholds;

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

    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(canvas);

    const rootStyle = getComputedStyle(document.documentElement);
    const faintColor = rootStyle.getPropertyValue("--fg-faint").trim() || "#4d5667";
    const buildingColor = rootStyle.getPropertyValue("--zone-building").trim() || "#4ec5c1";
    const coherentColor = rootStyle.getPropertyValue("--zone-coherent").trim() || "#6fcf8e";

    let cachedZone = "";
    let zoneColor = "#6b7ba8";
    let rafId = 0;

    const draw = (): void => {
      ctx.clearRect(0, 0, cssW, cssH);

      const usableH = cssH - PADDING * 2;
      const yOf = (score: number) => PADDING + (1 - score / 100) * usableH;

      const currentZone = useTrainerStore.getState().coherence.zone;
      if (currentZone !== cachedZone) {
        cachedZone = currentZone;
        zoneColor =
          rootStyle.getPropertyValue(`--zone-${currentZone}`).trim() || "#6b7ba8";
      }

      // Faint threshold guide lines
      ctx.lineWidth = 1;
      ctx.strokeStyle = buildingColor + "28";
      ctx.beginPath();
      ctx.moveTo(0, yOf(building));
      ctx.lineTo(cssW, yOf(building));
      ctx.stroke();

      ctx.strokeStyle = coherentColor + "28";
      ctx.beginPath();
      ctx.moveTo(0, yOf(coherent));
      ctx.lineTo(cssW, yOf(coherent));
      ctx.stroke();

      const samples = getSamples();

      if (samples.length < 2) {
        ctx.strokeStyle = "rgba(255,255,255,0.06)";
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(0, yOf(0));
        ctx.lineTo(cssW, yOf(0));
        ctx.stroke();

        ctx.fillStyle = faintColor;
        ctx.font = "11px sans-serif";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText("collecting…", cssW / 2, cssH / 2);
        rafId = window.requestAnimationFrame(draw);
        return;
      }

      const now = performance.now();
      const windowMs = COHERENCE_HISTORY_S * 1000;
      const t0 = now - windowMs;
      const windowed = samples.filter((s) => s.t >= t0);

      if (windowed.length < 2) {
        rafId = window.requestAnimationFrame(draw);
        return;
      }

      const xOf = (t: number) => ((t - t0) / windowMs) * cssW;

      const first = windowed[0]!;
      const last = windowed[windowed.length - 1]!;

      // Gradient fill under the line
      const gradient = ctx.createLinearGradient(0, 0, 0, cssH);
      gradient.addColorStop(0, zoneColor + "40");
      gradient.addColorStop(1, zoneColor + "00");

      ctx.beginPath();
      ctx.moveTo(xOf(first.t), yOf(first.score));
      for (let i = 1; i < windowed.length; i++) {
        ctx.lineTo(xOf(windowed[i]!.t), yOf(windowed[i]!.score));
      }
      ctx.lineTo(xOf(last.t), cssH);
      ctx.lineTo(xOf(first.t), cssH);
      ctx.closePath();
      ctx.fillStyle = gradient;
      ctx.fill();

      // Line stroke
      ctx.beginPath();
      ctx.moveTo(xOf(first.t), yOf(first.score));
      for (let i = 1; i < windowed.length; i++) {
        ctx.lineTo(xOf(windowed[i]!.t), yOf(windowed[i]!.score));
      }
      ctx.strokeStyle = zoneColor;
      ctx.lineWidth = 2;
      ctx.lineJoin = "round";
      ctx.lineCap = "round";
      ctx.globalAlpha = 0.9;
      ctx.stroke();
      ctx.globalAlpha = 1;

      rafId = window.requestAnimationFrame(draw);
    };

    rafId = window.requestAnimationFrame(draw);

    return () => {
      window.cancelAnimationFrame(rafId);
      ro.disconnect();
    };
  }, [building, coherent]);

  const scoreLabel = coherence.ready ? Math.round(coherence.score) : null;

  return (
    <MetricPanel
      title="coherence over time"
      value={scoreLabel !== null ? <span className="tnum text-sm text-zone">{scoreLabel}</span> : undefined}
    >
      <div role="img" aria-label="coherence score over time" className="h-24">
        <canvas ref={canvasRef} className="h-full w-full" />
        <span className="visually-hidden">
          Line graph of coherence score over the last three minutes. Y-axis: 0 to 100.
        </span>
      </div>
    </MetricPanel>
  );
}
