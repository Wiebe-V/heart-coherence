"use client";

import { useEffect, useRef } from "react";
import { getBeats, nowOnTimeline } from "@/lib/beatBuffer";
import MetricPanel from "@/components/MetricPanel";

const WINDOW_MS = 30_000;
const PADDING = 6;

export default function LiveWaveform() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

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

    const styles = getComputedStyle(document.documentElement);
    const accent = styles.getPropertyValue("--fg-muted").trim() || "#8b93a3";
    const faint = styles.getPropertyValue("--fg-faint").trim() || "#4d5667";
    const line = "rgba(255,255,255,0.06)";

    let rafId = 0;

    const draw = (): void => {
      ctx.clearRect(0, 0, cssW, cssH);

      const midY = cssH / 2;
      const beats = getBeats();
      const now = nowOnTimeline();
      const t0 = now - WINDOW_MS;

      const windowed = beats.filter((b) => b.t >= t0);

      if (windowed.length < 2 || now === 0) {
        ctx.strokeStyle = line;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(0, midY);
        ctx.lineTo(cssW, midY);
        ctx.stroke();

        ctx.fillStyle = faint;
        ctx.font = "11px sans-serif";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText("waiting for beats", cssW / 2, midY - 12);

        rafId = window.requestAnimationFrame(draw);
        return;
      }

      let lo = Infinity;
      let hi = -Infinity;
      for (const b of windowed) {
        if (b.hr < lo) lo = b.hr;
        if (b.hr > hi) hi = b.hr;
      }
      const span = hi - lo;
      const pad = span < 1 ? 5 : span * 0.15;
      lo -= pad;
      hi += pad;
      const range = hi - lo || 1;

      const usableH = cssH - PADDING * 2;
      const xOf = (t: number): number => ((t - t0) / WINDOW_MS) * cssW;
      const yOf = (hr: number): number => PADDING + (1 - (hr - lo) / range) * usableH;

      // Faint baseline grid
      ctx.strokeStyle = line;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(0, midY);
      ctx.lineTo(cssW, midY);
      ctx.stroke();

      // Gradient fill under the trace
      const gradient = ctx.createLinearGradient(0, 0, 0, cssH);
      gradient.addColorStop(0, accent + "30");
      gradient.addColorStop(1, accent + "00");

      const first = windowed[0]!;
      const last = windowed[windowed.length - 1]!;

      ctx.beginPath();
      ctx.moveTo(xOf(first.t), yOf(first.hr));
      for (let i = 1; i < windowed.length; i++) {
        const prev = windowed[i - 1]!;
        const cur = windowed[i]!;
        const mx = (xOf(prev.t) + xOf(cur.t)) / 2;
        const my = (yOf(prev.hr) + yOf(cur.hr)) / 2;
        ctx.quadraticCurveTo(xOf(prev.t), yOf(prev.hr), mx, my);
      }
      ctx.lineTo(xOf(last.t), yOf(last.hr));
      ctx.lineTo(xOf(last.t), cssH);
      ctx.lineTo(xOf(first.t), cssH);
      ctx.closePath();
      ctx.fillStyle = gradient;
      ctx.fill();

      // Trace line
      ctx.strokeStyle = accent;
      ctx.globalAlpha = 0.85;
      ctx.lineWidth = 1.5;
      ctx.lineJoin = "round";
      ctx.lineCap = "round";
      ctx.beginPath();
      ctx.moveTo(xOf(first.t), yOf(first.hr));
      for (let i = 1; i < windowed.length; i++) {
        const prev = windowed[i - 1]!;
        const cur = windowed[i]!;
        const mx = (xOf(prev.t) + xOf(cur.t)) / 2;
        const my = (yOf(prev.hr) + yOf(cur.hr)) / 2;
        ctx.quadraticCurveTo(xOf(prev.t), yOf(prev.hr), mx, my);
      }
      ctx.lineTo(xOf(last.t), yOf(last.hr));
      ctx.stroke();
      ctx.globalAlpha = 1;

      rafId = window.requestAnimationFrame(draw);
    };

    rafId = window.requestAnimationFrame(draw);

    return () => {
      window.cancelAnimationFrame(rafId);
      ro.disconnect();
    };
  }, []);

  return (
    <MetricPanel title="heart rhythm">
      <div role="img" aria-label="live heart-rate waveform" className="h-20">
        <canvas ref={canvasRef} className="h-full w-full" />
        <span className="visually-hidden">
          A scrolling line showing your instantaneous heart rate over the last thirty seconds.
        </span>
      </div>
    </MetricPanel>
  );
}
