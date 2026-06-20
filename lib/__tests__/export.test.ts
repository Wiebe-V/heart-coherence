import { describe, it, expect } from "vitest";
import { sessionToJSON, sessionToCSV } from "@/lib/export";
import type { SessionRecord } from "@/types";

const baseSession: SessionRecord = {
  id: "test-id-1",
  startedAt: 1700000000000,
  durationS: 5,
  pace: 6,
  avgCoherence: 72.3,
  peakCoherence: 85.1,
  coherenceTrace: [70.1, 72.5, 74.0, 75.3, 76.2],
  hrTrace: [62, 63, 64],
  achievement: 18,
};

describe("sessionToJSON", () => {
  it("round-trips via JSON.parse", () => {
    const json = sessionToJSON(baseSession);
    const parsed = JSON.parse(json) as SessionRecord;
    expect(parsed).toEqual(baseSession);
  });

  it("is pretty-printed (contains newlines)", () => {
    const json = sessionToJSON(baseSession);
    expect(json).toContain("\n");
  });
});

describe("sessionToCSV", () => {
  it("first line is 'second,coherence,hr'", () => {
    const csv = sessionToCSV(baseSession);
    const lines = csv.split("\n");
    expect(lines[0]).toBe("second,coherence,hr");
  });

  it("has 1 + max(coherenceTrace.length, hrTrace.length) lines", () => {
    const csv = sessionToCSV(baseSession);
    const lines = csv.split("\n");
    const maxLen = Math.max(
      baseSession.coherenceTrace.length,
      baseSession.hrTrace.length,
    );
    expect(lines.length).toBe(1 + maxLen);
  });

  it("rows with missing hr render empty trailing field", () => {
    // coherenceTrace is longer (5) than hrTrace (3), so rows 3 and 4 have no hr
    const csv = sessionToCSV(baseSession);
    const lines = csv.split("\n");
    // row index 4 (0-based second=3): coherence present, hr missing
    const row3 = lines[4]; // "3,<coherence>,"
    expect(row3).toBeDefined();
    expect(row3).toMatch(/^3,[\d.]+,$/);
  });

  it("rows with both values have numeric hr", () => {
    const csv = sessionToCSV(baseSession);
    const lines = csv.split("\n");
    // row index 1 (second=0): both present
    const row0 = lines[1];
    expect(row0).toBeDefined();
    expect(row0).toMatch(/^0,[\d.]+,\d+$/);
  });

  it("works with equal-length traces", () => {
    const s: SessionRecord = { ...baseSession, hrTrace: [60, 61, 62, 63, 64] };
    const csv = sessionToCSV(s);
    const lines = csv.split("\n");
    expect(lines.length).toBe(1 + 5);
  });
});
