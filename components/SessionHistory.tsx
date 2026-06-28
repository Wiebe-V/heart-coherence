"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import type { SessionRecord } from "@/types";
import { listSessions, deleteSession } from "@/lib/db";
import { sessionToJSON, sessionToCSV, downloadText } from "@/lib/export";
import Sparkline from "@/components/Sparkline";
import InfoBubble from "@/components/InfoBubble";
import { INFO } from "@/lib/infoText";

type Status = "loading" | "ready";

/** mm:ss from a whole-second duration. */
function formatDuration(durationS: number): string {
  const mm = Math.floor(durationS / 60);
  const ss = Math.round(durationS % 60);
  return `${mm}:${ss.toString().padStart(2, "0")}`;
}

/**
 * Lists past training sessions newest-first, each as a quiet row with a
 * coherence sparkline and its headline numbers. Selecting a row expands an
 * inline detail panel with a larger trace and export / delete actions. All
 * idb access is client-only; the parent route loads this via dynamic ssr:false,
 * and formatting that depends on the browser locale runs only after mount.
 */
export default function SessionHistory() {
  const [sessions, setSessions] = useState<SessionRecord[]>([]);
  const [status, setStatus] = useState<Status>("loading");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    void (async () => {
      try {
        const all = await listSessions();
        if (alive) {
          setSessions(all);
          setStatus("ready");
        }
      } catch {
        if (alive) {
          setSessions([]);
          setStatus("ready");
        }
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  const onDelete = useCallback(async (id: string): Promise<void> => {
    await deleteSession(id);
    const all = await listSessions();
    setSessions(all);
    setSelectedId((cur) => (cur === id ? null : cur));
  }, []);

  return (
    <div className="relative isolate flex flex-1 flex-col">
      <div className="app-atmosphere" aria-hidden="true" />

      <main className="relative z-10 mx-auto flex w-full max-w-2xl flex-1 flex-col gap-6 px-6 py-8">
        <header className="flex items-baseline justify-between">
          <span className="flex items-center gap-1.5">
            <h1 className="text-sm uppercase tracking-[0.22em] text-fg-muted">sessions</h1>
            <InfoBubble {...INFO.sessions} />
          </span>
          <Link
            href="/"
            className="text-xs text-fg-faint underline-offset-4 transition-colors hover:text-fg-muted focus-visible:text-fg-muted"
          >
            back to trainer
          </Link>
        </header>

        {status === "loading" ? (
          <p className="text-sm text-fg-faint">loading…</p>
        ) : sessions.length === 0 ? (
          <p className="text-sm text-fg-faint">
            no sessions yet — finish a session to see it here.
          </p>
        ) : (
          <ul className="flex flex-col gap-2">
            {sessions.map((s) => (
              <SessionRow
                key={s.id}
                session={s}
                expanded={selectedId === s.id}
                onToggle={() => setSelectedId((cur) => (cur === s.id ? null : s.id))}
                onDelete={() => void onDelete(s.id)}
              />
            ))}
          </ul>
        )}
      </main>
    </div>
  );
}

interface SessionRowProps {
  session: SessionRecord;
  expanded: boolean;
  onToggle: () => void;
  onDelete: () => void;
}

function SessionRow({ session, expanded, onToggle, onDelete }: SessionRowProps) {
  // toLocaleString runs only in the browser (this tree is ssr:false), so the
  // formatted date never differs between server and client.
  const dateLabel = new Date(session.startedAt).toLocaleString();

  return (
    <li className="rounded-xl border border-(--line) bg-(--bg-elevated)">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={expanded}
        className="flex w-full items-center gap-4 rounded-xl px-4 py-3 text-left transition-colors hover:bg-(--line) focus-visible:bg-(--line)"
      >
        <Sparkline data={session.coherenceTrace} width={88} height={26} className="shrink-0" />
        <span className="flex min-w-0 flex-1 flex-col gap-0.5">
          <span className="truncate text-sm text-fg">{dateLabel}</span>
          <span className="tnum text-xs text-fg-faint">
            {formatDuration(session.durationS)} · {session.pace} breaths/min
          </span>
        </span>
        <span className="flex shrink-0 flex-col items-end gap-0.5">
          <span className="tnum text-sm text-zone">{Math.round(session.avgCoherence)}</span>
          <span className="tnum text-xs text-fg-faint">peak {Math.round(session.peakCoherence)}</span>
        </span>
      </button>

      {expanded ? (
        <div className="flex flex-col gap-4 border-t border-(--line) px-4 py-4">
          <Sparkline
            data={session.coherenceTrace}
            width={560}
            height={80}
            className="h-20 w-full"
          />
          <dl className="flex flex-wrap gap-x-6 gap-y-1 text-xs text-fg-muted">
            <div className="flex gap-1.5">
              <dt className="text-fg-faint">avg</dt>
              <dd className="tnum">{session.avgCoherence}</dd>
            </div>
            <div className="flex gap-1.5">
              <dt className="text-fg-faint">peak</dt>
              <dd className="tnum">{session.peakCoherence}</dd>
            </div>
            <div className="flex gap-1.5">
              <dt className="text-fg-faint">achievement</dt>
              <dd className="tnum">{session.achievement ?? 0}</dd>
            </div>
            <div className="flex gap-1.5">
              <dt className="text-fg-faint">duration</dt>
              <dd className="tnum">{formatDuration(session.durationS)}</dd>
            </div>
            <div className="flex gap-1.5">
              <dt className="text-fg-faint">pace</dt>
              <dd className="tnum">{session.pace} breaths/min</dd>
            </div>
          </dl>
          <div className="flex flex-wrap items-center gap-2.5">
            <button
              type="button"
              className="btn btn-ghost"
              onClick={() =>
                downloadText(
                  `coherence-${session.id}.json`,
                  "application/json",
                  sessionToJSON(session),
                )
              }
            >
              export JSON
            </button>
            <button
              type="button"
              className="btn btn-ghost"
              onClick={() =>
                downloadText(`coherence-${session.id}.csv`, "text/csv", sessionToCSV(session))
              }
            >
              export CSV
            </button>
            <button type="button" className="btn btn-ghost" onClick={onDelete}>
              delete
            </button>
          </div>
        </div>
      ) : null}
    </li>
  );
}
