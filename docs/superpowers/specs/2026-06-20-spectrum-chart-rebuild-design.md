# SpectrumChart rebuild — design

**Date:** 2026-06-20
**Component:** `components/SpectrumChart.tsx`

## Problem

The HRV spectrum chart looks wrong, in two distinct ways:

1. **Everything is squashed.** It is the only chart in the app that renders into an
   SVG with `viewBox="0 0 100 48"` + `preserveAspectRatio="none"`. The panel body is
   roughly 600px wide × 145px tall, so that 100×48 coordinate box is stretched
   ~6× horizontally and ~3× vertically — non-uniformly. Every glyph of "collecting…"
   and every bar is distorted by that mismatch. (The axis labels were already pulled
   out to HTML to dodge this; the bars and empty-state text are still trapped inside.)
   The two sibling charts — `CoherenceGraph` and `LiveWaveform` — render to a
   DPR-scaled `<canvas>` and never distort anything. SpectrumChart is the outlier.

2. **The values are meaningless to the user.** The chart labels its x-axis in raw
   Hz (0.1 / 0.2 / 0.3). The rest of the app speaks in **breaths per minute** — the
   pacer (`paceBpm = 60000/periodMs`), the slider ("{pace} breaths/min"), the breath
   orb. A user looking at "0.2 Hz" has no way to connect it to how they're breathing.

## Goal

A spectrum chart that (a) never distorts, by matching the sibling canvas approach,
and (b) is self-explanatory, by speaking in breaths/min and showing where the peak
should land.

The conversion is exact: `breaths/min = freqHz × 60`. So 0.1 Hz = 6 br/min (the
default pace); the 4.5–7 br/min pacing range = 0.075–0.117 Hz. The chart's meaning
becomes legible: **your HRV should concentrate into one tall peak at the pace you're
breathing.**

## Rendering

Rewrite from SVG to `<canvas>`, reusing the exact skeleton from
`components/CoherenceGraph.tsx`:

- `fit()` sizes the backing store with `devicePixelRatio` and `ctx.setTransform`.
- A `ResizeObserver` re-fits and redraws on container resize.
- All drawing happens in real CSS pixels — no stretched coordinate box.

**Redraw cadence:** redraw **on change**, not via a perpetual `requestAnimationFrame`
loop. The siblings run rAF because they scroll continuously; the spectrum only updates
~1×/sec. Drive `draw()` from a `useEffect` keyed on the inputs below, plus the
`ResizeObserver` callback.

**Inputs read from the store** (`useTrainerStore`):
- `coherence.spectrum: SpectrumBin[]` — `{ freqHz, power }`, `[]` until ready
- `coherence.peakFreqHz: number`
- `coherence.ready: boolean`
- `coherence.zone: CoherenceZone` — to resolve the peak/target colour
- `pace: number` — breaths/min, for the target band

**Component placement:** SpectrumChart renders only the chart body (the
`role="img"` div + canvas + HTML axis/readout). It stays *inside* `BarChartPanel`'s
`MetricPanel`, which owns the panel frame and the SPECTRUM/ZONE toggle. It does **not**
wrap its own `MetricPanel` (unlike CoherenceGraph/LiveWaveform).

## Draw order (back to front)

1. **Target band.** A faint zone-coloured rect spanning the breathing pace
   ± ~0.75 br/min. Compute `paceHz = pace / 60`, convert the ±0.75 br/min margin to Hz
   (`0.75 / 60 = 0.0125 Hz`), map both edges through `freqToX`, fill with the resolved
   zone colour at very low alpha (≈ `"14"`). Communicates "land your peak in here."
   The exact half-width is a tunable constant.

2. **Bars.** For each bin:
   - `x = freqToX(bin.freqHz) · cssW` (bar centre)
   - `barW = (cssW / spectrum.length) · 0.7`
   - `height = (bin.power / maxPower) · usableH`, with a ~1px floor so quiet bins
     still read; `maxPower = max(power)` over bins (guard against 0).
   - `usableH = cssH − topPad` (small top padding so the tallest bar doesn't touch
     the edge).
   - **Peak bin** (`|bin.freqHz − peakFreqHz| ≤ BIN_HZ · 0.6`) fills the resolved
     zone colour at full opacity; all other bins fill `--fg-faint` at ≈0.3.

3. **Empty state** (`!ready`). Faint baseline line + centred
   `ctx.fillText("collecting…")`, matching `CoherenceGraph`/`LiveWaveform`. The old
   hardcoded placeholder "nub bars" are removed.

`freqToX(freqHz)` keeps its current definition unchanged — it returns a **percentage
(0–100)**: `((freqHz − SPECTRUM_BAND.lo) / (SPECTRUM_BAND.hi − SPECTRUM_BAND.lo)) · 100`.
In canvas space use `freqToX(f) / 100 · cssW`; in HTML use `left: ${freqToX(f)}%` (as
the current axis labels already do). Keeping it as a percentage avoids touching the
existing label code.

## Meaning layer (HTML — never squashed)

- **X-axis in breaths/min.** Replace the 0.1/0.2/0.3 Hz labels with **6 · 12 · 18
  br/min**. These map to 0.1/0.2/0.3 Hz, so the tick *positions* are unchanged
  (`left: freqToX(bpm/60) · 100%`) — only the displayed numbers change, and they now
  match the pacer/slider. Rendered as positioned HTML `<span>`s below the canvas,
  exactly as the current axis labels already are.

- **Peak readout.** A small label `peak 5.9 /min` (`peakFreqHz × 60`, one decimal),
  positioned top-right of the chart body, zone-coloured, `tabular-nums`. Shown only
  when `ready`; hidden during the collecting state (the canvas text covers that).
  Top-right is chosen because the high-frequency (right) end is typically low-power,
  so the label won't overlap the tall low-frequency bars.

## Colours

Resolve via `getComputedStyle(document.documentElement)` like the siblings:
- `--fg-faint` for non-peak bars and baseline
- `--zone-${zone}` for the peak bar, target band, and peak readout (canvas can't use
  the `var(--zone)` indirection the old SVG relied on, so resolve the concrete zone).

Re-resolve when `zone` changes (cheap; happens on the redraw-on-change effect).

## Accessibility

- Keep `role="img"` on the wrapper with an updated `aria-label`
  (e.g. "HRV power spectrum, breaths per minute").
- Update the visually-hidden description to state the breaths/min range, that the bar
  at the peak frequency is highlighted, and that the shaded band marks the breathing
  pace.

## Layout shell (sketch)

```
<div role="img" aria-label="…" className="relative flex h-44 w-full flex-col">
  {ready ? <span className="absolute right-0 top-0 …">peak {peakBpm} /min</span> : null}
  <canvas className="min-h-0 w-full flex-1" />
  <div className="relative h-4 w-full shrink-0">           {/* br/min axis */}
    {[6, 12, 18].map((b) => (
      <span style={{ left: `${freqToX(b / 60)}%` }} …>{b}</span>
    ))}
  </div>
  <span className="visually-hidden">…</span>
</div>
```

## Out of scope

- No changes to `lib/coherence.ts`, the FFT, or how `spectrum`/`peakFreqHz` are
  computed — this is purely the presentation component.
- No changes to `BarChartPanel`, `MetricPanel`, or the SPECTRUM/ZONE toggle.
- No new store fields; `pace` and `coherence.*` already exist.

## Testing

- There is no existing test for SpectrumChart, and the siblings (canvas components)
  are likewise untested — canvas drawing is verified visually, not in unit tests.
- Verify manually with `?debug=1` / a connected strap (or replayed data): bars are
  undistorted, "collecting…" is crisp and centred, axis reads 6/12/18, the peak
  readout tracks the highlighted bar, and the target band sits around the current pace.
- Existing suite (`pnpm test`) must stay green; this change touches one presentation
  component only.
```
