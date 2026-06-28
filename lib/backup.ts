import type { SessionRecord, Settings } from "@/types";
import { mergeSettings } from "@/lib/settings";

export const BACKUP_FORMAT = "coherence-backup";
export const BACKUP_VERSION = 1;

export interface BackupFile {
  format: typeof BACKUP_FORMAT;
  version: number;
  /** epoch ms; informational */
  exportedAt: number;
  settings: Settings;
  sessions: SessionRecord[];
}

export type ParseResult =
  | { ok: true; settings: Settings; sessions: SessionRecord[]; skipped: number }
  | { ok: false; error: string };

/** Assemble the backup envelope. Pure — caller supplies the timestamp. */
export function buildBackup(
  settings: Settings,
  sessions: SessionRecord[],
  exportedAt: number,
): BackupFile {
  return { format: BACKUP_FORMAT, version: BACKUP_VERSION, exportedAt, settings, sessions };
}

export function serializeBackup(backup: BackupFile): string {
  return JSON.stringify(backup, null, 2);
}

function isNumberArray(v: unknown): v is number[] {
  return Array.isArray(v) && v.every((n) => typeof n === "number" && isFinite(n));
}

/**
 * Validate one untrusted record into a SessionRecord. Requires a string id and
 * finite numbers for the headline fields; coherenceTrace/hrTrace must be arrays
 * of finite numbers. `achievement` is optional (older records predate it) and
 * defaults to 0, matching the history UI's tolerance.
 */
function toValidSession(v: unknown): SessionRecord | null {
  if (typeof v !== "object" || v === null) return null;
  const r = v as Record<string, unknown>;
  if (typeof r.id !== "string") return null;
  const nums = [r.startedAt, r.durationS, r.pace, r.avgCoherence, r.peakCoherence];
  if (!nums.every((n) => typeof n === "number" && isFinite(n))) return null;
  if (!isNumberArray(r.coherenceTrace) || !isNumberArray(r.hrTrace)) return null;
  const achievement =
    typeof r.achievement === "number" && isFinite(r.achievement) ? r.achievement : 0;
  return {
    id: r.id,
    startedAt: r.startedAt as number,
    durationS: r.durationS as number,
    pace: r.pace as number,
    avgCoherence: r.avgCoherence as number,
    peakCoherence: r.peakCoherence as number,
    coherenceTrace: r.coherenceTrace,
    hrTrace: r.hrTrace,
    achievement,
  };
}

/**
 * Parse and validate an untrusted backup file. The only place external input is
 * trusted. Settings flow through mergeSettings (sanitised / defaulted);
 * malformed sessions are dropped and counted in `skipped`.
 */
export function parseBackup(text: string): ParseResult {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    return { ok: false, error: "Not a valid JSON file." };
  }

  if (typeof raw !== "object" || raw === null) {
    return { ok: false, error: "File is not a coherence backup." };
  }
  const obj = raw as Record<string, unknown>;

  if (obj.format !== BACKUP_FORMAT) {
    return { ok: false, error: "File is not a coherence backup." };
  }
  if (typeof obj.version !== "number" || obj.version > BACKUP_VERSION) {
    return {
      ok: false,
      error: "This backup was made by a newer version of the app and can't be imported here.",
    };
  }

  const settings = mergeSettings(
    typeof obj.settings === "object" && obj.settings !== null
      ? (obj.settings as Partial<Settings>)
      : {},
  );

  const sessions: SessionRecord[] = [];
  let skipped = 0;
  if (Array.isArray(obj.sessions)) {
    for (const entry of obj.sessions) {
      const valid = toValidSession(entry);
      if (valid) sessions.push(valid);
      else skipped++;
    }
  }

  return { ok: true, settings, sessions, skipped };
}
