"use client";

import { useEffect, useRef } from "react";
import { getBeats, nowOnTimeline } from "@/lib/beatBuffer";

const WINDOW_MS = 30_000; // last ~30 s of HR
const PADDING = 6; // px breathing room top/bottom

/**
 * A self-contained live heart-rate waveform. It owns a single requestAnimation-
 * Frame loop that reads the beat buffer DIRECTLY each frame and repaints — beats
 * never pass through React state, so this triggers zero re-renders. The canvas
 * is DPR-aware and refits via ResizeObserver. Empty buffer → flat baseline with
 * a faint "waiting for beats" hint.
 */
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

    // Resolve the muted accent + faint colors from CSS once per frame is fine,
    // but reading getComputedStyle every frame is wasteful — cache and refresh
    // lazily. The accent follows --fg-muted (quiet, not the zone color).
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

      // Window the beats to the last ~30 s.
      const windowed = beats.filter((b) => b.t >= t0);

      if (windowed.length < 2 || now === 0) {
        // Empty / waiting state: a flat baseline + hint.
        ctx.strokeStyle = line;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(0, midY);
        ctx.lineTo(cssW, midY);
        ctx.stroke();

        ctx.fillStyle = faint;
        ctx.font = "11px var(--font-geist-sans), sans-serif";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText("waiting for beats", cssW / 2, midY - 12);

        rafId = window.requestAnimationFrame(draw);
        return;
      }

      // Auto-scale HR to fit, with a little headroom so it never clips.
      let lo = Infinity;
      let hi = -Infinity;
      for (const b of windowed) {
        if (b.hr < lo) lo = b.hr;
        if (b.hr > hi) hi = b.hr;
      }
      // Guard against a flat trace (lo === hi).
      const span = hi - lo;
      const pad = span < 1 ? 5 : span * 0.15;
      lo -= pad;
      hi += pad;
      const range = hi - lo || 1;

      const usableH = cssH - PADDING * 2;
      const xOf = (t: number): number => ((t - t0) / WINDOW_MS) * cssW;
      const yOf = (hr: number): number => PADDING + (1 - (hr - lo) / range) * usableH;

      // Smooth scrolling line via quadratic midpoints between samples.
      ctx.strokeStyle = accent;
      ctx.globalAlpha = 0.85;
      ctx.lineWidth = 1.5;
      ctx.lineJoin = "round";
      ctx.lineCap = "round";
      ctx.beginPath();

      const first = windowed[0];
      if (first !== undefined) {
        ctx.moveTo(xOf(first.t), yOf(first.hr));
        for (let i = 1; i < windowed.length; i += 1) {
          const prev = windowed[i - 1];
          const cur = windowed[i];
          if (prev === undefined || cur === undefined) continue;
          const mx = (xOf(prev.t) + xOf(cur.t)) / 2;
          const my = (yOf(prev.hr) + yOf(cur.hr)) / 2;
          ctx.quadraticCurveTo(xOf(prev.t), yOf(prev.hr), mx, my);
        }
        const last = windowed[windowed.length - 1];
        if (last !== undefined) ctx.lineTo(xOf(last.t), yOf(last.hr));
      }
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
    <div
      role="img"
      aria-label="live heart-rate waveform"
      className="h-16 w-full max-w-md sm:h-20"
    >
      <canvas ref={canvasRef} className="h-full w-full" />
      <span className="visually-hidden">
        A scrolling line showing your instantaneous heart rate over the last thirty seconds.
      </span>
    </div>
  );
}
