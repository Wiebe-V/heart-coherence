# Info Bubbles — Design

**Date:** 2026-06-28
**Status:** Approved (pending spec review)

## Goal

Add a clear, plain-language explanation to every graph, widget, and setting in
the app, revealed through a small "ⓘ" info button that toggles a popover.

Each explanation has two short parts:

- **what it is** — what the graph/widget/setting shows or does
- **how to use it** — how to act on it

Scope: the dashboard (trainer), the settings drawer, and the history page.

## Decisions (from brainstorming)

- **Mechanism:** an "ⓘ" icon next to each title/label. Click/tap toggles a
  popover. Not hover-only (unreliable on touch, weaker for keyboard/screen
  readers) and not always-visible captions (would add height and noise to a
  deliberately minimal UI).
- **Depth:** two short lines — *what it is* + *how to use it*.
- **Scope:** all surfaces (dashboard + settings + history).
- **Rejected alternative:** the native HTML Popover API (free light-dismiss and
  auto-flip) — set aside in favor of a controlled-React popover that matches the
  codebase's existing patterns (`useFocusTrap`, manual effects, custom events)
  and avoids a dependency on CSS anchor-positioning. Edge-clipping is handled
  with an explicit `side="top"` on the bottom panel.

## Architecture

One reusable component plus a central copy registry, wired into the existing
panel/field wrappers so the icon lands in a consistent spot everywhere.

### New files

**`components/InfoBubble.tsx`** — a small "ⓘ" button that toggles a popover.

- Props:
  - `title: string` — the popover heading (also drives the button's
    `aria-label`, e.g. `About HRV spectrum`).
  - `what: ReactNode` — the "what it is" line.
  - `how: ReactNode` — the "how to use it" line.
  - `align?: "start" | "end"` (default `"start"`) — horizontal anchor of the
    popover relative to the icon. `"start"` opens toward the right (left edge at
    the icon); `"end"` opens toward the left (right edge at the icon).
  - `side?: "top" | "bottom"` (default `"bottom"`) — open below or above the
    icon.
- Behavior:
  - Internal `open` state, toggled by the button.
  - Closes on outside-click (a `pointerdown` listener on `document` that ignores
    clicks within the button or panel) and on `Escape` (returns focus to the
    button).
  - Because an outside-click closes any open bubble, clicking a second bubble's
    button naturally closes the first — so only one is open at a time without
    extra coordination.
- Accessibility:
  - Button: `type="button"`, `aria-label={`About ${title}`}`,
    `aria-expanded={open}`, `aria-controls={panelId}`.
  - Popover: `id={panelId}`, labelled by its heading; a non-modal disclosure
    (focus stays on the button, Esc closes). The "ⓘ" glyph is `aria-hidden`.
- Styling: the existing tokens — `bg-(--bg-elevated)`, `border-(--line-strong)`,
  `text-fg-muted` / `text-fg-faint`. A faint icon that brightens on
  hover/focus, like the other secondary controls (`text-fg-faint
  hover:text-fg-muted focus-visible:text-fg-muted`). Popover ~15rem wide,
  absolutely positioned within a `relative inline-flex` wrapper.

**`lib/infoText.ts`** — a typed registry holding all explanatory copy in one
reviewable place.

```ts
export interface InfoEntry { title: string; what: string; how: string }
export const INFO = {
  vitals: { … },
  breathOrb: { … },
  pace: { … },
  achievement: { … },
  resonance: { … },
  heartRhythm: { … },
  coherenceOverTime: { … },
  spectrum: { … },
  timeInZone: { … },
  achievementGoal: { … },
  zoneThresholds: { … },
  resonanceInterval: { … },
  reducedMotion: { … },
  theme: { … },
  sessions: { … },
} satisfies Record<string, InfoEntry>;
```

Call sites spread an entry into the component: `<InfoBubble {...INFO.spectrum} />`.

### Edits to existing wrappers (for consistent placement)

- **`components/MetricPanel.tsx`** — add an optional `info?: ReactNode` slot,
  rendered immediately after the title in the header row. The three graph panels
  pass an `<InfoBubble>` through it. (The existing `value` slot stays on the
  right.)
- **`components/SettingsDrawer.tsx`** `Field` — add an optional `info?:
  ReactNode` slot rendered next to the label.

### Per-component wiring (one ⓘ each)

| Location | Component edited | Copy key | Placement |
|---|---|---|---|
| Vitals cluster | `VitalsHeader.tsx` | `vitals` | `align="end"` (top-right of header) |
| Breath orb | `Trainer.tsx` (adjacent to `<BreathOrb>`, not inside it — the orb is `role="img"`) | `breathOrb` | `align="start"` |
| Pace slider | `SessionControls.tsx` | `pace` | `align="start"` |
| Achievement meter | `AchievementMeter.tsx` | `achievement` | `align="start"` |
| Resonance finder | `ResonanceFinder.tsx` | `resonance` | `align="start"` |
| Heart rhythm | `LiveWaveform.tsx` → `MetricPanel info` | `heartRhythm` | default |
| Coherence over time | `CoherenceGraph.tsx` → `MetricPanel info` | `coherenceOverTime` | default |
| HRV spectrum / Time in zone | `BarChartPanel.tsx` → `MetricPanel info` | `spectrum` / `timeInZone` (switches with the active tab) | `side="top"` (bottom panel) |
| Achievement goal | `SettingsDrawer.tsx` `Field` | `achievementGoal` | `align="start"` |
| Zone thresholds | `SettingsDrawer.tsx` (above the building/coherent grid) | `zoneThresholds` | `align="start"` |
| Resonance interval | `SettingsDrawer.tsx` `Field` | `resonanceInterval` | `align="start"` |
| Reduced motion | `SettingsDrawer.tsx` `Field` | `reducedMotion` | `align="start"` |
| Theme | `SettingsDrawer.tsx` `Field` | `theme` | `align="start"` |
| Sessions list | `SessionHistory.tsx` (page header) | `sessions` | `align="start"` |

Plain action buttons (start/stop session, connect) stay as-is — they're
self-explanatory; labeling them would add noise.

## The copy

**Dashboard**

- **vitals** — title: "Live readouts".
  - what: "The three live numbers: coherence (0–100, how smooth and rhythmic your heartbeat is), bpm (your heart rate), and zone (scattered → building → coherent)."
  - how: "Watch coherence and zone climb as you breathe with the orb."
- **breathOrb** — title: "Breathing pacer".
  - what: "The orb expands as you breathe in and contracts as you breathe out, setting your pace."
  - how: "Follow it with slow, even breaths — calm paced breathing is what builds coherence."
- **pace** — title: "Pace".
  - what: "Your breathing speed, in breaths per minute, that the orb follows."
  - how: "Most people are calmest around 5–6. Use the Resonance Finder to find your own best pace."
- **achievement** — title: "Achievement".
  - what: "Points earned this session — they add up faster the more coherent you are — shown against your goal."
  - how: "Stay in the building and coherent zones to fill the bar and complete the goal."
- **resonance** — title: "Resonance Finder".
  - what: "A guided sweep that holds several breathing paces in turn and measures your coherence at each."
  - how: "Connect a strap and run it once, then tap “use this pace” to set your most coherent rate."
- **heartRhythm** — title: "Heart rhythm".
  - what: "Your beat-to-beat heart rate over the last 30 seconds."
  - how: "Paced breathing makes this trace rise and fall in smooth, regular waves — the visible sign of coherence."
- **coherenceOverTime** — title: "Coherence over time".
  - what: "Your coherence score over the last few minutes, with the three zone bands shaded behind it."
  - how: "Keep the line up in the green (coherent) band as long as you can."
- **spectrum** — title: "HRV spectrum".
  - what: "How your heart-rate variability is spread across breathing rates. A single tall peak means one steady rhythm."
  - how: "Aim for one tall bar inside the shaded band over your breathing pace — that’s peak coherence."
- **timeInZone** — title: "Time in zone".
  - what: "How long this session you’ve spent in each zone: scattered, building, and coherent."
  - how: "Try to grow the coherent bar over the session."

**Settings**

- **achievementGoal** — title: "Achievement goal".
  - what: "The points target that completes a session."
  - how: "Lower it for quick sessions, raise it for longer practice."
- **zoneThresholds** — title: "Zone thresholds".
  - what: "The coherence scores where you cross from scattered into building, and from building into coherent."
  - how: "Lower them to reach the green zone more easily. Building must stay below coherent."
- **resonanceInterval** — title: "Resonance interval".
  - what: "How many seconds the Resonance Finder holds each pace before scoring it."
  - how: "Longer intervals give steadier readings but make the whole sweep longer."
- **reducedMotion** — title: "Reduced motion".
  - what: "Whether the orb and background effects animate. Auto follows your system setting."
  - how: "Set it On to calm motion, or Off to always animate."
- **theme** — title: "Theme".
  - what: "Light or dark appearance. Auto follows your system."
  - how: "Pick whichever is easier on your eyes."

**History**

- **sessions** — title: "Your sessions".
  - what: "Each past session as a row: a coherence sparkline, its date, duration and pace, and its average and peak coherence."
  - how: "Tap a row to expand it for a larger trace, then export to JSON/CSV or delete."

## Edge cases & behavior

- **One open at a time:** handled implicitly by the outside-click handler.
- **Viewport clipping:** the dashboard has no page scroll (fixed-height flex), so
  the bottom panel uses `side="top"`. Left-column bubbles use `align="start"` so
  they open into the column, not off the left edge. The settings drawer scrolls
  vertically (`overflow-y-auto`) and the popover fits within its width, so
  bubbles there open downward normally.
- **Theme:** all colors come from CSS variables, so the popover follows
  light/dark automatically.
- **Reduced motion:** the popover appears/disappears without a transition (or a
  trivial one), consistent with the app honoring reduced-motion elsewhere.

## Testing

- `lib/infoText.ts` is plain data — a small unit test asserts every entry has a
  non-empty `title`, `what`, and `how` (guards against an empty/placeholder
  slipping in). This matches the repo's convention of unit-testing `lib/` only.
- `InfoBubble` is presentational; its open/close interaction and placement are
  verified by running the app (the `run` skill) rather than a component test —
  the repo has no component-test harness (`@testing-library`) and adding one is
  out of scope.

## Out of scope

- No changes to what the graphs/settings actually do.
- No new component-testing infrastructure.
- No info bubbles on plain action buttons (start/stop, connect).
