import type { SessionRecord } from "@/types";

export function sessionToJSON(s: SessionRecord): string {
  return JSON.stringify(s, null, 2);
}

export function sessionToCSV(s: SessionRecord): string {
  const len = Math.max(s.coherenceTrace.length, s.hrTrace.length);
  const rows: string[] = ["second,coherence,hr"];
  for (let i = 0; i < len; i++) {
    const cVal = s.coherenceTrace[i];
    const coherence = cVal !== undefined ? cVal.toFixed(1) : "";
    const hVal = s.hrTrace[i];
    const hr = hVal !== undefined ? Math.round(hVal).toString() : "";
    rows.push(`${i},${coherence},${hr}`);
  }
  return rows.join("\n");
}

/**
 * Trigger a browser download of text content. No-ops on SSR.
 */
export function downloadText(filename: string, mime: string, text: string): void {
  if (typeof window === "undefined") return;
  const blob = new Blob([text], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
