# Coherence Monitor Redesign — Design

**Date:** 2026-06-20
**Status:** Approved (pending spec review)

## Problem

The trainer today is a calm **single-orb meditation screen**: the breathing orb is the
hero, coherence is a single large number, and the only graph is a quiet heart-rate
waveform. Real coherence programs (HeartMath emWave Pro / Inner Balance) are **data-rich
monitors** — multiple live graphs with the breath pacer demoted to a small companion
circle to the side. The current screen is also visually plain, still ships a
`SimulatedSource`, and the repo is managed with pnpm.

This redesign:

1. Shifts the identity from meditation screen → **coherence monitor dashboard**.
2. Adds graphs: a **coherence-over-time** line, the existing **heart-rhythm** waveform,
   and a **switchable bar chart** (power spectrum ↔ time-in-zone).
3. Demotes the breath pacer to a **smaller circle to the side** (split-screen layout).
4. **Removes the simulator** entirely.
5. **Migrates pnpm → bun.**
6. Polishes the visuals into a framed-panel dashboard while keeping the calm dark theme.

Non-goals: changing the coherence algorithm, the BLE transport, the resonance finder
logic, the IndexedDB session store, or the history page (beyond incidental restyling).

## Decisions (from brainstorming)

- **Layout:** Split screen — breath circle + controls on the **left**, the three graphs
  stacked on the **right**, with a full-width vitals strip on top.
- **Bar chart:** **Switchable** — a small toggle flips between the **power spectrum** and
  **time-in-zone**, defaulting to the power spectrum.
- **Vitals:** the large coherence score moves **up into the top strip** (out from under
  the orb).
- **Liveness:** graphs render **live on connect**, not gated behind "start session".

## Architecture

### Layout

```
+-------------------------------------------------------------+
|  VITALS STRIP: connection · coherence 62 · heart 72 · zone  |
+----------------------+--------------------------------------+
|  LEFT (~38%)         |  RIGHT (~62%)                        |
|                      |  +--------------------------------+  |
|   breathe            |  | heart rhythm        (panel)    |  |
|    ( O )             |  +--------------------------------+  |
|     in               |  | coherence over time (panel)    |  |
|                      |  +--------------------------------+  |
|   pace --o------     |  | [spectrum|zone]    (panel)     |  |
|   [ start session ]  |  +--------------------------------+  |
+----------------------+--------------------------------------+
```

- **Breakpoint:** at `>= 768px` (Tailwind `md`) the body is two columns; below it
  collapses to a single column in this order: vitals, breath circle, the three graph
  panels, controls.
- The split lives inside the existing `max-w` container in `Trainer.tsx`. The left column
  is vertically centered; the right column is a vertical stack with consistent gaps.

### Data flow

```
BLE strap --> beatBuffer (beats)
                 |                      (rAF, no React state)
                 +--> LiveWaveform (heart rhythm) ----------------+
                 |                                                |
useCoherence (1 Hz) reads beatBuffer:                            |
  computeCoherence(beats, now) -> CoherenceResult {              |
     score, zone, peakFreqHz, spectrum[]   <-- NEW spectrum      |
  }                                                              |
     |                                                          canvases
     +--> store.coherence (1 Hz)  --> VitalsHeader (score/bpm/zone)
     |                              --> SpectrumChart (reads coherence.spectrum)
     +--> coherenceBuffer.push(score, zone)  --> CoherenceGraph (rAF, no React state)
     +--> store.zoneSeconds[zone] += 1        --> ZoneTimeChart (1 Hz)
```

Two distinct rendering strategies, matching the existing codebase conventions:

- **Per-frame canvases that read a module buffer directly** (zero React re-render):
  `LiveWaveform` (heart rhythm) and the new `CoherenceGraph`. Each owns a single
  `requestAnimationFrame` loop, is DPR-aware, and refits via `ResizeObserver` — copying
  the established `LiveWaveform` pattern.
- **1 Hz store-subscribing components**: `VitalsHeader`, `SpectrumChart`, `ZoneTimeChart`.
  These update once per second from the store, which is cheap.

## New / changed modules

### New

- **`lib/coherenceBuffer.ts`** — a rolling history of coherence samples, mirroring the
  `lib/beatBuffer.ts` module shape exactly:
  - State: `samples: { t: number; score: number; zone: CoherenceZone }[]`.
  - `pushSample(score, zone, now)` — append; prune older than the display window.
  - `getSamples()` — live array (readers iterate directly; do not mutate).
  - `reset()` — clear (called on connect/disconnect).
  - `subscribe(fn)` — change notification (parity with beatBuffer, even if unused now).
  - Display window: `COHERENCE_HISTORY_S = 180` (3 min) — a new constant.

- **`components/CoherenceGraph.tsx`** — live line graph of the coherence score over the
  history window. Canvas + rAF reading `coherenceBuffer.getSamples()`. Y-axis fixed at
  `0..100`. Faint horizontal **guide lines at the zone thresholds** (`building`,
  `coherent`), each tinted with its zone color. Line stroke + soft gradient fill follow
  the **current** zone color. Empty state: flat baseline with a "collecting…" hint,
  matching `LiveWaveform`.

- **`components/SpectrumChart.tsx`** — vertical bar chart of HRV power across the display
  band, read from `store.coherence.spectrum`. Bars normalized to the current frame's max
  power. The bar nearest `coherence.peakFreqHz` is highlighted in the zone color; others
  are muted. X-axis labels at ~0.1 / 0.2 / 0.3 Hz. Not-ready state: muted flat bars with a
  "collecting…" hint. SVG (1 Hz updates → no canvas needed).

- **`components/ZoneTimeChart.tsx`** — three horizontal bars (scattered / building /
  coherent) sized by `store.zoneSeconds[zone] / totalSeconds`, each in its zone color,
  with the accumulated seconds (mm:ss) shown per row. Reads the store at 1 Hz.

- **`components/BarChartPanel.tsx`** — wraps the switchable bar chart: a small segmented
  toggle (`spectrum` / `zone`) holding local `useState`, rendering `SpectrumChart` or
  `ZoneTimeChart` inside a `MetricPanel`. Default: `spectrum`.

- **`components/MetricPanel.tsx`** — reusable framed card: faint border (`--line`),
  slightly elevated background (`--bg-elevated`), rounded corners, consistent padding, a
  small uppercase tracked **title** on the top-left and an optional live **value** slot on
  the top-right. Used by all three graph panels for a consistent dashboard frame.

- **`components/VitalsHeader.tsx`** — the top strip: compact connection control
  (`ConnectionButton`), the large coherence score (zone-accented), heart rate, and zone
  label. Absorbs the role of today's `CoherenceGauge` (which is removed).

### Changed

- **`components/Trainer.tsx`** — replaces the centered single-column hero with the
  split-screen layout above (vitals strip, left controls column, right graph stack);
  responsive collapse at `md`. Keeps `--zone` set at the screen root and the
  `app-atmosphere` background. Resonance finder + history link stay (relocated into the
  left column / footer).

- **`components/BreathOrb.tsx`** — add a `size` prop (CSS length) so it can render smaller
  in the side column (~`min(34vmin, 16rem)`), defaulting to its current hero size. The
  imperative pacer (`useBreathPacer` + `orbRef`) and reduced-motion ring are unchanged.

- **`components/LiveWaveform.tsx`** — restyle into a `MetricPanel` titled "heart rhythm";
  add a soft gradient fill under the trace and a faint baseline grid for polish. Drawing
  logic otherwise unchanged.

- **`components/ConnectionButton.tsx`** — remove the "try the simulator" buttons and the
  simulator fallbacks from the `no-rr`, `unsupported`, and `error` states; tighten copy
  for the header. The exhaustive `switch` over `ConnectionStatus` is preserved.

- **`components/CoherenceGauge.tsx`** — **removed**; its score/bpm/zone display moves into
  `VitalsHeader`.

- **`lib/store.ts`** — add `zoneSeconds: Record<CoherenceZone, number>` with a
  `bumpZoneSecond(zone)` action and reset in `resetSignal()`. Drop the `mode` field and
  `setMode` if nothing depends on them after the simulator removal (see Open question).

- **`lib/coherence.ts`** + **`types/index.ts`** — `CoherenceResult` gains
  `spectrum: SpectrumBin[]` where `SpectrumBin = { freqHz: number; power: number }`,
  populated from the existing `power[]` for bins within the display band
  (`SPECTRUM_BAND = { lo: 0.04, hi: 0.4 }`, ≈ the existing `TOTAL_BAND`). Empty/not-ready
  results return `spectrum: []`. No second FFT — the bins come from the same transform.

- **`hooks/useCoherence.ts`** — after computing each ready result, also
  `coherenceBuffer.pushSample(score, zone, now)` and `store.bumpZoneSecond(zone)`. The EMA
  reset on leaving `connected` is unchanged.

- **`hooks/useHeartRateSensor.ts`** — wherever it already calls `resetBeatBuffer()` +
  `store.resetSignal()` (on connect and disconnect), also `coherenceBuffer.reset()`, so the
  history buffer, the beat buffer, and `zoneSeconds` all clear together at the same points.

- **`lib/constants.ts`** — add `COHERENCE_HISTORY_S = 180` and
  `SPECTRUM_BAND = { lo: 0.04, hi: 0.4 }`.

### Removed (simulator)

- `SimulatedSource` and `simulatedIbiAt` from `lib/source.ts`.
- `connectSimulator` from `hooks/useHeartRateSensor.ts` (and its return type).
- The `"simulator"` member of `SourceMode` in `types/index.ts`. `SourceMode` becomes
  `"ble"` only; if `store.mode` is otherwise unused, drop the type and field together.
- All simulator UI/copy: `ConnectionButton` buttons + fallbacks, the `ResonanceFinder`
  empty-state line, the `SessionControls` doc comment.
- The simulator unit tests in `lib/__tests__/source.test.ts`.

## Tooling: pnpm → bun

- Delete `pnpm-lock.yaml` and `pnpm-workspace.yaml`.
- `bun install` to generate `bun.lock`.
- Keep `package.json` scripts (`next`, `eslint`, `tsc`, `vitest`); they run under
  `bun run <script>`. Update `README.md` to document `bun install` / `bun run dev` /
  `bun run test` / `bun run typecheck`.
- Update the project memory note (env-pnpm-wsl-chrome) from pnpm → bun.
- Per `AGENTS.md`, read the relevant guide under `node_modules/next/dist/docs/` before
  editing any Next-specific code.

## Aesthetics

Keep the calm dark theme and zone-color system. The polish comes from the **framed-panel
dashboard** treatment:

- Every graph sits in a `MetricPanel` (faint border, `--bg-elevated` fill, rounded
  corners, consistent padding, uppercase tracked title + live value).
- Graph strokes use the active zone color with a soft gradient fill; faint grid/axis
  hints; the coherence graph draws zone-threshold guide lines.
- Consistent spacing scale and type rhythm across the dashboard.
- The `frontend-design` skill is applied during implementation so the result reads as
  intentional, not templated.

## Accessibility & reduced motion

- Reduced motion keeps the static orb ring and calms decorative CSS transitions; data
  canvases still update (the motion is information, not decoration).
- Each `MetricPanel` is labelled by its title. Charts remain `aria-hidden` with a
  `visually-hidden` text equivalent, mirroring the current `LiveWaveform` pattern.
- Live numeric values (coherence score, HR) stay in `aria-live="polite"` regions.

## Testing

Pure logic is unit-tested with vitest; canvas/SVG rendering is not (jsdom can't paint).

- `coherenceBuffer`: push appends; pruning drops samples older than the window; `reset`
  clears.
- Spectrum extraction in `computeCoherence`: for a synthetic ~0.1 Hz input, the returned
  `spectrum` is non-empty, spans the display band, and its max-power bin sits at
  `peakFreqHz`.
- Zone-time math: proportion helper turns `zoneSeconds` into bar fractions that sum to ≤ 1
  and handles the all-zero (no data) case.
- Remove the simulator tests from `source.test.ts`.
- Full `bun run test` + `bun run typecheck` + `bun run lint` pass.

## Open question (resolve during implementation, not blocking)

`store.mode` / `SourceMode`: after the simulator is gone, BLE is the only source. If no
component reads `mode`, remove the field, `setMode`, and the `SourceMode` type entirely
rather than leaving a one-member type. Confirmed by grep before deletion.
