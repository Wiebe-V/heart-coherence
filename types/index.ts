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

export type SourceMode = "ble" | "simulator";

export type CoherenceZone = "scattered" | "building" | "coherent";

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
