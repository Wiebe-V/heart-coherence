"use client";

import { useId, type ReactNode } from "react";
import { useSettingsStore } from "@/lib/settingsStore";
import { useFocusTrap } from "@/hooks/useFocusTrap";

interface SettingsDrawerProps {
  open: boolean;
  onClose: () => void;
  /** when true, skip the slide transition */
  reduced: boolean;
}

const inputClass =
  "w-full rounded-lg border border-(--line-strong) bg-transparent px-3 py-2 text-sm text-fg tnum focus-visible:border-(--focus)";

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-xs uppercase tracking-[0.18em] text-fg-muted">{label}</span>
      {children}
    </label>
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

        <Field label="achievement goal">
          <input
            type="number"
            className={inputClass}
            min={1}
            step={10}
            value={settings.achievementGoal}
            onChange={(e) => update({ achievementGoal: Number(e.target.value) })}
          />
        </Field>

        <div className="grid grid-cols-2 gap-4">
          <Field label="building at">
            <input
              type="number"
              className={inputClass}
              min={0}
              max={100}
              value={building}
              onChange={(e) => update({ zoneThresholds: { building: Number(e.target.value), coherent } })}
            />
          </Field>
          <Field label="coherent at">
            <input
              type="number"
              className={inputClass}
              min={0}
              max={100}
              value={coherent}
              onChange={(e) => update({ zoneThresholds: { building, coherent: Number(e.target.value) } })}
            />
          </Field>
        </div>
        <p className="-mt-3 text-[0.7rem] text-fg-faint">building must stay below coherent</p>

        <Field label="resonance interval (s)">
          <input
            type="number"
            className={inputClass}
            min={1}
            step={5}
            value={settings.resonanceIntervalS}
            onChange={(e) => update({ resonanceIntervalS: Number(e.target.value) })}
          />
        </Field>

        <Field label="reduced motion">
          <select
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
        </Field>
      </div>
    </>
  );
}
