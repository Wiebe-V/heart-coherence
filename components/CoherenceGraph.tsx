"use client";

import { useEffect, useRef } from "react";
import type { CoherenceZone, ZoneThresholds } from "@/types";
import { getSamples } from "@/lib/coherenceBuffer";
import { useTrainerStore } from "@/lib/store";
import { panelMode } from "@/lib/panelState";
import { THEME_CHANGE_EVENT } from "@/lib/theme";
import { DEFAULT_ZONE_THRESHOLDS, COHERENCE_HISTORY_S } from "@/lib/constants";
import MetricPanel from "@/components/MetricPanel";
import PanelState from "@/components/PanelState";
import InfoBubble from "@/components/InfoBubble";
import { INFO } from "@/lib/infoText";

const PADDING = 8;

interface CoherenceGraphProps {
  thresholds?: ZoneThresholds;
}

export default function CoherenceGraph({ thresholds = DEFAULT_ZONE_THRESHOLDS }: CoherenceGraphProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  // Subscribe for the panel value label (1 Hz re-render is fine here)
  const coherence = useTrainerStore((s) => s.coherence);
  const status = useTrainerStore((s) => s.connection.status);
  const { building, coherent } = thresholds;
  const mode = panelMode(status, coherence.ready);

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

    // Colors come from CSS variables so they follow the theme. getComputedStyle
    // returns a live object; re-read on theme change so a live switch updates.
    const rootStyle = getComputedStyle(document.documentElement);
    let scatteredColor = "";
    let buildingColor = "";
    let coherentColor = "";
    let lineColor = "";
    let cachedZone = "";
    let zoneColor = "#6b7ba8";
    const readColors = (): void => {
      scatteredColor = rootStyle.getPropertyValue("--zone-scattered").trim() || "#6b7ba8";
      buildingColor = rootStyle.getPropertyValue("--zone-building").trim() || "#4ec5c1";
      coherentColor = rootStyle.getPropertyValue("--zone-coherent").trim() || "#6fcf8e";
      lineColor = rootStyle.getPropertyValue("--line").trim() || "rgba(255,255,255,0.06)";
      cachedZone = ""; // force zoneColor to re-read on the next frame
    };
    readColors();
    window.addEventListener(THEME_CHANGE_EVENT, readColors);

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

      const samples = getSamples();

      if (samples.length < 2) {
        // Bare baseline; the <PanelState> overlay owns "connect"/"warming up"
        // messaging while the first window fills.
        ctx.strokeStyle = lineColor;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(0, yOf(0));
        ctx.lineTo(cssW, yOf(0));
        ctx.stroke();
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

      // Zone bands — three calm swim lanes so the trace's zone reads at a
      // glance. The current zone brightens; the others stay a faint wash,
      // echoing the ZoneBar's "you are here" language. Drawn only alongside a
      // live trace — never behind the empty "connect" state.
      const bandAlpha = (z: CoherenceZone): string => (currentZone === z ? "52" : "2b");
      const band = (yTop: number, yBot: number, color: string, z: CoherenceZone): void => {
        ctx.fillStyle = color + bandAlpha(z);
        ctx.fillRect(0, yTop, cssW, yBot - yTop);
      };
      band(0, yOf(coherent), coherentColor, "coherent");
      band(yOf(coherent), yOf(building), buildingColor, "building");
      band(yOf(building), cssH, scatteredColor, "scattered");

      // Threshold seams — where one zone hands off to the next.
      ctx.lineWidth = 1;
      ctx.strokeStyle = buildingColor + "5c";
      ctx.beginPath();
      ctx.moveTo(0, yOf(building));
      ctx.lineTo(cssW, yOf(building));
      ctx.stroke();

      ctx.strokeStyle = coherentColor + "5c";
      ctx.beginPath();
      ctx.moveTo(0, yOf(coherent));
      ctx.lineTo(cssW, yOf(coherent));
      ctx.stroke();

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
      window.removeEventListener(THEME_CHANGE_EVENT, readColors);
    };
  }, [building, coherent]);

  const scoreLabel = coherence.ready ? Math.round(coherence.score) : null;

  return (
    <MetricPanel
      title="coherence over time"
      info={<InfoBubble {...INFO.coherenceOverTime} />}
      value={scoreLabel !== null ? <span className="tnum text-sm text-zone">{scoreLabel}</span> : undefined}
    >
      <div role="img" aria-label="coherence score over time" className="relative h-24">
        <canvas ref={canvasRef} className="h-full w-full" />
        {mode !== "live" ? (
          <div className="absolute inset-0">
            <PanelState mode={mode} progress={coherence.progress} />
          </div>
        ) : null}
        <span className="visually-hidden">
          Line graph of coherence score over the last three minutes. Y-axis: 0 to 100.
        </span>
      </div>
    </MetricPanel>
  );
}
