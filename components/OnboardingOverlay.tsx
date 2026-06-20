"use client";

import { useFocusTrap } from "@/hooks/useFocusTrap";

interface OnboardingOverlayProps {
  onClose: () => void;
}

const STEPS: { n: number; title: string; body: string }[] = [
  {
    n: 1,
    title: "connect your strap",
    body: "pair a bluetooth heart-rate monitor that streams beat-to-beat intervals.",
  },
  {
    n: 2,
    title: "breathe with the orb",
    body: "follow the orb as it rises and falls — slow, even breaths around your pace.",
  },
  {
    n: 3,
    title: "build coherence to your goal",
    body: "steady breathing smooths your heart rhythm; reach the goal to finish a session.",
  },
];

/**
 * First-run explainer (and reopenable via the "how it works" link). Focus-
 * trapped and Escape / backdrop dismissable; the caller persists the
 * onboarded flag in onClose.
 */
export default function OnboardingOverlay({ onClose }: OnboardingOverlayProps) {
  const ref = useFocusTrap<HTMLDivElement>(true, onClose);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-6">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} aria-hidden="true" />
      <div
        ref={ref}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-label="how it works"
        className="relative z-10 flex w-full max-w-md flex-col gap-6 rounded-2xl border p-7"
        style={{ background: "var(--bg-elevated)", borderColor: "var(--line-strong)" }}
      >
        <header className="flex flex-col gap-2">
          <h2 className="text-sm uppercase tracking-[0.22em] text-fg-muted">how it works</h2>
          <p className="text-sm leading-relaxed text-fg-muted">
            coherence is the smooth, steady heart rhythm that comes from calm, paced breathing. this
            trainer reads your heartbeat and shows how coherent you are, moment to moment.
          </p>
        </header>

        <ol className="flex flex-col gap-4">
          {STEPS.map((s) => (
            <li key={s.n} className="flex gap-3">
              <span className="tnum mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-(--line-strong) text-xs text-fg-muted">
                {s.n}
              </span>
              <span className="flex flex-col gap-0.5">
                <span className="text-sm text-fg">{s.title}</span>
                <span className="text-xs leading-relaxed text-fg-faint">{s.body}</span>
              </span>
            </li>
          ))}
        </ol>

        <div className="flex justify-end">
          <button type="button" className="btn btn-primary" onClick={onClose}>
            get started
          </button>
        </div>
      </div>
    </div>
  );
}
