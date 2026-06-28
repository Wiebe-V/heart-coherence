import { describe, it, expect } from "vitest";
import {
  BACKUP_FORMAT,
  BACKUP_VERSION,
  buildBackup,
  serializeBackup,
  parseBackup,
} from "@/lib/backup";
import { DEFAULT_SETTINGS } from "@/lib/constants";
import type { SessionRecord, Settings } from "@/types";

const session = (over: Partial<SessionRecord> = {}): SessionRecord => ({
  id: "s1",
  startedAt: 1700000000000,
  durationS: 60,
  pace: 6,
  avgCoherence: 72.3,
  peakCoherence: 85.1,
  coherenceTrace: [70.1, 72.5, 74.0],
  hrTrace: [62, 63, 64],
  achievement: 18,
  ...over,
});

const settings: Settings = {
  ...DEFAULT_SETTINGS,
  pace: 5.5,
  achievementGoal: 250,
  theme: "dark",
};

describe("buildBackup", () => {
  it("wraps settings and sessions in a versioned envelope", () => {
    const sessions = [session()];
    const b = buildBackup(settings, sessions, 1700000000999);
    expect(b.format).toBe(BACKUP_FORMAT);
    expect(b.version).toBe(BACKUP_VERSION);
    expect(b.exportedAt).toBe(1700000000999);
    expect(b.settings).toEqual(settings);
    expect(b.sessions).toEqual(sessions);
  });
});

describe("serializeBackup / parseBackup round-trip", () => {
  it("round-trips settings and sessions", () => {
    const sessions = [session({ id: "a" }), session({ id: "b", pace: 7 })];
    const text = serializeBackup(buildBackup(settings, sessions, 123));
    const result = parseBackup(text);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.settings).toEqual(settings);
    expect(result.sessions).toEqual(sessions);
    expect(result.skipped).toBe(0);
  });

  it("is pretty-printed", () => {
    const text = serializeBackup(buildBackup(settings, [], 1));
    expect(text).toContain("\n");
  });
});

describe("parseBackup validation", () => {
  it("rejects invalid JSON", () => {
    const result = parseBackup("{not json");
    expect(result.ok).toBe(false);
  });

  it("rejects a file missing the format marker", () => {
    const text = JSON.stringify({ version: 1, settings, sessions: [] });
    const result = parseBackup(text);
    expect(result.ok).toBe(false);
  });

  it("rejects a wrong format marker", () => {
    const text = JSON.stringify({ format: "something-else", version: 1, settings, sessions: [] });
    expect(parseBackup(text).ok).toBe(false);
  });

  it("rejects a version newer than supported", () => {
    const text = JSON.stringify({
      format: BACKUP_FORMAT,
      version: BACKUP_VERSION + 1,
      settings,
      sessions: [],
    });
    expect(parseBackup(text).ok).toBe(false);
  });
});

describe("parseBackup session validation", () => {
  it("drops malformed sessions and counts them in skipped", () => {
    const text = JSON.stringify({
      format: BACKUP_FORMAT,
      version: BACKUP_VERSION,
      settings,
      sessions: [
        session({ id: "good" }),
        { id: "bad-no-numbers" }, // missing required numeric fields
        { startedAt: 1, durationS: 1 }, // missing id
        session({ id: "good2" }),
      ],
    });
    const result = parseBackup(text);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.sessions.map((s) => s.id)).toEqual(["good", "good2"]);
    expect(result.skipped).toBe(2);
  });

  it("defaults a missing achievement to 0", () => {
    const { achievement, ...noAchievement } = session({ id: "x" });
    void achievement;
    const text = JSON.stringify({
      format: BACKUP_FORMAT,
      version: BACKUP_VERSION,
      settings,
      sessions: [noAchievement],
    });
    const result = parseBackup(text);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.sessions[0]?.achievement).toBe(0);
  });

  it("rejects sessions whose traces are not arrays of numbers", () => {
    const text = JSON.stringify({
      format: BACKUP_FORMAT,
      version: BACKUP_VERSION,
      settings,
      sessions: [session({ id: "x", coherenceTrace: ["a", "b"] as unknown as number[] })],
    });
    const result = parseBackup(text);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.sessions).toEqual([]);
    expect(result.skipped).toBe(1);
  });

  it("treats a missing sessions array as empty", () => {
    const text = JSON.stringify({ format: BACKUP_FORMAT, version: BACKUP_VERSION, settings });
    const result = parseBackup(text);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.sessions).toEqual([]);
  });
});

describe("parseBackup settings sanitisation", () => {
  it("fills defaults from a partial settings object", () => {
    const text = JSON.stringify({
      format: BACKUP_FORMAT,
      version: BACKUP_VERSION,
      settings: { theme: "light" },
      sessions: [],
    });
    const result = parseBackup(text);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.settings.theme).toBe("light");
    expect(result.settings.pace).toBe(DEFAULT_SETTINGS.pace);
  });

  it("uses all defaults when settings is missing entirely", () => {
    const text = JSON.stringify({ format: BACKUP_FORMAT, version: BACKUP_VERSION, sessions: [] });
    const result = parseBackup(text);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.settings).toEqual(DEFAULT_SETTINGS);
  });
});
