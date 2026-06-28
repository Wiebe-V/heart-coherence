"use client";

import { useId, useRef, useState, type ChangeEvent, type ReactNode } from "react";
import { useSettingsStore } from "@/lib/settingsStore";
import { useFocusTrap } from "@/hooks/useFocusTrap";
import { listSessions, bulkPutSessions } from "@/lib/db";
import { buildBackup, serializeBackup, parseBackup } from "@/lib/backup";
import { downloadText } from "@/lib/export";
import InfoBubble from "@/components/InfoBubble";
import { INFO } from "@/lib/infoText";

interface SettingsDrawerProps {
  open: boolean;
  onClose: () => void;
  /** when true, skip the slide transition */
  reduced: boolean;
}

const inputClass =
  "w-full rounded-lg border border-(--line-strong) bg-transparent px-3 py-2 text-sm text-fg tnum focus-visible:border-(--focus)";

function Field({
  label,
  info,
  children,
}: {
  label: string;
  info?: ReactNode;
  /** Receives the generated id so the control can be associated with the label. */
  children: (id: string) => ReactNode;
}) {
  const id = useId();
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center gap-1.5">
        <label htmlFor={id} className="text-xs uppercase tracking-[0.18em] text-fg-muted">
          {label}
        </label>
        {info}
      </div>
      {children(id)}
    </div>
  );
}

type BackupStatus = { kind: "idle" | "done" | "error"; message: string };

/**
 * Export-all / import controls for moving sessions + settings between devices.
 * Export gathers every session from idb plus the live settings into one JSON
 * file; import validates an uploaded file (lib/backup.parseBackup), merges its
 * sessions by id, and replaces settings. All file work is client-only.
 */
function BackupSection() {
  const settings = useSettingsStore((s) => s.settings);
  const update = useSettingsStore((s) => s.update);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [status, setStatus] = useState<BackupStatus>({ kind: "idle", message: "" });

  async function onExport(): Promise<void> {
    try {
      const sessions = await listSessions();
      const json = serializeBackup(buildBackup(settings, sessions, Date.now()));
      const date = new Date().toISOString().slice(0, 10);
      downloadText(`coherence-backup-${date}.json`, "application/json", json);
      setStatus({ kind: "done", message: `exported ${sessions.length} sessions` });
    } catch {
      setStatus({ kind: "error", message: "export failed" });
    }
  }

  async function onFileChange(e: ChangeEvent<HTMLInputElement>): Promise<void> {
    const file = e.target.files?.[0];
    e.target.value = ""; // let the same file be picked again later
    if (!file) return;

    let text: string;
    try {
      text = await file.text();
    } catch {
      setStatus({ kind: "error", message: "couldn't read that file" });
      return;
    }

    const result = parseBackup(text);
    if (!result.ok) {
      setStatus({ kind: "error", message: result.error });
      return;
    }

    try {
      await bulkPutSessions(result.sessions);
    } catch {
      setStatus({ kind: "error", message: "couldn't save the imported sessions" });
      return;
    }
    update(result.settings);

    const skippedNote = result.skipped > 0 ? ` · ${result.skipped} skipped` : "";
    setStatus({
      kind: "done",
      message: `imported ${result.sessions.length} sessions · settings replaced${skippedNote}`,
    });
  }

  return (
    <div className="flex flex-col gap-1.5 border-t border-(--line) pt-6">
      <span className="text-xs uppercase tracking-[0.18em] text-fg-muted">backup &amp; transfer</span>
      <p className="text-[0.7rem] text-fg-faint">
        export a file with every session and your settings, then import it on another device.
        importing merges sessions and replaces settings.
      </p>
      <div className="flex flex-wrap items-center gap-2.5 pt-1">
        <button type="button" className="btn btn-ghost" onClick={() => void onExport()}>
          export backup
        </button>
        <button
          type="button"
          className="btn btn-ghost"
          onClick={() => fileInputRef.current?.click()}
        >
          import backup
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept="application/json,.json"
          className="hidden"
          onChange={(e) => void onFileChange(e)}
        />
      </div>
      {status.kind !== "idle" ? (
        <p
          role="status"
          className={`text-[0.7rem] ${status.kind === "error" ? "text-fg" : "text-fg-faint"}`}
        >
          {status.message}
        </p>
      ) : null}
    </div>
  );
}

/**
 * Right-side slide-over for editing live Settings. Every change writes through
 * useSettingsStore.update (validated by mergeSettings — e.g. building must stay
 * below coherent), so edits apply across the app immediately.
 */
export default function SettingsDrawer({ open, onClose, reduced }: SettingsDrawerProps) {
  const settings = useSettingsStore((s) => s.settings);
  const update = useSettingsStore((s) => s.update);
  const panelRef = useFocusTrap<HTMLDivElement>(open, onClose);
  const labelId = useId();

  const { building, coherent } = settings.zoneThresholds;
  const rmo = settings.reducedMotionOverride;
  const rmoValue = rmo === null ? "auto" : rmo ? "on" : "off";
  const themeValue = settings.theme ?? "auto";

  return (
    <>
      <div
        className="fixed inset-0 z-40 bg-black/50"
        style={{
          opacity: open ? 1 : 0,
          pointerEvents: open ? "auto" : "none",
          transition: reduced ? "none" : "opacity 300ms ease",
        }}
        onClick={onClose}
        aria-hidden="true"
      />
      <div
        ref={panelRef}
        inert={!open}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-labelledby={labelId}
        className="fixed inset-y-0 right-0 z-50 flex w-full max-w-sm flex-col gap-6 overflow-y-auto border-l p-6"
        style={{
          background: "var(--bg-elevated)",
          borderColor: "var(--line-strong)",
          transform: open ? "translateX(0)" : "translateX(100%)",
          transition: reduced ? "none" : "transform 300ms ease",
        }}
      >
        <div className="flex items-center justify-between">
          <h2 id={labelId} className="text-sm uppercase tracking-[0.22em] text-fg-muted">
            settings
          </h2>
          <button type="button" className="btn btn-ghost" onClick={onClose}>
            close
          </button>
        </div>

        <Field label="achievement goal" info={<InfoBubble {...INFO.achievementGoal} />}>
          {(id) => (
            <input
              id={id}
              type="number"
              className={inputClass}
              min={1}
              step={10}
              value={settings.achievementGoal}
              onChange={(e) => update({ achievementGoal: Number(e.target.value) })}
            />
          )}
        </Field>

        <div className="flex flex-col gap-1.5">
          <div className="flex items-center gap-1.5">
            <span className="text-xs uppercase tracking-[0.18em] text-fg-muted">zone thresholds</span>
            <InfoBubble {...INFO.zoneThresholds} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Field label="building at">
              {(id) => (
                <input
                  id={id}
                  type="number"
                  className={inputClass}
                  min={0}
                  max={100}
                  value={building}
                  onChange={(e) => update({ zoneThresholds: { building: Number(e.target.value), coherent } })}
                />
              )}
            </Field>
            <Field label="coherent at">
              {(id) => (
                <input
                  id={id}
                  type="number"
                  className={inputClass}
                  min={0}
                  max={100}
                  value={coherent}
                  onChange={(e) => update({ zoneThresholds: { building, coherent: Number(e.target.value) } })}
                />
              )}
            </Field>
          </div>
          <p className="text-[0.7rem] text-fg-faint">building must stay below coherent</p>
        </div>

        <Field label="resonance interval (s)" info={<InfoBubble {...INFO.resonanceInterval} />}>
          {(id) => (
            <input
              id={id}
              type="number"
              className={inputClass}
              min={1}
              step={5}
              value={settings.resonanceIntervalS}
              onChange={(e) => update({ resonanceIntervalS: Number(e.target.value) })}
            />
          )}
        </Field>

        <Field label="reduced motion" info={<InfoBubble {...INFO.reducedMotion} />}>
          {(id) => (
            <select
              id={id}
              className={inputClass}
              value={rmoValue}
              onChange={(e) => {
                const v = e.target.value;
                update({ reducedMotionOverride: v === "auto" ? null : v === "on" });
              }}
            >
              <option value="auto">auto (system)</option>
              <option value="on">on</option>
              <option value="off">off</option>
            </select>
          )}
        </Field>

        <Field label="theme" info={<InfoBubble {...INFO.theme} />}>
          {(id) => (
            <select
              id={id}
              className={inputClass}
              value={themeValue}
              onChange={(e) => {
                const v = e.target.value;
                update({ theme: v === "auto" ? null : (v as "light" | "dark") });
              }}
            >
              <option value="auto">auto (system)</option>
              <option value="light">light</option>
              <option value="dark">dark</option>
            </select>
          )}
        </Field>

        <BackupSection />
      </div>
    </>
  );
}
