"use client";

import { useId, type ReactNode } from "react";
import { useSettingsStore } from "@/lib/settingsStore";
import { useFocusTrap } from "@/hooks/useFocusTrap";
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
      </div>
    </>
  );
}
