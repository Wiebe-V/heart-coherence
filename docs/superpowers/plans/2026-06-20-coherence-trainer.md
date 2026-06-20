# Coherence Trainer Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A local-first, browser-only HRV coherence biofeedback trainer in Next.js 15 that reads beat-to-beat intervals from a Bluetooth chest strap, computes a HeartMath-style spectral coherence score in real time, and guides paced breathing — with a resonance finder, IndexedDB session history, and a hardware-free simulate mode.

**Architecture:** A layered design. Pure, dependency-free `lib/` modules (`fft`, `resample`, `coherence`, BLE parser) carry all the load-bearing math and are fully unit-tested. A module-singleton ring buffer holds the high-frequency beat stream so it never enters React state. A `BeatSource` interface unifies real BLE and the simulator. Thin hooks bridge sources/metrics into a Zustand store that holds only throttled, derived values (~1 Hz HR, ~1 Hz smoothed coherence, rAF pacer phase). The canvas waveform reads the ring buffer directly inside its own rAF loop. All sensor-touching UI is loaded via `next/dynamic({ ssr: false })`; the app prerenders without touching `navigator.*` or `window`.

**Tech Stack:** Next.js 15 (App Router), React 19, TypeScript strict. State: `zustand`. Persistence: `idb` (IndexedDB) + `localStorage` for settings. Tests: Vitest. Styling: Tailwind v4 (create-next-app default) for layout + plain CSS keyframes for the orb. No charting lib, no UI kit, no FFT package — FFT, resampler, and all canvas drawing are hand-rolled.

---

## Decisions made (so you don't have to ask)

These are the "sensible defaults" the spec told me to pick. All are noted in the README.

- **Next version:** **Next 16 (latest, 16.2.9)** — the user gave the go-ahead to use the latest packages incl. Next 16, so we use what `create-next-app` emits rather than pinning back to 15. React 19.2, strict TS.
- **Package manager:** `pnpm` (11.8) via corepack, with a shim installed into `~/.local/bin` (`corepack enable --install-directory ~/.local/bin pnpm`) since there's no standalone `pnpm` on PATH. Build scripts for `esbuild`/`unrs-resolver` are allow-listed in `pnpm-workspace.yaml` (`allowBuilds`), `sharp` left off. The user also OK'd bun; we stayed on pnpm because it was already configured and working — trivially switchable later.
- **Scaffold:** empty dir → `create-next-app`. Flags: `--ts --app --eslint --tailwind --no-src-dir --import-alias "@/*" --turbopack`. No `src/` dir so the tree matches the spec (`app/`, `components/`, `lib/`, `hooks/`, `types/` at root).
- **Tailwind:** kept because the scaffold includes it by default (spec permits this). Used for layout/spacing only; the orb's breathing animation and zone colors live in a small CSS module / globals with CSS custom properties.
- **Beat buffer home:** a dedicated module singleton `lib/beatBuffer.ts` (not listed in the spec's tree, but it is the cleanest home for the explicitly-required "module singleton" pattern — keeps `ble.ts` a pure parser/transport and gives the canvas + coherence loop one shared reader).
- **Source abstraction:** a `BeatSource` interface implemented by `BleHeartRateSource` and `SimulatedSource`, so simulate mode is a first-class peer of real hardware, not a hack. Both feed the same `beatBuffer`.
- **Reduced motion:** `prefers-reduced-motion` honored, with a `localStorage` override (`reducedMotionOverride: boolean | null`, null = follow system).

---

## Proposed file structure

```
app/
  layout.tsx              // root layout, dark theme, metadata, privacy footer
  page.tsx                // dynamic({ssr:false}) import of the Trainer
  history/page.tsx        // dynamic({ssr:false}) import of SessionHistory
  globals.css             // Tailwind + theme vars + orb keyframes
components/
  Trainer.tsx             // client root: composes the whole single-screen trainer
  ConnectionButton.tsx    // connect/disconnect/simulate; surfaces ConnectionState
  BreathOrb.tsx           // hero; clock-driven scale, reduced-motion fallback
  CoherenceGauge.tsx      // big number + ready/collecting progress, aria-live
  ZoneBar.tsx             // scattered/building/coherent indicator
  LiveWaveform.tsx        // <canvas>, own rAF, reads beatBuffer ref directly
  SessionControls.tsx     // start/stop session, pace slider, simulate toggle
  ResonanceFinder.tsx     // guided pace sweep + result bars
  SessionHistory.tsx      // list + sparklines + open/delete/export
  Sparkline.tsx           // tiny hand-drawn SVG/canvas trace (shared)
lib/
  ble.ts                  // Web Bluetooth transport + 0x2A37 parser (pure parse fn exported)
  beatBuffer.ts           // module-singleton ring buffer of Beat[]
  source.ts               // BeatSource interface + BleHeartRateSource + SimulatedSource
  fft.ts                  // iterative radix-2 Cooley–Tukey (verbatim from spec)
  resample.ts             // IBI tachogram → even 4 Hz grid, 256 samples
  coherence.ts            // window → resample → detrend → Hann → fft → ratio
  db.ts                   // idb session store (CRUD + export)
  store.ts                // zustand store (throttled derived values only)
  settings.ts             // localStorage settings load/save
  constants.ts            // FS, N, bands, zone thresholds, pace range, UUIDs
  export.ts               // session → JSON / CSV
  zones.ts                // score → CoherenceZone (uses thresholds)
hooks/
  useHeartRateSensor.ts   // owns a BeatSource; connect/disconnect; ConnectionState
  useCoherence.ts         // 1 Hz setInterval metric loop → store
  useBreathPacer.ts       // rAF phase from clock → store (or local state)
  useReducedMotion.ts     // system pref + override
  useSession.ts           // record/finish a session, write to db
types/
  index.ts                // all shared types
lib/__tests__/
  fft.test.ts
  resample.test.ts
  coherence.test.ts
  ble.test.ts
  zones.test.ts
vitest.config.ts
README.md
```

## Key type definitions (`types/index.ts`)

```ts
export interface Beat {
  t: number;    // ms, cumulative beat timeline (seeded from performance.now())
  ibi: number;  // inter-beat interval, ms
  hr: number;   // bpm, 60000 / ibi
}

/** Result of parsing one 0x2A37 notification DataView. */
export interface HeartRatePacket {
  hr: number;          // bpm
  rr: number[];        // RR intervals in ms (already converted from 1/1024 s); [] if none
  hasRR: boolean;      // flags bit 4
  energyExpended?: number;
}

export type ConnectionStatus =
  | "idle"
  | "unsupported"   // no navigator.bluetooth
  | "requesting"    // device picker open
  | "connecting"
  | "connected"     // streaming RR
  | "no-rr"         // connected, HR present, but flags bit 4 never set
  | "disconnected"
  | "error";

export interface ConnectionState {
  status: ConnectionStatus;
  deviceName?: string;
  message?: string;     // for error / no-rr explanatory text
}

export type SourceMode = "ble" | "simulator";

export type CoherenceZone = "scattered" | "building" | "coherent";

export interface CoherenceResult {
  ready: boolean;       // full 64 s window available
  progress: number;     // 0..1 while collecting
  score: number;        // 0..100, EMA-smoothed (display value)
  raw: number;          // 0..100, this tick's unsmoothed ratio*100
  peakFreqHz: number;   // 0 when not ready
  zone: CoherenceZone;
}

export interface ZoneThresholds {
  building: number;   // score >= building && < coherent  → "building"
  coherent: number;   // score >= coherent                → "coherent"
}                      // score < building                 → "scattered"

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
  id: string;            // crypto.randomUUID()
  startedAt: number;     // epoch ms
  durationS: number;
  pace: number;          // breaths/min
  avgCoherence: number;
  peakCoherence: number;
  coherenceTrace: number[];   // one value per second
  hrTrace: number[];          // HR waveform decimated to ~1 point/s
}

export interface Settings {
  pace: number;                       // breaths/min
  zoneThresholds: ZoneThresholds;
  resonanceIntervalS: number;
  reducedMotionOverride: boolean | null;  // null = follow system
}
```

## Constants (`lib/constants.ts`)

```ts
import type { ZoneThresholds, Settings } from "@/types";

export const FS = 4;                 // Hz resample grid
export const N = 256;                // FFT length
export const WINDOW_S = N / FS;      // 64 s
export const BEAT_BUFFER_S = 130;    // prune older beats

export const PEAK_BAND = { lo: 0.04, hi: 0.26 } as const;   // peak search
export const TOTAL_BAND = { lo: 0.04, hi: 0.4 } as const;   // total power
export const PEAK_HALF_WIDTH_HZ = 0.015;                    // ± around peak
export const EMA_ALPHA = 0.2;                               // display = 0.8*prev + 0.2*new

export const DEFAULT_ZONE_THRESHOLDS: ZoneThresholds = { building: 40, coherent: 65 };

export const PACE = { min: 4.5, max: 7, step: 0.5, default: 6 } as const;

export const RESONANCE_INTERVAL_S = 120;     // hold per pace
export const RESONANCE_SETTLE_S = 20;        // ignore first N s of each step when averaging

// Web Bluetooth GATT
export const HR_SERVICE = "heart_rate";              // 0x180D
export const HR_MEASUREMENT = "heart_rate_measurement"; // 0x2A37

export const DEFAULT_SETTINGS: Settings = {
  pace: PACE.default,
  zoneThresholds: DEFAULT_ZONE_THRESHOLDS,
  resonanceIntervalS: RESONANCE_INTERVAL_S,
  reducedMotionOverride: null,
};

export const SETTINGS_KEY = "coherence.settings.v1";
```

---

# Phase 0 — Scaffold

### Task 0.1: Scaffold the Next.js app

**Files:** whole project (generated).

- [ ] **Step 1: Activate pnpm via corepack**

```bash
corepack prepare pnpm@latest --activate
pnpm --version    # expect e.g. 9.x or 10.x
```

- [ ] **Step 2: Scaffold into the current (empty) dir**

```bash
cd /home/user/projects/coherence
pnpm dlx create-next-app@latest . \
  --ts --app --eslint --tailwind --no-src-dir \
  --import-alias "@/*" --turbopack --use-pnpm
```

Expected: `app/`, `package.json`, `tsconfig.json`, `tailwind` config present. Answer "no" to any extra prompt the flags don't cover.

- [ ] **Step 3: Confirm strict mode**

Verify `tsconfig.json` has `"strict": true`. Add `"noUncheckedIndexedAccess": true` (forces us to handle `array[i]` possibly-undefined — valuable for the buffer/FFT code).

- [ ] **Step 4: Add deps + test tooling**

```bash
pnpm add zustand idb
pnpm add -D vitest @vitest/coverage-v8 jsdom
```

- [ ] **Step 5: Add `vitest.config.ts`**

```ts
import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  test: { environment: "node", include: ["lib/**/*.test.ts"] },
  resolve: { alias: { "@": path.resolve(__dirname, ".") } },
});
```

- [ ] **Step 6: Add scripts to `package.json`**

```json
"scripts": {
  "dev": "next dev --turbopack",
  "build": "next build",
  "start": "next start",
  "lint": "next lint",
  "typecheck": "tsc --noEmit",
  "test": "vitest run",
  "test:watch": "vitest"
}
```

- [ ] **Step 7: Verify clean baseline**

```bash
pnpm typecheck && pnpm lint && pnpm build
```

Expected: all pass. Commit: `chore: scaffold next.js app with vitest`.

### Task 0.2: Types + constants

- [ ] Create `types/index.ts` (full content above) and `lib/constants.ts` (full content above).
- [ ] `pnpm typecheck` → PASS. Commit: `chore: add shared types and constants`.

---

# Phase 1 — `lib/` (pure math, full TDD)

This is the load-bearing layer. Every module is pure (no DOM, no React) and fully tested.

### Task 1.1: FFT (`lib/fft.ts`)

**Files:** Create `lib/fft.ts`, `lib/__tests__/fft.test.ts`.

- [ ] **Step 1: Write failing tests**

```ts
import { describe, it, expect } from "vitest";
import { fft } from "@/lib/fft";

describe("fft", () => {
  it("DC input puts all energy in bin 0", () => {
    const n = 8;
    const re = new Float64Array(n).fill(1);
    const im = new Float64Array(n);
    fft(re, im);
    expect(re[0]).toBeCloseTo(8, 6);
    expect(im[0]).toBeCloseTo(0, 6);
    for (let k = 1; k < n; k++) {
      expect(Math.hypot(re[k]!, im[k]!)).toBeCloseTo(0, 6);
    }
  });

  it("pure cosine at bin m concentrates power at k=m and k=n-m", () => {
    const n = 16, m = 3;
    const re = new Float64Array(n);
    const im = new Float64Array(n);
    for (let i = 0; i < n; i++) re[i] = Math.cos((2 * Math.PI * m * i) / n);
    fft(re, im);
    const power = Array.from({ length: n }, (_, k) => re[k]! ** 2 + im[k]! ** 2);
    const peak = power.indexOf(Math.max(...power));
    expect([m, n - m]).toContain(peak);
  });
});
```

- [ ] **Step 2: Run → FAIL** (`fft is not a function`). `pnpm test`.
- [ ] **Step 3: Implement `lib/fft.ts`** — paste the spec's reference implementation verbatim (it is correct and load-bearing). Add a JSDoc note: in-place, `re.length` must be a power of two.
- [ ] **Step 4: Run → PASS.**
- [ ] **Step 5: Commit** `feat: hand-rolled radix-2 fft with tests`.

### Task 1.2: Resampler (`lib/resample.ts`)

Resample the IBI tachogram (`ibi` vs beat time `t`) onto an even `1000/FS` ms grid of `N` points starting at `startMs`, via linear interpolation between bracketing beats; clamp to the nearest beat outside the beat range.

**Files:** Create `lib/resample.ts`, `lib/__tests__/resample.test.ts`.

- [ ] **Step 1: Failing tests**

```ts
import { describe, it, expect } from "vitest";
import { buildGrid, resampleIBI } from "@/lib/resample";
import type { Beat } from "@/types";

const FS = 4, N = 256;

function beat(t: number, ibi: number): Beat {
  return { t, ibi, hr: 60000 / ibi };
}

describe("buildGrid", () => {
  it("produces exactly N evenly spaced timestamps at 1/FS spacing", () => {
    const g = buildGrid(1000, FS, N);
    expect(g.length).toBe(N);
    expect(g[0]).toBe(1000);
    for (let i = 1; i < N; i++) expect(g[i]! - g[i - 1]!).toBeCloseTo(250, 9);
    expect(g[N - 1]).toBeCloseTo(1000 + 255 * 250, 6);
  });
});

describe("resampleIBI", () => {
  it("returns exactly N samples", () => {
    const beats = Array.from({ length: 100 }, (_, i) => beat(i * 800, 800));
    expect(resampleIBI(beats, 0, FS, N).length).toBe(N);
  });

  it("linearly interpolates between bracketing beats", () => {
    // two beats: ibi 800 at t=0, ibi 1000 at t=1000 → midpoint t=500 → 900
    const beats = [beat(0, 800), beat(1000, 1000)];
    const out = resampleIBI(beats, 0, FS, N);
    expect(out[0]).toBeCloseTo(800, 6);          // t=0
    expect(out[2]).toBeCloseTo(900, 6);          // t=500
    expect(out[4]).toBeCloseTo(1000, 6);         // t=1000
    expect(out[10]).toBeCloseTo(1000, 6);        // beyond last → clamp
  });
});
```

- [ ] **Step 2: Run → FAIL.**
- [ ] **Step 3: Implement.**

```ts
import type { Beat } from "@/types";

export function buildGrid(startMs: number, fs: number, n: number): Float64Array {
  const step = 1000 / fs;
  const g = new Float64Array(n);
  for (let i = 0; i < n; i++) g[i] = startMs + i * step;
  return g;
}

export function resampleIBI(beats: Beat[], startMs: number, fs: number, n: number): Float64Array {
  const out = new Float64Array(n);
  const step = 1000 / fs;
  if (beats.length === 0) return out;
  let j = 0; // index of beat such that beats[j].t <= tg
  for (let i = 0; i < n; i++) {
    const tg = startMs + i * step;
    if (tg <= beats[0]!.t) { out[i] = beats[0]!.ibi; continue; }
    const last = beats[beats.length - 1]!;
    if (tg >= last.t) { out[i] = last.ibi; continue; }
    while (j < beats.length - 1 && beats[j + 1]!.t <= tg) j++;
    const a = beats[j]!, b = beats[j + 1]!;
    const frac = (tg - a.t) / (b.t - a.t);
    out[i] = a.ibi + frac * (b.ibi - a.ibi);
  }
  return out;
}
```

- [ ] **Step 4: Run → PASS.** Commit `feat: ibi resampler onto even grid`.

### Task 1.3: Zones (`lib/zones.ts`)

- [ ] **Step 1: Failing test** (`zones.test.ts`): score 30 → "scattered", 50 → "building", 80 → "coherent"; boundaries: 40 → "building", 65 → "coherent".
- [ ] **Step 2: Implement**

```ts
import type { CoherenceZone, ZoneThresholds } from "@/types";

export function zoneFor(score: number, t: ZoneThresholds): CoherenceZone {
  if (score >= t.coherent) return "coherent";
  if (score >= t.building) return "building";
  return "scattered";
}
```

- [ ] **Step 3: PASS.** Commit `feat: coherence zone classifier`.

### Task 1.4: Coherence (`lib/coherence.ts`) — the heart of the app

Pipeline per the spec: most-recent 64 s window → resample to 256 @ 4 Hz → detrend (subtract mean) → Hann → 256-pt FFT → power[0..128] → peak bin in 0.04–0.26 Hz → peak power (±0.015 Hz) → total power (0.04–0.4 Hz) → ratio → ×100 → EMA.

**Files:** Create `lib/coherence.ts`, `lib/__tests__/coherence.test.ts`.

- [ ] **Step 1: Failing tests (the spec's required assertions)**

```ts
import { describe, it, expect } from "vitest";
import { computeCoherence } from "@/lib/coherence";
import { WINDOW_S } from "@/lib/constants";
import type { Beat } from "@/types";

// Build a beat timeline whose IBI series oscillates at `freqHz`.
function sineBeats(freqHz: number, durationS: number, meanIbi = 850, amp = 60): Beat[] {
  const beats: Beat[] = [];
  let t = 0;
  while (t < durationS * 1000) {
    const ibi = meanIbi + amp * Math.sin(2 * Math.PI * freqHz * (t / 1000));
    beats.push({ t, ibi, hr: 60000 / ibi });
    t += ibi;
  }
  return beats;
}

const NOW = (WINDOW_S + 5) * 1000;

describe("computeCoherence", () => {
  it("reports progress (not ready) before the window fills", () => {
    const beats = sineBeats(0.1, 20);
    const r = computeCoherence(beats, 20_000, null);
    expect(r.ready).toBe(false);
    expect(r.progress).toBeGreaterThan(0);
    expect(r.progress).toBeLessThan(1);
  });

  it("pure 0.1 Hz IBI → HIGH coherence ratio", () => {
    const beats = sineBeats(0.1, WINDOW_S + 10);
    const r = computeCoherence(beats, NOW, null);
    expect(r.ready).toBe(true);
    expect(r.raw).toBeGreaterThan(60);          // ratio*100, dominant single peak
    expect(r.peakFreqHz).toBeGreaterThan(0.08);
    expect(r.peakFreqHz).toBeLessThan(0.12);
  });

  it("white-noise IBI → LOW coherence ratio", () => {
    // deterministic pseudo-noise (no Math.random for reproducibility)
    const beats: Beat[] = [];
    let t = 0, seed = 12345;
    for (let i = 0; i < 800; i++) {
      seed = (seed * 1103515245 + 12345) & 0x7fffffff;
      const ibi = 850 + ((seed % 200) - 100);
      beats.push({ t, ibi, hr: 60000 / ibi });
      t += ibi;
    }
    const r = computeCoherence(beats, NOW, null);
    expect(r.raw).toBeLessThan(40);
  });

  it("flat IBI → no NaN, finite score (no divide-by-zero)", () => {
    const beats: Beat[] = [];
    for (let t = 0; t < (WINDOW_S + 10) * 1000; t += 850) {
      beats.push({ t, ibi: 850, hr: 60000 / 850 });
    }
    const r = computeCoherence(beats, NOW, null);
    expect(Number.isFinite(r.raw)).toBe(true);
    expect(Number.isFinite(r.score)).toBe(true);
  });

  it("EMA: display = 0.8*prev + 0.2*new", () => {
    const beats = sineBeats(0.1, WINDOW_S + 10);
    const r = computeCoherence(beats, NOW, 0);   // prev score 0
    expect(r.score).toBeCloseTo(0.2 * r.raw, 6);
  });
});
```

- [ ] **Step 2: Run → FAIL.**
- [ ] **Step 3: Implement `lib/coherence.ts`**

```ts
import { fft } from "@/lib/fft";
import { resampleIBI } from "@/lib/resample";
import { zoneFor } from "@/lib/zones";
import {
  FS, N, WINDOW_S, PEAK_BAND, TOTAL_BAND, PEAK_HALF_WIDTH_HZ, EMA_ALPHA,
  DEFAULT_ZONE_THRESHOLDS,
} from "@/lib/constants";
import type { Beat, CoherenceResult, ZoneThresholds } from "@/types";

const WINDOW_MS = WINDOW_S * 1000;
const BIN_HZ = FS / N;                       // 0.015625 Hz

function emptyResult(progress: number): CoherenceResult {
  return { ready: false, progress, score: 0, raw: 0, peakFreqHz: 0, zone: "scattered" };
}

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

  // 1+2. window + resample to N @ FS
  const start = now - WINDOW_MS;
  const x = resampleIBI(beats, start, FS, N);

  // 3. detrend
  let mean = 0;
  for (let i = 0; i < N; i++) mean += x[i]!;
  mean /= N;

  // 4. Hann window
  const re = new Float64Array(N);
  const im = new Float64Array(N);
  for (let i = 0; i < N; i++) {
    const w = 0.5 * (1 - Math.cos((2 * Math.PI * i) / (N - 1)));
    re[i] = (x[i]! - mean) * w;
  }

  // 5. FFT
  fft(re, im);

  // 6. power spectrum, k = 0..N/2
  const half = N / 2;
  const power = new Float64Array(half + 1);
  for (let k = 0; k <= half; k++) power[k] = re[k]! ** 2 + im[k]! ** 2;
  const freq = (k: number) => k * BIN_HZ;

  // 7. peak bin within PEAK_BAND
  let peakK = -1, peakVal = -1;
  for (let k = 0; k <= half; k++) {
    const f = freq(k);
    if (f < PEAK_BAND.lo || f > PEAK_BAND.hi) continue;
    if (power[k]! > peakVal) { peakVal = power[k]!; peakK = k; }
  }
  if (peakK < 0) return { ready: true, progress: 1, score: prevScore ?? 0, raw: 0, peakFreqHz: 0, zone: "scattered" };
  const peakF = freq(peakK);

  // 8. peak power: bins within ±PEAK_HALF_WIDTH_HZ of peak freq
  let peakPower = 0;
  for (let k = 0; k <= half; k++) {
    if (Math.abs(freq(k) - peakF) <= PEAK_HALF_WIDTH_HZ) peakPower += power[k]!;
  }

  // 9. total power across TOTAL_BAND
  let totalPower = 0;
  for (let k = 0; k <= half; k++) {
    const f = freq(k);
    if (f >= TOTAL_BAND.lo && f <= TOTAL_BAND.hi) totalPower += power[k]!;
  }

  // 10. ratio → 0..100 + EMA
  const raw = totalPower > 0 ? (peakPower / totalPower) * 100 : 0;
  const score = prevScore === null ? raw : (1 - EMA_ALPHA) * prevScore + EMA_ALPHA * raw;

  return { ready: true, progress: 1, score, raw, peakFreqHz: peakF, zone: zoneFor(score, thresholds) };
}
```

- [ ] **Step 4: Run → PASS** (all five). If the 0.1 Hz "high" threshold is marginal, document the measured value and tune the assertion to a defensible number (it should be comfortably > 60 with a single dominant peak under Hann; do not weaken below a real signal/noise separation).
- [ ] **Step 5: Commit** `feat: HeartMath-style spectral coherence metric with tests`.

### Task 1.5: BLE 0x2A37 parser (`lib/ble.ts` — pure parse fn)

Split `ble.ts` into a **pure** `parseHeartRate(view: DataView): HeartRatePacket` (unit-tested) and the transport class (Phase 3, not unit-tested — needs a real device).

**Files:** Create `lib/ble.ts` (parser portion), `lib/__tests__/ble.test.ts`.

- [ ] **Step 1: Failing tests covering every branch**

```ts
import { describe, it, expect } from "vitest";
import { parseHeartRate } from "@/lib/ble";

function view(bytes: number[]): DataView {
  return new DataView(new Uint8Array(bytes).buffer);
}
// RR raw is uint16 LE in 1/1024 s. 1024 → 1000 ms. LE bytes of 1024 = [0x00, 0x04].
const RR_1024_LE = [0x00, 0x04];

describe("parseHeartRate", () => {
  it("uint8 HR, no RR (flags=0x00)", () => {
    const p = parseHeartRate(view([0x00, 70]));
    expect(p.hr).toBe(70);
    expect(p.hasRR).toBe(false);
    expect(p.rr).toEqual([]);
  });

  it("uint16 HR (flags bit0=1)", () => {
    // flags 0x01, HR=300 → LE [0x2C, 0x01]
    const p = parseHeartRate(view([0x01, 0x2c, 0x01]));
    expect(p.hr).toBe(300);
    expect(p.hasRR).toBe(false);
  });

  it("single RR present (flags bit4=1) converts 1/1024 s → ms", () => {
    const p = parseHeartRate(view([0x10, 70, ...RR_1024_LE]));
    expect(p.hasRR).toBe(true);
    expect(p.rr).toHaveLength(1);
    expect(p.rr[0]).toBeCloseTo(1000, 6);
  });

  it("multiple RR intervals in one packet", () => {
    const p = parseHeartRate(view([0x10, 70, ...RR_1024_LE, 0x00, 0x02])); // second = 512 → 500ms
    expect(p.rr).toHaveLength(2);
    expect(p.rr[0]).toBeCloseTo(1000, 6);
    expect(p.rr[1]).toBeCloseTo(500, 6);
  });

  it("energy-expended present (bit3) is skipped before RR", () => {
    // flags 0x18 = bit3 + bit4; uint8 HR; 2 bytes EE; then RR
    const p = parseHeartRate(view([0x18, 70, 0xaa, 0xbb, ...RR_1024_LE]));
    expect(p.energyExpended).toBe(0xbbaa);
    expect(p.rr).toHaveLength(1);
    expect(p.rr[0]).toBeCloseTo(1000, 6);
  });

  it("uint16 HR + EE + multiple RR all together", () => {
    // flags 0x19 = bit0+bit3+bit4
    const p = parseHeartRate(view([0x19, 0x48, 0x00, 0xaa, 0xbb, ...RR_1024_LE, 0x00, 0x02]));
    expect(p.hr).toBe(0x48);
    expect(p.energyExpended).toBe(0xbbaa);
    expect(p.rr).toHaveLength(2);
  });
});
```

- [ ] **Step 2: Run → FAIL.**
- [ ] **Step 3: Implement the parser**

```ts
import type { HeartRatePacket } from "@/types";

const RR_UNIT_MS = 1000 / 1024;

export function parseHeartRate(view: DataView): HeartRatePacket {
  const flags = view.getUint8(0);
  const hr16 = (flags & 0x01) !== 0;
  const hasEE = (flags & 0x08) !== 0;
  const hasRR = (flags & 0x10) !== 0;

  let offset = 1;
  let hr: number;
  if (hr16) { hr = view.getUint16(offset, true); offset += 2; }
  else { hr = view.getUint8(offset); offset += 1; }

  let energyExpended: number | undefined;
  if (hasEE) { energyExpended = view.getUint16(offset, true); offset += 2; }

  const rr: number[] = [];
  if (hasRR) {
    for (; offset + 1 < view.byteLength; offset += 2) {
      rr.push(view.getUint16(offset, true) * RR_UNIT_MS);
    }
  }
  return { hr, rr, hasRR, energyExpended };
}
```

- [ ] **Step 4: Run → PASS.** Commit `feat: 0x2A37 heart-rate-measurement parser with tests`.

### Phase 1 gate

```bash
pnpm test && pnpm typecheck
```

Expected: all lib tests green, no type errors. This satisfies DoD items 8 (test suite incl. synthetic-signal coherence assertions).

---

# Phase 2 — Buffer, sources, store, persistence

### Task 2.1: Beat buffer singleton (`lib/beatBuffer.ts`)

A module singleton holding `Beat[]`, the cumulative-timeline seeding, RR→beat conversion, pruning to `BEAT_BUFFER_S`, and a subscribe mechanism the canvas/coherence loop read. **Not** in React state.

```ts
import { BEAT_BUFFER_S } from "@/lib/constants";
import type { Beat } from "@/types";

let beats: Beat[] = [];
let lastT: number | null = null;          // cumulative timeline cursor (ms)
const listeners = new Set<() => void>();

/** Seed/append RR intervals (ms). First-ever beat seeds the timeline from `nowPerf`. */
export function pushRR(rrMs: number[], nowPerf: number): void {
  for (const ibi of rrMs) {
    if (lastT === null) lastT = nowPerf;
    else lastT += ibi;
    beats.push({ t: lastT, ibi, hr: 60000 / ibi });
  }
  const cutoff = (lastT ?? 0) - BEAT_BUFFER_S * 1000;
  if (beats.length && beats[0]!.t < cutoff) beats = beats.filter((b) => b.t >= cutoff);
  listeners.forEach((l) => l());
}

export function getBeats(): Beat[] { return beats; }
export function nowOnTimeline(): number { return lastT ?? 0; }
export function reset(): void { beats = []; lastT = null; listeners.forEach((l) => l()); }
export function subscribe(fn: () => void): () => void { listeners.add(fn); return () => listeners.delete(fn); }
```

- [ ] Add a small test: pushing `[800, 800]` twice yields 4 beats with cumulative `t` (seed, +800, +800, +800) and prunes beyond `BEAT_BUFFER_S`. Commit `feat: module-singleton beat buffer`.

> **Note on `now` for coherence:** the coherence loop uses `nowOnTimeline()` as `now` so it stays on the same cumulative clock the buffer builds from (real-strap `performance.now()` jitter never enters the metric).

### Task 2.2: Beat sources (`lib/source.ts`)

```ts
export interface BeatSource {
  readonly mode: SourceMode;
  start(): Promise<void>;
  stop(): void;
}
```

- [ ] **`SimulatedSource`** — a first-class peer. On `start`, runs a `setInterval` (or self-scheduling timeout) that, every ~beat, computes the next IBI from a ~0.1 Hz sine (`ibi = 850 + 60*sin(2π*0.1*t)`), and calls `pushRR([ibi], performance.now())`. Schedules the next tick `ibi` ms later so beat cadence is realistic. Optionally add light noise so coherence isn't a perfect 100.
- [ ] **`BleHeartRateSource`** — Phase 3 (transport). Stub the class here with `start()` throwing "not implemented" so the store/hook can compile; flesh out in Task 3.1. (This keeps Phase 2 buildable.)
- [ ] Commit `feat: BeatSource interface + simulator`.

### Task 2.3: Zustand store (`lib/store.ts`)

Holds **only throttled/derived** values — never the raw beat array.

```ts
interface TrainerState {
  mode: SourceMode | null;
  connection: ConnectionState;
  hr: number | null;            // ~1 Hz
  coherence: CoherenceResult;   // ~1 Hz
  pace: number;                 // breaths/min
  isPacing: boolean;
  // actions
  setConnection(c: ConnectionState): void;
  setHr(hr: number): void;
  setCoherence(c: CoherenceResult): void;
  setPace(p: number): void;
  // ...
}
```

- [ ] Implement with `create<TrainerState>()`. Pacer phase does **not** live here (rAF-driven; lives in the hook/component local ref to avoid 60 Hz store writes). Commit `feat: zustand trainer store`.

### Task 2.4: Settings persistence (`lib/settings.ts`)

- [ ] `loadSettings(): Settings` (merge `DEFAULT_SETTINGS` with parsed `localStorage[SETTINGS_KEY]`, guarded by `typeof window`), `saveSettings(s: Settings): void`. Validates pace within range. Commit `feat: localStorage settings`.

### Task 2.5: IndexedDB session store (`lib/db.ts`)

Using `idb`. Store `sessions` keyed by `id`.

```ts
// openDB('coherence', 1) with objectStore 'sessions' { keyPath: 'id' }, index 'by-startedAt'
export async function saveSession(s: SessionRecord): Promise<void>;
export async function listSessions(): Promise<SessionRecord[]>;  // newest first
export async function getSession(id: string): Promise<SessionRecord | undefined>;
export async function deleteSession(id: string): Promise<void>;
```

- [ ] Guard `typeof indexedDB !== "undefined"`. Commit `feat: idb session store`.

### Task 2.6: Export (`lib/export.ts`)

- [ ] `sessionToJSON(s)` and `sessionToCSV(s)` (CSV: a header + one row per second with `second, coherence, hr`). `downloadBlob(name, mime, text)` helper using `URL.createObjectURL` (guard window). Commit `feat: session JSON/CSV export`.

---

# Phase 3 — Hooks (bridge sources/metrics → store)

### Task 3.1: Finish `BleHeartRateSource` + `useHeartRateSensor`

**`lib/source.ts` (BLE transport):**
- Feature-detect `navigator.bluetooth`; if absent → caller sets `ConnectionState{status:"unsupported"}`.
- `requestDevice({ filters: [{ services: [HR_SERVICE] }] })`; treat the picker-cancel rejection (`NotFoundError` / `AbortError`) as a normal no-op, not an error.
- `gatt.connect()` → `getPrimaryService(HR_SERVICE)` → `getCharacteristic(HR_MEASUREMENT)` → `startNotifications()`.
- `characteristicvaluechanged`: `parseHeartRate(event.target.value)`. Track an "ever saw RR" flag; if after a grace period (e.g. 5 s / N packets) `hasRR` was never true → emit `no-rr` state with message **"This strap isn't sending beat-to-beat data."** When RR present → `pushRR(rr, performance.now())` and report HR.
- Listen for `gattserverdisconnected` → emit `disconnected`.
- `stop()`: remove the `characteristicvaluechanged` listener, `stopNotifications()` (best-effort), `gatt.disconnect()`.

**`hooks/useHeartRateSensor.ts`:**
- Owns the active `BeatSource` in a ref. Exposes `connect()`, `connectSimulator()`, `disconnect()`, and the current `ConnectionState` (from store).
- On `connect`: set `requesting` → `connecting` → `connected`/`no-rr`/`error`. On unmount: `disconnect()` (teardown).
- HR throttling: source reports every beat, but the hook only pushes HR to the store ~1 Hz (timestamp gate).

- [ ] Manual acceptance (real strap or simulator), since this can't be unit-tested. Commit `feat: web bluetooth transport + sensor hook`.

### Task 3.2: `useCoherence` (1 Hz loop)

- [ ] `setInterval(1000)` while connected: `computeCoherence(getBeats(), nowOnTimeline(), prevScore, thresholds)` → `store.setCoherence(...)`. Keep `prevScore` in a ref for the EMA. Clear interval on disconnect/unmount. Commit `feat: 1Hz coherence loop hook`.

### Task 3.3: `useBreathPacer` (rAF, clock-driven)

- [ ] rAF loop computing `phase = (performance.now() % periodMs) / periodMs`, `scale = 0.5 - 0.5*cos(2π*phase)`, `inhaling = phase < 0.5`. Writes to a **ref** (and exposes via `useSyncExternalStore` or a `useState` updated at a capped rate for the label only). The orb reads `scale` from the ref each frame; React state only flips the "breathe in/out" label (twice per breath). `periodMs = 60000 / pace`. Honors reduced motion (caller decides whether to animate). Commit `feat: clock-driven breath pacer hook`.

> **Drift check (DoD #4):** because phase derives from absolute `performance.now() % period`, there is zero accumulated drift over 10 min — verify by logging phase at t and t+600 s and confirming continuity.

### Task 3.4: `useReducedMotion`

- [ ] Reads `matchMedia('(prefers-reduced-motion: reduce)')` + `settings.reducedMotionOverride`. SSR-safe (returns `false` server-side, syncs on mount). Commit `feat: reduced-motion hook`.

### Task 3.5: `useSession`

- [ ] `startSession(pace)`, `stopSession()`. While active, samples coherence (1 Hz) and HR into arrays; on stop computes `avgCoherence`/`peakCoherence`, decimates traces (~1 pt/s, cap length), builds `SessionRecord` with `crypto.randomUUID()`, `saveSession()`. Commit `feat: session recorder hook`.

---

# Phase 4 — UI components

> These tasks are specified by **component contract + key logic + acceptance criteria** rather than full pre-written JSX, because (a) the volume is large and (b) you explicitly asked to review the plan *before* I write the components. Each ships behind `next/dynamic({ ssr:false })` at the page level so nothing here runs during prerender. Dark theme by default; sentence case; calm copy.

### Task 4.0: App shell (`app/layout.tsx`, `app/page.tsx`, `app/globals.css`)

- [ ] `layout.tsx`: html/body, dark theme via CSS vars, metadata, persistent footer: **"Everything runs on your device. No data is sent anywhere."**
- [ ] `page.tsx`: `const Trainer = dynamic(() => import("@/components/Trainer"), { ssr: false })`. Render `<Trainer/>`.
- [ ] `globals.css`: theme tokens (`--bg`, `--fg`, `--zone-scattered/-building/-coherent`), orb keyframes (used only when motion allowed).
- [ ] Acceptance: `pnpm build` prerenders `/` with **no** reference to `navigator`/`window` at module scope. Commit `feat: app shell + privacy footer`.

### Task 4.1: `ConnectionButton`
- Contract: shows state-appropriate label/action — `idle`→"Connect strap" + "Simulate", `requesting/connecting`→spinner, `connected`→device name + "Disconnect", `no-rr`→the friendly RR error + "Try another strap", `unsupported`→"Web Bluetooth needs Chrome or Edge over https/localhost", `error`→message + retry, `disconnected`→"Reconnect".
- A11y: real `<button>`s, visible focus ring, `aria-live="polite"` on the status text.
- Acceptance: every `ConnectionStatus` renders a distinct, actionable state (exhaustive `switch`). Commit.

### Task 4.2: `BreathOrb` (hero)
- Contract: reads pacer `scale` (0..1) from the hook's ref each rAF frame; maps to CSS `transform: scale(...)` (range ~0.6–1.0). Color = current zone token. Center label flips "breathe in"/"breathe out".
- Reduced motion: render a **non-animated** in/out indicator (text + static ring that swaps state on phase crossing, no continuous scaling).
- A11y: `role="img"` + `aria-label` describing current phase; the live score lives in the gauge, not here.
- Acceptance: paces correctly at 4.5–7 bpm; no drift over 10 min (DoD #4). Commit.

### Task 4.3: `CoherenceGauge`
- Contract: big 0–100 number. Before `ready`: show "collecting… {Math.round(progress*100)}%" (DoD #2 progress state). `aria-live="polite"` region announcing score changes (throttled).
- Acceptance: shows collecting state until 64 s filled, then the smoothed score. Commit.

### Task 4.4: `ZoneBar`
- Contract: three labeled segments (scattered/building/coherent) with the active one highlighted; thresholds come from settings (editable). Commit.

### Task 4.5: `LiveWaveform` (`<canvas>`)
- Contract: own rAF loop; reads `getBeats()` directly (subscribes to `beatBuffer`), draws the last ~30 s of HR as a scrolling trace. DPR-aware sizing. **This is the only thing that runs at frame rate.**
- A11y: `role="img"` + `aria-label="live heart-rate waveform"`; `<canvas>` gets a text fallback.
- Acceptance: scrolls smoothly with simulator; no React re-renders per frame (verify with a render counter). Commit.

### Task 4.6: `SessionControls`
- Contract: pace slider (4.5–7, step 0.5, default 6), start/stop session, simulate toggle. Keyboard-operable, labeled. Persists pace to settings. Commit.

### Task 4.7: `ResonanceFinder` (headline feature)
- Contract: a guided mode that sweeps paces 4.5→7 (0.5 steps), holding each `resonanceIntervalS` (default 120 s). Ignores the first `RESONANCE_SETTLE_S` of each step, averages coherence over the rest, advances automatically. Shows current pace, countdown, and a running per-pace bar comparison. On completion: `ResonanceResult` with `bestPaceBpm` highlighted + "your resonant pace is N breaths/min" and an offer to set it as the default pace.
- A11y: announces pace changes via live region.
- Acceptance: runs end to end (use simulator to verify quickly), reports a best pace (DoD #5). Commit.

### Task 4.8: `Trainer` (compose)
- Contract: wires hooks + lays out orb (hero, center), gauge, zone bar, waveform, controls, resonance entry, and a link to history. Single calm screen, responsive to mobile width. Commit.

### Task 4.9: `SessionHistory` + `Sparkline` + `app/history/page.tsx`
- Contract: lists sessions (newest first) with a `Sparkline` of the coherence trace, date, duration, avg/peak. Click → detail with full canvas trace; delete; export JSON/CSV (DoD #6). `history/page.tsx` is `dynamic({ssr:false})`.
- Acceptance: sessions survive reload; export downloads valid JSON and CSV. Commit.

---

# Phase 5 — Wire-up, polish, docs

### Task 5.1: End-to-end with simulator (DoD #7)
- [ ] Toggle simulate → orb paces, waveform scrolls, gauge fills to a high score (~0.1 Hz signal), resonance finder completes, a session saves & reloads. Fix anything broken.

### Task 5.2: A11y + reduced-motion pass
- [ ] Keyboard-traverse all controls (visible focus), verify live regions announce, toggle `prefers-reduced-motion` and confirm the orb swaps to the static indicator.

### Task 5.3: README (DoD #9)
- [ ] Cover: run instructions (`corepack` → `pnpm install` → `pnpm dev`; **Web Bluetooth needs Chrome/Edge over `localhost` or HTTPS — not Firefox/Safari**; WSL note: open `http://localhost:3000` in Windows Chrome); the coherence algorithm in a paragraph; the zone thresholds + how to tune them (constants + settings); RR-capable strap brands (**Polar, CooSpo, Magene, Wahoo Tickr**); the decisions list above; privacy statement.

### Task 5.4: Final gate (DoD #1, #8)
```bash
pnpm typecheck && pnpm lint && pnpm test && pnpm build
```
Expected: all clean; build prerenders without browser APIs. Commit `docs: README + final polish`.

---

## Stretch (only after all DoD met)
PWA (manifest + service worker, offline), Web Audio inhale/exhale chimes, multi-session trend chart (canvas/SVG), LF/HF/VLF breakdown panel. Each its own task + commit.

---

## Self-review against the spec

- **BLE parse (all branches):** Task 1.5 — uint8/uint16 HR, EE skip, single/multiple/zero RR, 1/1024→ms. ✅ no-RR *flag* handled in transport (Task 3.1) → friendly error. ✅
- **Coherence pipeline (10 steps):** Task 1.4 maps step-for-step; 0.1 Hz→high, noise→low, flat→no-NaN, resampler 256 even samples (Task 1.2). ✅ EMA 0.8/0.2. ✅
- **FFT verbatim:** Task 1.1. ✅
- **Pacer clock-driven, no drift, 4.5–7:** Task 3.3 + 4.2, drift note. ✅
- **Resonance finder:** Task 4.7. ✅
- **Persistence (IDB sessions + downsampled trace + delete/export; localStorage settings):** Tasks 2.4–2.6, 4.9. ✅
- **No-React-state for beats / throttled updates / canvas-only rAF:** Tasks 2.1, 2.3, 3.x, 4.5. ✅
- **SSR safety / dynamic ssr:false / feature detection:** Tasks 4.0, 4.1, 3.1. ✅
- **Simulate mode first-class:** Task 2.2 + 4.6. ✅
- **A11y + reduced motion + responsive:** Tasks 4.2, 5.2. ✅
- **Tests (Vitest, parser + synthetic coherence):** Phase 1. ✅
- **README content:** Task 5.3. ✅
- **TS strict / no any / exhaustive switch / tsc+eslint clean:** enforced in 0.1 + gates. ✅

**Granularity note:** Phases 0–3 are written as full TDD steps with complete code (the easy-to-get-subtly-wrong layers). Phase 4 (UI) is specified by contract + acceptance criteria rather than full JSX — deliberate, because you asked to review the plan before the components are written and a skilled dev reviews UI at the component boundary, not line-by-line in a plan. If you'd rather I expand any UI task into full pre-written code, say which.
```
