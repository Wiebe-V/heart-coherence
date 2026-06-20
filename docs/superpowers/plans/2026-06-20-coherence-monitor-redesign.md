# Coherence Monitor Redesign — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Transform the single-orb meditation screen into a data-rich coherence monitor dashboard with live graphs, split-screen layout, simulator removal, and bun migration.

**Architecture:** Split-screen layout (left: breath circle + controls, right: three panel graphs) with a full-width vitals strip on top. New `coherenceBuffer` module mirrors `beatBuffer` for the coherence history graph; `computeCoherence` gains a `spectrum[]` field from the same FFT transform; a new `zoneSeconds` store slice tracks time-in-zone. All canvas components read module buffers directly via rAF (zero React re-renders); 1 Hz store subscribers handle the text readouts and SVG charts.

**Tech Stack:** Next.js 16, React 19, TypeScript 5, Zustand 5, Tailwind CSS 4, Vitest 3, Bun

## Global Constraints

- Package manager: **bun** (pnpm removed — delete `pnpm-lock.yaml` and `pnpm-workspace.yaml`, run `bun install`)
- Test runner: `bun run test` (vitest), typecheck: `bun run typecheck`, lint: `bun run lint`
- Tests live in `lib/__tests__/` — vitest config includes only `lib/**/*.test.ts`
- **Read `node_modules/next/dist/docs/` before touching any Next.js-specific code** (AGENTS.md requirement)
- Canvas components: DPR-aware, `ResizeObserver` for refitting, single rAF loop, zero React state for drawing data
- 1 Hz store subscribers: plain Zustand selectors, update once per second
- No simulator UI or copy anywhere in the codebase after Task 6
- All new components are `"use client"` (this is a fully client-side app)
- `CoherenceGauge.tsx` is deleted at the end of Task 11; its role moves to `VitalsHeader`

---

## File Map

### New files
| Path | Role |
|------|------|
| `lib/coherenceBuffer.ts` | Rolling 180 s history of coherence samples (mirrors `beatBuffer.ts`) |
| `lib/zoneTime.ts` | Pure `zoneProportions()` helper for ZoneTimeChart |
| `lib/__tests__/coherenceBuffer.test.ts` | Unit tests for coherenceBuffer |
| `lib/__tests__/zoneTime.test.ts` | Unit tests for zoneProportions |
| `components/MetricPanel.tsx` | Reusable framed dashboard card (border, elevated bg, title/value slots) |
| `components/VitalsHeader.tsx` | Top strip: connection state + coherence score + HR + zone |
| `components/CoherenceGraph.tsx` | Canvas + rAF line graph of coherence score over 3 min |
| `components/SpectrumChart.tsx` | SVG bar chart of HRV power spectrum (bare chart, no MetricPanel) |
| `components/ZoneTimeChart.tsx` | Three horizontal proportion bars for time-in-zone (bare, no MetricPanel) |
| `components/BarChartPanel.tsx` | MetricPanel wrapping SpectrumChart ↔ ZoneTimeChart toggle |

### Modified files
| Path | Change |
|------|--------|
| `types/index.ts` | Add `SpectrumBin`, add `spectrum` to `CoherenceResult`, remove `SourceMode` |
| `lib/constants.ts` | Add `COHERENCE_HISTORY_S = 180`, `SPECTRUM_BAND = {lo: 0.04, hi: 0.4}` |
| `lib/coherence.ts` | Return `spectrum: SpectrumBin[]` from `computeCoherence`; update `emptyResult` |
| `lib/__tests__/coherence.test.ts` | Add spectrum tests |
| `lib/store.ts` | Add `zoneSeconds`, `bumpZoneSecond`, update `resetSignal`; remove `mode`/`setMode` |
| `lib/__tests__/store.test.ts` | Update for new state shape |
| `lib/source.ts` | Remove `SimulatedSource`, `simulatedIbiAt`, `BeatSource` interface, `SourceMode` from class |
| `lib/__tests__/source.test.ts` | Remove simulator tests |
| `hooks/useCoherence.ts` | Push to `coherenceBuffer`, call `store.bumpZoneSecond` |
| `hooks/useHeartRateSensor.ts` | Remove `connectSimulator`/`setMode`; add `coherenceBuffer.reset()` on connect/disconnect |
| `components/BreathOrb.tsx` | Add optional `size` prop (CSS length) |
| `components/LiveWaveform.tsx` | Wrap in MetricPanel titled "heart rhythm"; add gradient fill + baseline grid |
| `components/ConnectionButton.tsx` | Remove all simulator buttons and simulator-fallback copy |
| `components/ResonanceFinder.tsx` | Remove simulator mention from empty-state copy |
| `components/SessionControls.tsx` | Remove simulator reference from doc comment |
| `components/Trainer.tsx` | Replace single-column layout with vitals strip + split-screen |
| `README.md` | Replace pnpm commands with bun commands |

### Deleted files
| Path | Reason |
|------|--------|
| `pnpm-lock.yaml` | Replaced by `bun.lock` |
| `pnpm-workspace.yaml` | Not needed with bun |
| `components/CoherenceGauge.tsx` | Role absorbed by VitalsHeader |

---

## Task 1: pnpm → bun migration

**Files:**
- Delete: `pnpm-lock.yaml`, `pnpm-workspace.yaml`
- Modify: `README.md`
- Modify: `/home/user/.claude/projects/-home-user-projects-coherence/memory/env-pnpm-wsl-chrome.md`

- [ ] **Step 1: Remove pnpm lockfiles**

```bash
cd /home/user/projects/coherence
rm pnpm-lock.yaml pnpm-workspace.yaml
```

- [ ] **Step 2: Verify bun is available**

```bash
bun --version
```

Expected: a version string like `1.x.x`. If not installed, run `curl -fsSL https://bun.sh/install | bash` and restart the shell.

- [ ] **Step 3: Install dependencies with bun**

```bash
cd /home/user/projects/coherence
bun install
```

Expected: `bun.lock` is created, `node_modules/` is populated (or reused).

- [ ] **Step 4: Smoke-test suite still passes**

```bash
bun run test
```

Expected: all existing tests pass.

- [ ] **Step 5: Update README.md**

Replace the "Getting Started" section with bun-focused instructions. The full updated README.md content:

```markdown
# Coherence

A coherence monitor for HRV biofeedback via Web Bluetooth.

## Getting Started

```bash
bun install
bun run dev
```

Open [http://localhost:3000](http://localhost:3000) in Chrome or Edge over localhost.

## Commands

| Command | Description |
|---------|-------------|
| `bun run dev` | Start development server (Turbopack) |
| `bun run build` | Production build |
| `bun run test` | Run unit tests (vitest) |
| `bun run typecheck` | TypeScript type check |
| `bun run lint` | ESLint |

## Requirements

Web Bluetooth requires Chrome or Edge over `localhost` or HTTPS. Firefox and Safari are not supported.
```

- [ ] **Step 6: Update memory file**

Edit `/home/user/.claude/projects/-home-user-projects-coherence/memory/env-pnpm-wsl-chrome.md`: change any mention of pnpm to bun. The package manager is now bun (installed via corepack or direct install); commands are `bun install` / `bun run dev` / `bun run test`.

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "chore: migrate from pnpm to bun"
```

---

## Task 2: Foundation — types + constants

**Files:**
- Modify: `types/index.ts`
- Modify: `lib/constants.ts`

**Interfaces:**
- Produces: `SpectrumBin` type, `spectrum: SpectrumBin[]` on `CoherenceResult`, `COHERENCE_HISTORY_S`, `SPECTRUM_BAND`

- [ ] **Step 1: Add SpectrumBin and update CoherenceResult in types/index.ts**

Full updated `types/index.ts`:

```typescript
export interface Beat {
  /** ms, cumulative beat timeline (seeded from performance.now()) */
  t: number;
  /** inter-beat interval, ms */
  ibi: number;
  /** bpm, 60000 / ibi */
  hr: number;
}

/** Result of parsing one 0x2A37 heart_rate_measurement notification DataView. */
export interface HeartRatePacket {
  /** bpm */
  hr: number;
  /** RR intervals in ms (already converted from 1/1024 s); [] if none present */
  rr: number[];
  /** flags bit 4 — whether RR data is present in the packet */
  hasRR: boolean;
  energyExpended?: number;
}

export type ConnectionStatus =
  | "idle"
  | "unsupported" // no navigator.bluetooth
  | "requesting" // device picker open
  | "connecting"
  | "connected" // streaming RR
  | "no-rr" // connected, HR present, but flags bit 4 never set
  | "disconnected"
  | "error";

export interface ConnectionState {
  status: ConnectionStatus;
  deviceName?: string;
  /** explanatory text for error / no-rr states */
  message?: string;
}

export type CoherenceZone = "scattered" | "building" | "coherent";

export interface SpectrumBin {
  freqHz: number;
  power: number;
}

export interface CoherenceResult {
  /** full 64 s window available */
  ready: boolean;
  /** 0..1 while collecting the first window */
  progress: number;
  /** 0..100, EMA-smoothed (display value) */
  score: number;
  /** 0..100, this tick's unsmoothed ratio*100 */
  raw: number;
  /** peak frequency in Hz; 0 when not ready */
  peakFreqHz: number;
  zone: CoherenceZone;
  /** HRV power bins within SPECTRUM_BAND; [] when not ready */
  spectrum: SpectrumBin[];
}

export interface ZoneThresholds {
  /** score >= building && < coherent → "building" */
  building: number;
  /** score >= coherent → "coherent"; score < building → "scattered" */
  coherent: number;
}

export interface ResonanceStep {
  paceBpm: number;
  avgCoherence: number;
  samples: number;
}

export interface ResonanceResult {
  steps: ResonanceStep[];
  bestPaceBpm: number;
}

export interface SessionRecord {
  /** crypto.randomUUID() */
  id: string;
  /** epoch ms */
  startedAt: number;
  durationS: number;
  /** breaths/min */
  pace: number;
  avgCoherence: number;
  peakCoherence: number;
  /** one value per second */
  coherenceTrace: number[];
  /** HR waveform decimated to ~1 point/s */
  hrTrace: number[];
}

export interface Settings {
  /** breaths/min */
  pace: number;
  zoneThresholds: ZoneThresholds;
  resonanceIntervalS: number;
  /** null = follow system prefers-reduced-motion */
  reducedMotionOverride: boolean | null;
}
```

Note: `SourceMode` is removed entirely. It will be fully eliminated from all source files in Task 6.

- [ ] **Step 2: Add COHERENCE_HISTORY_S and SPECTRUM_BAND to lib/constants.ts**

Full updated `lib/constants.ts`:

```typescript
import type { CoherenceZone, Settings, ZoneThresholds } from "@/types";

export const FS = 4; // Hz resample grid
export const N = 256; // FFT length
export const WINDOW_S = N / FS; // 64 s
export const BEAT_BUFFER_S = 130; // prune beats older than this
export const COHERENCE_HISTORY_S = 180; // prune coherence samples older than this (3 min)

export const PEAK_BAND = { lo: 0.04, hi: 0.26 } as const; // peak search range
export const TOTAL_BAND = { lo: 0.04, hi: 0.4 } as const; // total-power range
export const SPECTRUM_BAND = { lo: 0.04, hi: 0.4 } as const; // display band for spectrum chart
export const PEAK_HALF_WIDTH_HZ = 0.015; // ± around peak for peak power
export const EMA_ALPHA = 0.2; // display = 0.8*prev + 0.2*new

export const DEFAULT_ZONE_THRESHOLDS: ZoneThresholds = {
  building: 40,
  coherent: 65,
};

export const PACE = { min: 4.5, max: 7, step: 0.5, default: 6 } as const;

export const RESONANCE_INTERVAL_S = 120; // hold per pace
export const RESONANCE_SETTLE_S = 20; // ignore first N s of each step when averaging

// Web Bluetooth GATT
export const HR_SERVICE = "heart_rate"; // 0x180D
export const HR_MEASUREMENT = "heart_rate_measurement"; // 0x2A37

export const DEFAULT_SETTINGS: Settings = {
  pace: PACE.default,
  zoneThresholds: DEFAULT_ZONE_THRESHOLDS,
  resonanceIntervalS: RESONANCE_INTERVAL_S,
  reducedMotionOverride: null,
};

export const SETTINGS_KEY = "coherence.settings.v1";

/** Maps a coherence zone to the CSS custom property holding its color. */
export const ZONE_VAR: Record<CoherenceZone, string> = {
  scattered: "var(--zone-scattered)",
  building: "var(--zone-building)",
  coherent: "var(--zone-coherent)",
};
```

- [ ] **Step 3: Verify typecheck passes**

```bash
bun run typecheck
```

Expected: no errors. (The `coherence.ts` `emptyResult` return will have a type error until Task 4 — if it fails, proceed; it will be fixed in Task 4.)

- [ ] **Step 4: Commit**

```bash
git add types/index.ts lib/constants.ts
git commit -m "feat(types): add SpectrumBin, spectrum field, COHERENCE_HISTORY_S, SPECTRUM_BAND"
```

---

## Task 3: coherenceBuffer module + tests

**Files:**
- Create: `lib/coherenceBuffer.ts`
- Create: `lib/__tests__/coherenceBuffer.test.ts`

**Interfaces:**
- Produces: `pushSample(score, zone, now)`, `getSamples()`, `reset()`, `subscribe(fn)`, `CoherenceSample` type

- [ ] **Step 1: Write the failing tests**

Create `lib/__tests__/coherenceBuffer.test.ts`:

```typescript
import { describe, it, expect, beforeEach } from "vitest";
import { pushSample, getSamples, reset, subscribe } from "@/lib/coherenceBuffer";
import { COHERENCE_HISTORY_S } from "@/lib/constants";

beforeEach(() => reset());

describe("coherenceBuffer", () => {
  it("pushSample appends entries in order", () => {
    pushSample(50, "building", 1000);
    pushSample(60, "coherent", 2000);
    const s = getSamples();
    expect(s).toHaveLength(2);
    expect(s[0]!.score).toBe(50);
    expect(s[0]!.zone).toBe("building");
    expect(s[1]!.score).toBe(60);
  });

  it("prunes samples older than COHERENCE_HISTORY_S behind the latest push", () => {
    pushSample(50, "building", 0);       // will be pruned
    pushSample(60, "coherent", 1000);    // will be pruned
    const nowLater = COHERENCE_HISTORY_S * 1000 + 2000; // 182_000
    pushSample(70, "scattered", nowLater);
    // cutoff = 182000 - 180000 = 2000; t=0 and t=1000 both < 2000 → pruned
    const s = getSamples();
    expect(s).toHaveLength(1);
    expect(s[0]!.score).toBe(70);
  });

  it("reset clears buffer and notifies subscribers", () => {
    pushSample(50, "building", 0);
    let notified = false;
    const unsub = subscribe(() => { notified = true; });
    reset();
    expect(getSamples()).toHaveLength(0);
    expect(notified).toBe(true);
    unsub();
  });

  it("subscribe fires on push; unsubscribe stops notifications", () => {
    let n = 0;
    const unsub = subscribe(() => { n++; });
    pushSample(50, "building", 0);
    expect(n).toBe(1);
    unsub();
    pushSample(60, "coherent", 100);
    expect(n).toBe(1); // no further increment
  });

  it("getSamples returns the live array (reference, not a copy)", () => {
    pushSample(42, "scattered", 0);
    const ref1 = getSamples();
    const ref2 = getSamples();
    expect(ref1).toBe(ref2);
  });
});
```

- [ ] **Step 2: Run to confirm failure**

```bash
bun run test -- --reporter=verbose 2>&1 | grep coherenceBuffer
```

Expected: `Cannot find module '@/lib/coherenceBuffer'` error.

- [ ] **Step 3: Implement lib/coherenceBuffer.ts**

```typescript
import { COHERENCE_HISTORY_S } from "@/lib/constants";
import type { CoherenceZone } from "@/types";

export interface CoherenceSample {
  /** performance.now() timeline ms */
  t: number;
  score: number;
  zone: CoherenceZone;
}

let samples: CoherenceSample[] = [];
const listeners = new Set<() => void>();

export function pushSample(score: number, zone: CoherenceZone, now: number): void {
  samples.push({ t: now, score, zone });
  const cutoff = now - COHERENCE_HISTORY_S * 1000;
  if (samples.length && samples[0]!.t < cutoff) {
    samples = samples.filter((s) => s.t >= cutoff);
  }
  listeners.forEach((l) => l());
}

export function getSamples(): CoherenceSample[] {
  return samples;
}

export function reset(): void {
  samples = [];
  listeners.forEach((l) => l());
}

export function subscribe(fn: () => void): () => void {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}
```

- [ ] **Step 4: Run tests to confirm pass**

```bash
bun run test -- --reporter=verbose 2>&1 | grep -A 10 coherenceBuffer
```

Expected: all 5 coherenceBuffer tests pass.

- [ ] **Step 5: Commit**

```bash
git add lib/coherenceBuffer.ts lib/__tests__/coherenceBuffer.test.ts
git commit -m "feat(lib): coherenceBuffer — rolling 3-min history of coherence samples"
```

---

## Task 4: computeCoherence → spectrum extraction

**Files:**
- Modify: `lib/coherence.ts`
- Modify: `lib/__tests__/coherence.test.ts`

**Interfaces:**
- Consumes: `SpectrumBin` (from types), `SPECTRUM_BAND` (from constants)
- Produces: `CoherenceResult.spectrum` populated for ready results; `[]` when not ready

- [ ] **Step 1: Add spectrum test to lib/__tests__/coherence.test.ts**

Add this `describe` block after the existing `computeCoherence` tests (keep all existing tests unchanged):

```typescript
import { SPECTRUM_BAND, FS, N } from "@/lib/constants";
const BIN_HZ = FS / N; // 0.015625

describe("computeCoherence spectrum", () => {
  it("returns empty spectrum when not ready", () => {
    const r = computeCoherence([], 0, null);
    expect(r.spectrum).toEqual([]);
  });

  it("returns non-empty spectrum within SPECTRUM_BAND when ready", () => {
    const beats = sineBeats(0.1, WINDOW_S + 10);
    const r = computeCoherence(beats, NOW, null);
    expect(r.ready).toBe(true);
    expect(r.spectrum.length).toBeGreaterThan(0);
    for (const bin of r.spectrum) {
      expect(bin.freqHz).toBeGreaterThanOrEqual(SPECTRUM_BAND.lo - 0.001);
      expect(bin.freqHz).toBeLessThanOrEqual(SPECTRUM_BAND.hi + 0.001);
      expect(bin.power).toBeGreaterThanOrEqual(0);
    }
  });

  it("max-power bin in spectrum is at peakFreqHz (within one bin)", () => {
    const beats = sineBeats(0.1, WINDOW_S + 10);
    const r = computeCoherence(beats, NOW, null);
    expect(r.ready).toBe(true);
    const maxBin = r.spectrum.reduce((a, b) => (a.power > b.power ? a : b));
    expect(Math.abs(maxBin.freqHz - r.peakFreqHz)).toBeLessThanOrEqual(BIN_HZ + 0.001);
  });
});
```

The import line for `SPECTRUM_BAND, FS, N` needs to be merged into the existing import from `@/lib/constants` at the top of the test file.

- [ ] **Step 2: Run to confirm new tests fail**

```bash
bun run test -- lib/__tests__/coherence.test.ts --reporter=verbose 2>&1 | tail -20
```

Expected: `spectrum` tests fail (property doesn't exist on `CoherenceResult` yet — it will once types are updated and coherence.ts is changed).

Actually since Task 2 already added `spectrum` to the type, the failure here is that `emptyResult` doesn't return `spectrum: []`. The test for "empty spectrum when not ready" will fail with a type/value mismatch.

- [ ] **Step 3: Update lib/coherence.ts to return spectrum**

Full updated `lib/coherence.ts`:

```typescript
import { fft } from "@/lib/fft";
import { resampleIBI } from "@/lib/resample";
import { zoneFor } from "@/lib/zones";
import {
  FS, N, WINDOW_S, PEAK_BAND, TOTAL_BAND, SPECTRUM_BAND,
  PEAK_HALF_WIDTH_HZ, EMA_ALPHA, DEFAULT_ZONE_THRESHOLDS,
} from "@/lib/constants";
import type { Beat, CoherenceResult, SpectrumBin, ZoneThresholds } from "@/types";

const WINDOW_MS = WINDOW_S * 1000;
const BIN_HZ = FS / N;

function emptyResult(progress: number): CoherenceResult {
  return { ready: false, progress, score: 0, raw: 0, peakFreqHz: 0, zone: "scattered", spectrum: [] };
}

/**
 * HeartMath-style spectral coherence over the most recent WINDOW_S of beats.
 * `beats` must carry at least the full window of history (the caller's ring
 * buffer keeps BEAT_BUFFER_S > WINDOW_S); otherwise `progress` saturates to 1
 * before enough signal exists. `now` is on the same timeline as `beat.t`.
 */
export function computeCoherence(
  beats: Beat[],
  now: number,
  prevScore: number | null,
  thresholds: ZoneThresholds = DEFAULT_ZONE_THRESHOLDS,
): CoherenceResult {
  if (beats.length < 2) return emptyResult(0);
  const first = beats[0]!;
  const span = now - first.t;
  if (span < WINDOW_MS) {
    return emptyResult(Math.max(0, Math.min(1, span / WINDOW_MS)));
  }

  const start = now - WINDOW_MS;
  const x = resampleIBI(beats, start, FS, N);

  let mean = 0;
  for (let i = 0; i < N; i++) mean += x[i]!;
  mean /= N;

  const re = new Float64Array(N);
  const im = new Float64Array(N);
  for (let i = 0; i < N; i++) {
    const w = 0.5 * (1 - Math.cos((2 * Math.PI * i) / (N - 1)));
    re[i] = (x[i]! - mean) * w;
  }

  fft(re, im);

  const half = N / 2;
  const power = new Float64Array(half + 1);
  for (let k = 0; k <= half; k++) power[k] = re[k]! ** 2 + im[k]! ** 2;
  const freq = (k: number) => k * BIN_HZ;

  let peakK = -1, peakVal = -1;
  for (let k = 0; k <= half; k++) {
    const f = freq(k);
    if (f < PEAK_BAND.lo || f > PEAK_BAND.hi) continue;
    if (power[k]! > peakVal) { peakVal = power[k]!; peakK = k; }
  }
  if (peakK < 0) {
    return { ready: true, progress: 1, score: prevScore ?? 0, raw: 0, peakFreqHz: 0, zone: "scattered", spectrum: [] };
  }
  const peakF = freq(peakK);

  let peakPower = 0;
  for (let k = 0; k <= half; k++) {
    if (Math.abs(freq(k) - peakF) <= PEAK_HALF_WIDTH_HZ) peakPower += power[k]!;
  }

  let totalPower = 0;
  for (let k = 0; k <= half; k++) {
    const f = freq(k);
    if (f >= TOTAL_BAND.lo && f <= TOTAL_BAND.hi) totalPower += power[k]!;
  }

  // Collect bins within the display band for the spectrum chart
  const spectrum: SpectrumBin[] = [];
  for (let k = 0; k <= half; k++) {
    const f = freq(k);
    if (f >= SPECTRUM_BAND.lo && f <= SPECTRUM_BAND.hi) {
      spectrum.push({ freqHz: f, power: power[k]! });
    }
  }

  const raw = totalPower > 0 ? (peakPower / totalPower) * 100 : 0;
  const score = prevScore === null ? raw : (1 - EMA_ALPHA) * prevScore + EMA_ALPHA * raw;

  return { ready: true, progress: 1, score, raw, peakFreqHz: peakF, zone: zoneFor(score, thresholds), spectrum };
}
```

- [ ] **Step 4: Run all tests**

```bash
bun run test -- --reporter=verbose 2>&1 | tail -30
```

Expected: all coherence tests pass including the 3 new spectrum tests.

- [ ] **Step 5: Commit**

```bash
git add lib/coherence.ts lib/__tests__/coherence.test.ts
git commit -m "feat(coherence): return spectrum bins from computeCoherence"
```

---

## Task 5: store.ts — add zoneSeconds + bumpZoneSecond

**Files:**
- Modify: `lib/store.ts`
- Modify: `lib/__tests__/store.test.ts`

**Interfaces:**
- Consumes: `CoherenceZone` type
- Produces: `store.zoneSeconds: Record<CoherenceZone, number>`, `store.bumpZoneSecond(zone)`, updated `resetSignal`

Note: `mode`/`setMode` are removed in this task (simulator is removed simultaneously in Task 6, but mode is only set — never read — by any UI component, so its removal is safe to stage here. `useHeartRateSensor` calls will be cleaned up in Task 6).

- [ ] **Step 1: Update store.test.ts**

Full updated `lib/__tests__/store.test.ts`:

```typescript
import { describe, it, expect, beforeEach } from "vitest";
import { useTrainerStore, INITIAL_COHERENCE, INITIAL_ZONE_SECONDS } from "@/lib/store";
import { PACE } from "@/lib/constants";

function resetStore() {
  useTrainerStore.setState({
    connection: { status: "idle" },
    hr: null,
    coherence: INITIAL_COHERENCE,
    pace: PACE.default,
    isPacing: false,
    zoneSeconds: INITIAL_ZONE_SECONDS,
  });
}

describe("useTrainerStore", () => {
  beforeEach(() => {
    resetStore();
  });

  it("has correct initial state", () => {
    const s = useTrainerStore.getState();
    expect(s.connection).toEqual({ status: "idle" });
    expect(s.hr).toBeNull();
    expect(s.coherence.ready).toBe(false);
    expect(s.pace).toBe(PACE.default);
    expect(s.isPacing).toBe(false);
    expect(s.zoneSeconds).toEqual({ scattered: 0, building: 0, coherent: 0 });
  });

  it("setConnection updates connection", () => {
    useTrainerStore.getState().setConnection({ status: "connected", deviceName: "Polar H10" });
    expect(useTrainerStore.getState().connection).toEqual({
      status: "connected",
      deviceName: "Polar H10",
    });
  });

  it("setHr updates hr", () => {
    useTrainerStore.getState().setHr(70);
    expect(useTrainerStore.getState().hr).toBe(70);
  });

  it("setCoherence updates coherence", () => {
    const c = {
      ready: true, progress: 1, score: 75, raw: 72, peakFreqHz: 0.1,
      zone: "coherent" as const, spectrum: [],
    };
    useTrainerStore.getState().setCoherence(c);
    expect(useTrainerStore.getState().coherence).toEqual(c);
  });

  it("setPace updates pace", () => {
    useTrainerStore.getState().setPace(5);
    expect(useTrainerStore.getState().pace).toBe(5);
  });

  it("setPacing updates isPacing", () => {
    useTrainerStore.getState().setPacing(true);
    expect(useTrainerStore.getState().isPacing).toBe(true);
  });

  it("bumpZoneSecond increments the specified zone", () => {
    useTrainerStore.getState().bumpZoneSecond("coherent");
    useTrainerStore.getState().bumpZoneSecond("coherent");
    useTrainerStore.getState().bumpZoneSecond("building");
    const s = useTrainerStore.getState();
    expect(s.zoneSeconds.coherent).toBe(2);
    expect(s.zoneSeconds.building).toBe(1);
    expect(s.zoneSeconds.scattered).toBe(0);
  });

  it("resetSignal clears hr, coherence.ready, and zoneSeconds", () => {
    useTrainerStore.getState().setHr(72);
    useTrainerStore.getState().setCoherence({
      ready: true, progress: 1, score: 80, raw: 78, peakFreqHz: 0.1,
      zone: "coherent", spectrum: [],
    });
    useTrainerStore.getState().bumpZoneSecond("coherent");
    useTrainerStore.getState().resetSignal();
    const s = useTrainerStore.getState();
    expect(s.hr).toBeNull();
    expect(s.coherence.ready).toBe(false);
    expect(s.zoneSeconds).toEqual({ scattered: 0, building: 0, coherent: 0 });
  });
});
```

- [ ] **Step 2: Run to confirm failures**

```bash
bun run test -- lib/__tests__/store.test.ts --reporter=verbose 2>&1 | tail -20
```

Expected: failures for `INITIAL_ZONE_SECONDS`, `bumpZoneSecond`, and updated `resetSignal`.

- [ ] **Step 3: Update lib/store.ts**

Full updated `lib/store.ts`:

```typescript
import { create } from "zustand";
import type { ConnectionState, CoherenceResult, CoherenceZone } from "@/types";
import { PACE } from "@/lib/constants";

export const INITIAL_COHERENCE: CoherenceResult = {
  ready: false,
  progress: 0,
  score: 0,
  raw: 0,
  peakFreqHz: 0,
  zone: "scattered",
  spectrum: [],
};

export const INITIAL_ZONE_SECONDS: Record<CoherenceZone, number> = {
  scattered: 0,
  building: 0,
  coherent: 0,
};

interface TrainerState {
  connection: ConnectionState;
  hr: number | null;
  coherence: CoherenceResult;
  pace: number;
  isPacing: boolean;
  zoneSeconds: Record<CoherenceZone, number>;
  setConnection: (connection: ConnectionState) => void;
  setHr: (hr: number | null) => void;
  setCoherence: (coherence: CoherenceResult) => void;
  setPace: (pace: number) => void;
  setPacing: (isPacing: boolean) => void;
  bumpZoneSecond: (zone: CoherenceZone) => void;
  resetSignal: () => void;
}

const useTrainerStore = create<TrainerState>((set) => ({
  connection: { status: "idle" },
  hr: null,
  coherence: INITIAL_COHERENCE,
  pace: PACE.default,
  isPacing: false,
  zoneSeconds: { ...INITIAL_ZONE_SECONDS },
  setConnection: (connection) => set({ connection }),
  setHr: (hr) => set({ hr }),
  setCoherence: (coherence) => set({ coherence }),
  setPace: (pace) => set({ pace }),
  setPacing: (isPacing) => set({ isPacing }),
  bumpZoneSecond: (zone) =>
    set((s) => ({
      zoneSeconds: { ...s.zoneSeconds, [zone]: s.zoneSeconds[zone] + 1 },
    })),
  resetSignal: () =>
    set({ hr: null, coherence: INITIAL_COHERENCE, zoneSeconds: { ...INITIAL_ZONE_SECONDS } }),
}));

export { useTrainerStore };
```

- [ ] **Step 4: Run store tests**

```bash
bun run test -- lib/__tests__/store.test.ts --reporter=verbose 2>&1 | tail -20
```

Expected: all store tests pass.

- [ ] **Step 5: Run full test suite**

```bash
bun run test
```

Expected: all tests pass (there will be TypeScript errors until Task 6 removes simulator imports, but vitest doesn't type-check — those will be caught in typecheck).

- [ ] **Step 6: Commit**

```bash
git add lib/store.ts lib/__tests__/store.test.ts
git commit -m "feat(store): add zoneSeconds/bumpZoneSecond, remove mode/setMode"
```

---

## Task 6: Remove the simulator

**Files:**
- Modify: `lib/source.ts`
- Modify: `lib/__tests__/source.test.ts`
- Modify: `hooks/useHeartRateSensor.ts`
- Modify: `components/ConnectionButton.tsx`
- Modify: `components/ResonanceFinder.tsx`
- Modify: `components/SessionControls.tsx`

**Interfaces:**
- Consumes: nothing new; removes SimulatedSource, simulatedIbiAt, SourceMode, BeatSource, connectSimulator

- [ ] **Step 1: Update lib/source.ts — remove SimulatedSource and BeatSource**

Full updated `lib/source.ts`:

```typescript
import type { ConnectionState } from "@/types";
import { pushRR } from "@/lib/beatBuffer";
import { parseHeartRate } from "@/lib/ble";
import { HR_SERVICE, HR_MEASUREMENT } from "@/lib/constants";

export interface SourceCallbacks {
  onHr?: (hr: number) => void;
  onConnectionState?: (state: ConnectionState) => void;
}

const GRACE_MS = 6000;

export class BleHeartRateSource {
  private readonly callbacks: SourceCallbacks;
  private device: BluetoothDevice | null = null;
  private char: BluetoothRemoteGATTCharacteristic | null = null;
  private graceTimer: ReturnType<typeof setTimeout> | null = null;
  private sawRR = false;

  private readonly onValueChanged = (event: Event): void => {
    const value = (event.target as BluetoothRemoteGATTCharacteristic).value;
    if (!value) return;
    const packet = parseHeartRate(value);
    this.callbacks.onHr?.(packet.hr);
    if (packet.hasRR && packet.rr.length) {
      if (!this.sawRR) {
        this.sawRR = true;
        this.callbacks.onConnectionState?.({ status: "connected", deviceName: this.device?.name });
      }
      pushRR(packet.rr, performance.now());
    }
  };

  private readonly onDisconnected = (): void => {
    this.callbacks.onConnectionState?.({
      status: "disconnected",
      deviceName: this.device?.name,
    });
  };

  constructor(callbacks: SourceCallbacks = {}) {
    this.callbacks = callbacks;
  }

  async start(): Promise<void> {
    if (typeof navigator === "undefined" || !navigator.bluetooth) {
      throw new Error("Web Bluetooth is not available");
    }

    const device = await navigator.bluetooth.requestDevice({
      filters: [{ services: [HR_SERVICE] }],
    });
    this.device = device;

    device.addEventListener("gattserverdisconnected", this.onDisconnected);
    this.callbacks.onConnectionState?.({ status: "connecting", deviceName: device.name });

    const gatt = device.gatt;
    if (!gatt) throw new Error("No GATT server on device");

    const server = await gatt.connect();
    const service = await server.getPrimaryService(HR_SERVICE);
    const char = await service.getCharacteristic(HR_MEASUREMENT);
    this.char = char;

    char.addEventListener("characteristicvaluechanged", this.onValueChanged);
    await char.startNotifications();
    this.callbacks.onConnectionState?.({ status: "connected", deviceName: device.name });

    this.graceTimer = setTimeout(() => {
      if (!this.sawRR) {
        this.callbacks.onConnectionState?.({
          status: "no-rr",
          deviceName: device.name,
          message: "This strap isn't sending beat-to-beat data.",
        });
      }
    }, GRACE_MS);
  }

  stop(): void {
    if (this.graceTimer !== null) {
      clearTimeout(this.graceTimer);
      this.graceTimer = null;
    }
    if (this.char) {
      this.char.removeEventListener("characteristicvaluechanged", this.onValueChanged);
      this.char.stopNotifications().catch(() => {});
      this.char = null;
    }
    if (this.device) {
      this.device.removeEventListener("gattserverdisconnected", this.onDisconnected);
      this.device.gatt?.disconnect();
      this.device = null;
    }
    this.sawRR = false;
  }
}
```

- [ ] **Step 2: Update lib/__tests__/source.test.ts — remove simulator tests**

Full updated `lib/__tests__/source.test.ts`:

```typescript
import { describe, it, expect } from "vitest";
import { BleHeartRateSource } from "@/lib/source";

describe("BleHeartRateSource", () => {
  it("rejects when navigator.bluetooth is unavailable (node has none)", async () => {
    expect(typeof navigator === "undefined" || !navigator.bluetooth).toBe(true);
    const src = new BleHeartRateSource();
    await expect(src.start()).rejects.toThrow(/Web Bluetooth is not available/);
  });

  it("stop is idempotent and does not throw", () => {
    const src = new BleHeartRateSource();
    expect(() => src.stop()).not.toThrow();
    expect(() => src.stop()).not.toThrow();
  });
});
```

- [ ] **Step 3: Update hooks/useHeartRateSensor.ts — remove simulator + add coherenceBuffer.reset**

Full updated `hooks/useHeartRateSensor.ts`:

```typescript
import { useCallback, useEffect, useMemo, useRef } from "react";
import type { ConnectionState } from "@/types";
import { useTrainerStore } from "@/lib/store";
import { reset as resetBeatBuffer } from "@/lib/beatBuffer";
import { reset as resetCoherenceBuffer } from "@/lib/coherenceBuffer";
import { BleHeartRateSource, type SourceCallbacks } from "@/lib/source";

const HR_THROTTLE_MS = 1000;

function readableError(err: unknown): string {
  if (err instanceof Error && err.message) return err.message;
  return "Could not connect to the heart-rate sensor.";
}

export function useHeartRateSensor(): {
  connection: ConnectionState;
  supported: boolean;
  connect: () => Promise<void>;
  disconnect: () => void;
} {
  const connection = useTrainerStore((s) => s.connection);
  const sourceRef = useRef<BleHeartRateSource | null>(null);
  const lastHrTsRef = useRef(0);

  const callbacks = useMemo<SourceCallbacks>(
    () => ({
      onConnectionState: (state) => {
        useTrainerStore.getState().setConnection(state);
      },
      onHr: (hr) => {
        const now = performance.now();
        if (now - lastHrTsRef.current < HR_THROTTLE_MS) return;
        lastHrTsRef.current = now;
        useTrainerStore.getState().setHr(Math.round(hr));
      },
    }),
    [],
  );

  const connect = useCallback(async (): Promise<void> => {
    const supported = typeof navigator !== "undefined" && "bluetooth" in navigator;
    const store = useTrainerStore.getState();
    if (!supported) {
      store.setConnection({
        status: "unsupported",
        message: "Web Bluetooth needs Chrome or Edge over localhost or HTTPS.",
      });
      return;
    }
    resetBeatBuffer();
    resetCoherenceBuffer();
    store.resetSignal();
    store.setConnection({ status: "requesting" });
    const src = new BleHeartRateSource(callbacks);
    sourceRef.current = src;
    try {
      await src.start();
    } catch (err) {
      sourceRef.current = null;
      const cancelled =
        err instanceof DOMException &&
        (err.name === "NotFoundError" || err.name === "AbortError");
      if (cancelled) {
        store.setConnection({ status: "idle" });
      } else {
        store.setConnection({ status: "error", message: readableError(err) });
      }
    }
  }, [callbacks]);

  const disconnect = useCallback((): void => {
    sourceRef.current?.stop();
    sourceRef.current = null;
    resetBeatBuffer();
    resetCoherenceBuffer();
    const store = useTrainerStore.getState();
    store.resetSignal();
    store.setConnection({ status: "disconnected" });
  }, []);

  useEffect(
    () => () => {
      sourceRef.current?.stop();
    },
    [],
  );

  const supported = typeof navigator !== "undefined" && "bluetooth" in navigator;

  return { connection, supported, connect, disconnect };
}
```

- [ ] **Step 4: Update components/ConnectionButton.tsx — remove simulator UI**

Full updated `components/ConnectionButton.tsx`:

```typescript
"use client";

import type { ReactNode } from "react";
import { useHeartRateSensor } from "@/hooks/useHeartRateSensor";

/**
 * Surfaces the full ConnectionState as quiet, directive UI. The switch over
 * connection.status is exhaustive (every ConnectionStatus + a `never` default),
 * so adding a status to the type forces a compile error here.
 */
export default function ConnectionButton() {
  const { connection, connect, disconnect } = useHeartRateSensor();

  const connectStrap = (
    <button type="button" className="btn btn-primary" onClick={() => void connect()}>
      connect strap
    </button>
  );
  const disconnectBtn = (
    <button type="button" className="btn btn-ghost" onClick={disconnect}>
      disconnect
    </button>
  );

  let content: ReactNode;

  switch (connection.status) {
    case "idle":
      content = connectStrap;
      break;

    case "requesting":
    case "connecting":
      content = (
        <div className="flex items-center gap-2.5 text-sm text-fg-muted">
          <span className="spinner" aria-hidden="true" />
          <span>connecting…</span>
        </div>
      );
      break;

    case "connected":
      content = (
        <div className="flex flex-wrap items-center justify-center gap-3">
          <span className="flex items-center gap-2 text-sm text-fg">
            <span
              className="inline-block h-1.5 w-1.5 rounded-full bg-zone"
              aria-hidden="true"
            />
            {connection.deviceName ?? "connected"}
          </span>
          {disconnectBtn}
        </div>
      );
      break;

    case "no-rr":
      content = (
        <div className="flex flex-col items-center gap-2 text-center">
          <p className="max-w-sm text-sm text-fg-muted">
            {connection.message ?? "This strap isn't sending beat-to-beat data."}
          </p>
          <p className="max-w-sm text-xs text-fg-faint">
            Try a strap that reports RR intervals (e.g. Polar H10).
          </p>
          {disconnectBtn}
        </div>
      );
      break;

    case "unsupported":
      content = (
        <p className="max-w-sm text-sm text-fg-muted">
          {connection.message ?? "Web Bluetooth needs Chrome or Edge over localhost or HTTPS."}
        </p>
      );
      break;

    case "error":
      content = (
        <div className="flex flex-col items-center gap-2 text-center">
          <p className="max-w-sm text-sm text-fg-muted">
            {connection.message ?? "Could not connect to the heart-rate sensor."}
          </p>
          <button type="button" className="btn btn-primary" onClick={() => void connect()}>
            try again
          </button>
        </div>
      );
      break;

    case "disconnected":
      content = (
        <button type="button" className="btn btn-primary" onClick={() => void connect()}>
          reconnect
        </button>
      );
      break;

    default: {
      const _exhaustive: never = connection.status;
      content = _exhaustive;
    }
  }

  return (
    <div aria-live="polite" className="flex min-h-[2.75rem] items-center justify-center">
      {content}
    </div>
  );
}
```

- [ ] **Step 5: Remove simulator copy from ResonanceFinder.tsx**

In `components/ResonanceFinder.tsx`, find the disabled state (around line 138–149) and update the copy to remove simulator mention:

Old text:
```
Connect a strap or start the simulator first, then we can sweep your breathing pace to
find where coherence is strongest.
```

New text:
```
Connect a strap, then we can sweep your breathing pace to find where coherence is strongest.
```

The `<p>` element should become:
```tsx
<p className="max-w-xs text-xs text-fg-faint">
  Connect a strap, then we can sweep your breathing pace to find where coherence is strongest.
</p>
```

- [ ] **Step 6: Remove simulator doc comment from SessionControls.tsx**

In `components/SessionControls.tsx`, remove this comment line from the JSDoc:
```
 * The simulator affordance lives in ConnectionButton, so it isn't duplicated here. Session recording UX beyond
```

Replace the whole JSDoc with a clean one sentence:
```typescript
/**
 * Pace slider (persisted to settings) and start/stop session button.
 */
```

- [ ] **Step 7: Run tests + typecheck**

```bash
bun run test && bun run typecheck
```

Expected: all tests pass, no TypeScript errors.

- [ ] **Step 8: Commit**

```bash
git add lib/source.ts lib/__tests__/source.test.ts hooks/useHeartRateSensor.ts \
  components/ConnectionButton.tsx components/ResonanceFinder.tsx components/SessionControls.tsx
git commit -m "feat: remove simulator — BLE-only source, coherenceBuffer.reset on connect/disconnect"
```

---

## Task 7: Hook updates — useCoherence feeds coherenceBuffer + zoneSeconds

**Files:**
- Modify: `hooks/useCoherence.ts`

**Interfaces:**
- Consumes: `pushSample` from coherenceBuffer, `bumpZoneSecond` from store

- [ ] **Step 1: Update hooks/useCoherence.ts**

Full updated `hooks/useCoherence.ts`:

```typescript
import { useEffect, useRef } from "react";
import type { ZoneThresholds } from "@/types";
import { useTrainerStore } from "@/lib/store";
import { computeCoherence } from "@/lib/coherence";
import { getBeats, nowOnTimeline } from "@/lib/beatBuffer";
import { pushSample } from "@/lib/coherenceBuffer";
import { DEFAULT_ZONE_THRESHOLDS } from "@/lib/constants";

/**
 * Once the sensor is connected, recomputes the coherence metric ~1× per second
 * and pushes the result to the store, coherenceBuffer, and zoneSeconds counter.
 * The EMA carry-over (`prevScore`) is held in a ref so it never triggers a
 * re-render, and resets whenever we leave the connected state.
 */
export function useCoherence(thresholds: ZoneThresholds = DEFAULT_ZONE_THRESHOLDS): void {
  const status = useTrainerStore((s) => s.connection.status);
  const prevScoreRef = useRef<number | null>(null);
  const { building, coherent } = thresholds;

  useEffect(() => {
    if (status !== "connected") {
      prevScoreRef.current = null;
      return;
    }
    const interval = setInterval(() => {
      const result = computeCoherence(getBeats(), nowOnTimeline(), prevScoreRef.current, {
        building,
        coherent,
      });
      if (result.ready) {
        prevScoreRef.current = result.score;
        pushSample(result.score, result.zone, performance.now());
        useTrainerStore.getState().bumpZoneSecond(result.zone);
      }
      useTrainerStore.getState().setCoherence(result);
    }, 1000);

    return () => {
      clearInterval(interval);
    };
  }, [status, building, coherent]);
}
```

- [ ] **Step 2: Typecheck**

```bash
bun run typecheck
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add hooks/useCoherence.ts
git commit -m "feat(hooks): useCoherence feeds coherenceBuffer and bumps zoneSeconds"
```

---

## Task 8: zoneTime helper + tests

**Files:**
- Create: `lib/zoneTime.ts`
- Create: `lib/__tests__/zoneTime.test.ts`

**Interfaces:**
- Produces: `zoneProportions(zoneSeconds: Record<CoherenceZone, number>): Record<CoherenceZone, number>`

- [ ] **Step 1: Write the failing test**

Create `lib/__tests__/zoneTime.test.ts`:

```typescript
import { describe, it, expect } from "vitest";
import { zoneProportions } from "@/lib/zoneTime";

describe("zoneProportions", () => {
  it("proportions are correct and sum to 1 when data is present", () => {
    const p = zoneProportions({ scattered: 30, building: 20, coherent: 10 });
    expect(p.scattered).toBeCloseTo(0.5, 6);
    expect(p.building).toBeCloseTo(1 / 3, 5);
    expect(p.coherent).toBeCloseTo(1 / 6, 5);
    expect(p.scattered + p.building + p.coherent).toBeCloseTo(1, 10);
  });

  it("all-zero case returns all zeros without divide-by-zero", () => {
    const p = zoneProportions({ scattered: 0, building: 0, coherent: 0 });
    expect(p.scattered).toBe(0);
    expect(p.building).toBe(0);
    expect(p.coherent).toBe(0);
  });

  it("single non-zero zone gets proportion 1", () => {
    const p = zoneProportions({ scattered: 0, building: 60, coherent: 0 });
    expect(p.building).toBe(1);
    expect(p.scattered).toBe(0);
    expect(p.coherent).toBe(0);
  });
});
```

- [ ] **Step 2: Run to confirm failure**

```bash
bun run test -- lib/__tests__/zoneTime.test.ts --reporter=verbose 2>&1 | tail -10
```

Expected: `Cannot find module '@/lib/zoneTime'`.

- [ ] **Step 3: Implement lib/zoneTime.ts**

```typescript
import type { CoherenceZone } from "@/types";

const ZONES: CoherenceZone[] = ["scattered", "building", "coherent"];

export function zoneProportions(
  zoneSeconds: Record<CoherenceZone, number>,
): Record<CoherenceZone, number> {
  const total = ZONES.reduce((sum, z) => sum + zoneSeconds[z], 0);
  if (total === 0) return { scattered: 0, building: 0, coherent: 0 };
  return {
    scattered: zoneSeconds.scattered / total,
    building: zoneSeconds.building / total,
    coherent: zoneSeconds.coherent / total,
  };
}
```

- [ ] **Step 4: Run tests**

```bash
bun run test -- lib/__tests__/zoneTime.test.ts --reporter=verbose
```

Expected: 3 tests pass.

- [ ] **Step 5: Commit**

```bash
git add lib/zoneTime.ts lib/__tests__/zoneTime.test.ts
git commit -m "feat(lib): zoneTime — pure proportion helper for ZoneTimeChart"
```

---

## Task 9: MetricPanel + VitalsHeader components

**Files:**
- Create: `components/MetricPanel.tsx`
- Create: `components/VitalsHeader.tsx`

- [ ] **Step 1: Create components/MetricPanel.tsx**

```typescript
"use client";

import type { ReactNode } from "react";

interface MetricPanelProps {
  title: string;
  value?: ReactNode;
  children: ReactNode;
  className?: string;
}

export default function MetricPanel({ title, value, children, className = "" }: MetricPanelProps) {
  return (
    <section
      aria-label={title}
      className={`flex flex-col gap-3 rounded-xl border p-4 ${className}`}
      style={{ background: "var(--bg-elevated)", borderColor: "var(--line)" }}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="text-[0.68rem] uppercase tracking-[0.18em] text-fg-faint">{title}</span>
        {value !== undefined ? <div className="flex items-center">{value}</div> : null}
      </div>
      {children}
    </section>
  );
}
```

- [ ] **Step 2: Create components/VitalsHeader.tsx**

```typescript
"use client";

import { useTrainerStore } from "@/lib/store";
import ConnectionButton from "@/components/ConnectionButton";

export default function VitalsHeader() {
  const coherence = useTrainerStore((s) => s.coherence);
  const hr = useTrainerStore((s) => s.hr);
  const zone = useTrainerStore((s) => s.coherence.zone);

  return (
    <header
      className="flex w-full flex-wrap items-center justify-between gap-x-6 gap-y-3 border-b pb-4"
      style={{ borderColor: "var(--line)" }}
    >
      <ConnectionButton />

      <div className="flex items-center gap-6">
        <div aria-live="polite" className="flex flex-col items-end">
          {coherence.ready ? (
            <span className="tnum text-2xl font-light leading-none text-zone">
              {Math.round(coherence.score)}
            </span>
          ) : (
            <span className="tnum text-base leading-none text-fg-muted">
              {Math.round(coherence.progress * 100)}%
            </span>
          )}
          <span className="text-[0.65rem] uppercase tracking-[0.18em] text-fg-faint">
            coherence
          </span>
        </div>

        <div className="flex flex-col items-end">
          <span className="tnum text-base leading-none text-fg-muted">
            {hr === null ? "—" : String(hr)}
          </span>
          <span className="text-[0.65rem] uppercase tracking-[0.18em] text-fg-faint">bpm</span>
        </div>

        <div className="flex flex-col items-end">
          <span className="text-base capitalize leading-none text-zone">{zone}</span>
          <span className="text-[0.65rem] uppercase tracking-[0.18em] text-fg-faint">zone</span>
        </div>
      </div>
    </header>
  );
}
```

- [ ] **Step 3: Typecheck**

```bash
bun run typecheck
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add components/MetricPanel.tsx components/VitalsHeader.tsx
git commit -m "feat(ui): MetricPanel frame + VitalsHeader strip"
```

---

## Task 10: Graph components — CoherenceGraph, SpectrumChart, ZoneTimeChart, BarChartPanel

**Files:**
- Create: `components/CoherenceGraph.tsx`
- Create: `components/SpectrumChart.tsx`
- Create: `components/ZoneTimeChart.tsx`
- Create: `components/BarChartPanel.tsx`

**Interfaces:**
- `CoherenceGraph` accepts `thresholds?: ZoneThresholds`, wraps itself in MetricPanel
- `SpectrumChart` is a bare chart (no MetricPanel); `BarChartPanel` wraps it
- `ZoneTimeChart` is a bare chart (no MetricPanel); `BarChartPanel` wraps it

- [ ] **Step 1: Create components/CoherenceGraph.tsx**

```typescript
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
```

- [ ] **Step 2: Create components/SpectrumChart.tsx**

This is a bare chart component (no MetricPanel wrapper — BarChartPanel provides that).

```typescript
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
```

- [ ] **Step 3: Create components/ZoneTimeChart.tsx**

Bare chart component (no MetricPanel — BarChartPanel wraps it).

```typescript
"use client";

import { useTrainerStore } from "@/lib/store";
import { zoneProportions } from "@/lib/zoneTime";
import type { CoherenceZone } from "@/types";

const ZONES: CoherenceZone[] = ["scattered", "building", "coherent"];

const ZONE_COLOR: Record<CoherenceZone, string> = {
  scattered: "var(--zone-scattered)",
  building: "var(--zone-building)",
  coherent: "var(--zone-coherent)",
};

function fmtSeconds(s: number): string {
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${m}:${String(sec).padStart(2, "0")}`;
}

export default function ZoneTimeChart() {
  const zoneSeconds = useTrainerStore((s) => s.zoneSeconds);
  const proportions = zoneProportions(zoneSeconds);

  return (
    <div className="flex flex-col gap-2.5">
      {ZONES.map((zone) => (
        <div key={zone} className="flex flex-col gap-1">
          <div className="flex items-baseline justify-between">
            <span className="text-[0.68rem] uppercase tracking-[0.12em] text-fg-faint capitalize">
              {zone}
            </span>
            <span className="tnum text-[0.68rem] text-fg-faint">
              {fmtSeconds(zoneSeconds[zone])}
            </span>
          </div>
          <div
            className="h-1.5 overflow-hidden rounded-full"
            style={{ background: "var(--line)" }}
            role="progressbar"
            aria-valuenow={Math.round(proportions[zone] * 100)}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label={`${zone}: ${fmtSeconds(zoneSeconds[zone])}`}
          >
            <div
              className="h-full rounded-full"
              style={{
                width: `${proportions[zone] * 100}%`,
                background: ZONE_COLOR[zone],
                transition: "width 700ms ease",
              }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}
```

- [ ] **Step 4: Create components/BarChartPanel.tsx**

```typescript
"use client";

import { useState } from "react";
import MetricPanel from "@/components/MetricPanel";
import SpectrumChart from "@/components/SpectrumChart";
import ZoneTimeChart from "@/components/ZoneTimeChart";

type Tab = "spectrum" | "zone";

export default function BarChartPanel() {
  const [tab, setTab] = useState<Tab>("spectrum");

  const toggle = (
    <div
      className="flex overflow-hidden rounded-full text-[0.63rem]"
      style={{ border: "1px solid var(--line-strong)" }}
    >
      {(["spectrum", "zone"] as Tab[]).map((t) => (
        <button
          key={t}
          type="button"
          className="px-2.5 py-0.5 uppercase tracking-[0.12em] transition-colors"
          style={{
            background: tab === t ? "var(--line-strong)" : "transparent",
            color: tab === t ? "var(--fg)" : "var(--fg-faint)",
          }}
          onClick={() => setTab(t)}
        >
          {t}
        </button>
      ))}
    </div>
  );

  return (
    <MetricPanel
      title={tab === "spectrum" ? "hrv spectrum" : "time in zone"}
      value={toggle}
    >
      {tab === "spectrum" ? <SpectrumChart /> : <ZoneTimeChart />}
    </MetricPanel>
  );
}
```

- [ ] **Step 5: Typecheck**

```bash
bun run typecheck
```

Expected: no errors.

- [ ] **Step 6: Commit**

```bash
git add components/CoherenceGraph.tsx components/SpectrumChart.tsx \
  components/ZoneTimeChart.tsx components/BarChartPanel.tsx
git commit -m "feat(ui): CoherenceGraph, SpectrumChart, ZoneTimeChart, BarChartPanel"
```

---

## Task 11: Update existing components + delete CoherenceGauge

**Files:**
- Modify: `components/BreathOrb.tsx`
- Modify: `components/LiveWaveform.tsx`
- Delete: `components/CoherenceGauge.tsx`

- [ ] **Step 1: Add size prop to components/BreathOrb.tsx**

Full updated `components/BreathOrb.tsx`:

```typescript
"use client";

import { useRef, type CSSProperties } from "react";
import type { CoherenceZone } from "@/types";
import { useBreathPacer } from "@/hooks/useBreathPacer";
import { ZONE_VAR } from "@/lib/constants";

interface BreathOrbProps {
  pace: number;
  zone: CoherenceZone;
  /** false → reduced motion: static ring, label still flips. */
  animate: boolean;
  /** CSS length for the orb diameter. Defaults to the hero size. */
  size?: string;
}

export default function BreathOrb({ pace, zone, animate, size }: BreathOrbProps) {
  const orbRef = useRef<HTMLDivElement | null>(null);
  const { inhaling } = useBreathPacer(pace, animate, orbRef);

  const phase = inhaling ? "breathe in" : "breathe out";
  const label = `${phase}. Pacing at ${pace} breaths per minute. Coherence is ${zone}.`;

  const dim = size ?? "min(62vmin, 40vh, 22rem)";
  const zoneStyle: CSSProperties = {
    ["--zone" as string]: ZONE_VAR[zone],
    width: dim,
    height: dim,
  };

  return (
    <div role="img" aria-label={label} className="grid place-items-center" style={zoneStyle}>
      {animate ? (
        <div ref={orbRef} className="orb h-full w-full">
          <span className="orb-label">{phase}</span>
        </div>
      ) : (
        <div className="orb-ring h-full w-full">
          <span className="orb-label">{phase}</span>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Restyle LiveWaveform into a MetricPanel**

Full updated `components/LiveWaveform.tsx`:

```typescript
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
```

- [ ] **Step 3: Delete CoherenceGauge.tsx**

```bash
rm /home/user/projects/coherence/components/CoherenceGauge.tsx
```

- [ ] **Step 4: Typecheck**

```bash
bun run typecheck
```

Expected: no errors (Trainer.tsx will fail until Task 12 removes the CoherenceGauge import — proceed if the only errors are in Trainer.tsx).

- [ ] **Step 5: Commit**

```bash
git add components/BreathOrb.tsx components/LiveWaveform.tsx
git rm components/CoherenceGauge.tsx
git commit -m "feat(ui): BreathOrb size prop, LiveWaveform MetricPanel, remove CoherenceGauge"
```

---

## Task 12: Trainer.tsx — split-screen dashboard layout

**Files:**
- Modify: `components/Trainer.tsx`

This is the integration task. Trainer gets the vitals strip + two-column layout.

- [ ] **Step 1: Update components/Trainer.tsx**

Full updated `components/Trainer.tsx`:

```typescript
"use client";

import { useEffect, useId, useState, type CSSProperties } from "react";
import Link from "next/link";
import type { Settings } from "@/types";
import { useTrainerStore } from "@/lib/store";
import { useCoherence } from "@/hooks/useCoherence";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import { loadSettings } from "@/lib/settings";
import { ZONE_VAR } from "@/lib/constants";
import VitalsHeader from "@/components/VitalsHeader";
import BreathOrb from "@/components/BreathOrb";
import LiveWaveform from "@/components/LiveWaveform";
import CoherenceGraph from "@/components/CoherenceGraph";
import BarChartPanel from "@/components/BarChartPanel";
import SessionControls from "@/components/SessionControls";
import ResonanceFinder from "@/components/ResonanceFinder";

export default function Trainer() {
  const [settings] = useState<Settings>(loadSettings);

  const reduced = useReducedMotion(settings.reducedMotionOverride);
  const animate = !reduced;

  useCoherence(settings.zoneThresholds);

  const pace = useTrainerStore((s) => s.pace);
  const setPace = useTrainerStore((s) => s.setPace);
  const zone = useTrainerStore((s) => s.coherence.zone);

  const [resonanceOpen, setResonanceOpen] = useState(false);
  const resonanceId = useId();

  useEffect(() => {
    setPace(settings.pace);
  }, [settings.pace, setPace]);

  const screenStyle: CSSProperties = { ["--zone" as string]: ZONE_VAR[zone] };

  return (
    <div style={screenStyle} className="relative isolate flex flex-1 flex-col">
      <div className="app-atmosphere" aria-hidden="true" />

      <main className="relative z-10 mx-auto flex min-h-0 w-full max-w-4xl flex-1 flex-col gap-5 px-6 py-6">
        <VitalsHeader />

        {/* Two columns on md+; single column stacked below */}
        <div className="flex flex-1 flex-col gap-5 md:flex-row md:items-start md:gap-6">

          {/* Left ~38%: breath orb + controls */}
          <div className="flex flex-col items-center gap-6 md:w-[38%]">
            <BreathOrb
              size="min(34vmin, 16rem)"
              pace={pace}
              zone={zone}
              animate={animate}
            />

            <SessionControls />

            <div className="flex w-full max-w-xs flex-col items-center gap-4">
              <button
                type="button"
                className="text-xs uppercase tracking-[0.18em] text-fg-faint underline-offset-4 transition-colors hover:text-fg-muted focus-visible:text-fg-muted"
                aria-expanded={resonanceOpen}
                aria-controls={resonanceId}
                onClick={() => setResonanceOpen((open) => !open)}
              >
                {resonanceOpen ? "hide resonance finder" : "find my resonance"}
              </button>
              {resonanceOpen ? (
                <div id={resonanceId} className="flex w-full justify-center">
                  <ResonanceFinder />
                </div>
              ) : null}
            </div>

            <Link
              href="/history"
              className="text-xs text-fg-faint underline-offset-4 transition-colors hover:text-fg-muted focus-visible:text-fg-muted"
            >
              history
            </Link>
          </div>

          {/* Right ~62%: graph stack */}
          <div className="flex flex-col gap-4 md:flex-1">
            <LiveWaveform />
            <CoherenceGraph thresholds={settings.zoneThresholds} />
            <BarChartPanel />
          </div>
        </div>
      </main>
    </div>
  );
}
```

- [ ] **Step 2: Run full typecheck**

```bash
bun run typecheck
```

Expected: no errors.

- [ ] **Step 3: Run full test suite**

```bash
bun run test
```

Expected: all tests pass.

- [ ] **Step 4: Run lint**

```bash
bun run lint
```

Expected: no errors or warnings introduced by these changes.

- [ ] **Step 5: Commit**

```bash
git add components/Trainer.tsx
git commit -m "feat(ui): split-screen dashboard layout — vitals strip, graph panels, side orb"
```

---

## Task 13: Final verification pass

- [ ] **Step 1: Full test suite**

```bash
bun run test -- --reporter=verbose
```

Expected: **all tests green**. The test file count should match what was before minus the removed simulator tests plus the added tests (`coherenceBuffer`, `zoneTime`, expanded `coherence` spectrum tests).

- [ ] **Step 2: Typecheck**

```bash
bun run typecheck
```

Expected: **0 errors**.

- [ ] **Step 3: Lint**

```bash
bun run lint
```

Expected: **0 errors**.

- [ ] **Step 4: Confirm deleted files are gone**

```bash
ls components/CoherenceGauge.tsx 2>&1 && echo "ERROR: file still exists"
ls pnpm-lock.yaml 2>&1 && echo "ERROR: file still exists"
ls pnpm-workspace.yaml 2>&1 && echo "ERROR: file still exists"
```

Expected: all three output "No such file" (not "ERROR: file still exists").

- [ ] **Step 5: Confirm simulator is fully removed**

```bash
grep -r "simulator\|SimulatedSource\|simulatedIbi\|connectSimulator\|SourceMode" \
  --include="*.ts" --include="*.tsx" \
  lib/ hooks/ components/ types/ \
  2>/dev/null | grep -v "__tests__" | grep -v ".test." || echo "Clean — no simulator references"
```

Expected: output is `Clean — no simulator references` (or grep returns nothing outside of non-test files).

- [ ] **Step 6: Confirm bun.lock exists**

```bash
ls bun.lock && echo "bun.lock present"
```

Expected: `bun.lock present`.

- [ ] **Step 7: Final commit (if any stray changes)**

If there are any unstaged changes at this point (edge-case cleanups, incidental whitespace), stage and commit:

```bash
git status
# If clean: done. If any changes:
git add -A
git commit -m "chore: final cleanup from coherence monitor redesign"
```

---

## Self-Review

Checking each spec section against plan tasks:

| Spec requirement | Covered by |
|-----------------|------------|
| Split-screen layout (vitals + left + right) | Task 12 |
| Breakpoint md (768px) single-column collapse | Task 12 |
| VitalsHeader with connection, score, HR, zone | Task 9 |
| CoherenceGraph (canvas, rAF, zone thresholds, gradient) | Task 10 |
| SpectrumChart (SVG, 1 Hz, peak highlight, x-axis labels) | Task 10 |
| ZoneTimeChart (3 bars, mm:ss, proportions) | Task 8 + Task 10 |
| BarChartPanel (segmented toggle, default spectrum) | Task 10 |
| MetricPanel (border, elevated bg, title/value) | Task 9 |
| BreathOrb size prop | Task 11 |
| LiveWaveform → MetricPanel "heart rhythm" + gradient fill | Task 11 |
| ConnectionButton simulator removal | Task 6 |
| CoherenceGauge removed | Task 11 |
| coherenceBuffer module (pushSample, getSamples, reset, subscribe) | Task 3 |
| CoherenceResult.spectrum field | Task 2 + Task 4 |
| store.zoneSeconds + bumpZoneSecond | Task 5 |
| useCoherence pushSample + bumpZoneSecond | Task 7 |
| useHeartRateSensor coherenceBuffer.reset on connect/disconnect | Task 6 |
| SimulatedSource removed | Task 6 |
| SourceMode removed | Task 2 + Task 6 |
| COHERENCE_HISTORY_S = 180, SPECTRUM_BAND | Task 2 |
| pnpm → bun | Task 1 |
| README updated for bun | Task 1 |
| ResonanceFinder simulator copy removed | Task 6 |
| SessionControls doc comment | Task 6 |
| Tests: coherenceBuffer push/prune/reset | Task 3 |
| Tests: spectrum in computeCoherence | Task 4 |
| Tests: zoneProportions | Task 8 |
| Tests: simulator tests removed from source.test.ts | Task 6 |
| Full test + typecheck + lint pass | Task 13 |
| Liveness: graphs render live on connect (not gated) | Achieved — components read buffers/store continuously |
| open question mode/SourceMode removed | Task 2 (type) + Task 5 (store) + Task 6 (usages) |
