"use client";

import { useEffect, useId, useLayoutEffect, useRef, useState, type ReactNode } from "react";

interface InfoBubbleProps {
  /** Popover heading; also drives the button's aria-label ("About {title}"). */
  title: string;
  /** The "what it is" line. */
  what: ReactNode;
  /** The "how to use it" line. */
  how: ReactNode;
  /**
   * Horizontal anchor of the popover relative to the icon. "start" opens toward
   * the right (left edge at the icon); "end" opens toward the left.
   */
  align?: "start" | "end";
  /** Open below ("bottom") or above ("top") the icon. */
  side?: "top" | "bottom";
}

/**
 * A small "ⓘ" button that toggles a plain-language popover explaining a graph,
 * widget, or setting. A non-modal disclosure: focus stays on the button, Escape
 * closes it (returning focus), and an outside-click dismisses it — which also
 * means opening one bubble closes any other, so only one is ever open.
 */
export default function InfoBubble({ title, what, how, align = "start", side = "bottom" }: InfoBubbleProps) {
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef<HTMLSpanElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const panelId = useId();
  const headingId = useId();

  // The popover anchors to the icon, so in tight spots (notably the settings
  // drawer, pinned to the viewport's right edge) it can spill off-screen. Once
  // open, measure it and nudge it horizontally back into view, writing the
  // transform straight to the node. Layout effect so it happens before paint —
  // no visible jump.
  useLayoutEffect(() => {
    const el = panelRef.current;
    if (!open || !el) return;
    const margin = 8;
    const rect = el.getBoundingClientRect();
    let dx = 0;
    const overRight = rect.right - (window.innerWidth - margin);
    if (overRight > 0) dx -= overRight;
    if (rect.left + dx < margin) dx = margin - rect.left;
    el.style.transform = dx ? `translateX(${dx}px)` : "";
  }, [open]);

  useEffect(() => {
    if (!open) return;

    const onPointerDown = (e: PointerEvent): void => {
      if (!wrapperRef.current?.contains(e.target as Node)) setOpen(false);
    };
    // Capture-phase so Escape closes only this bubble: if it reached a parent's
    // keydown handler (e.g. the settings drawer's focus trap) the whole drawer
    // would close too. stopPropagation keeps the dismissal scoped to the bubble.
    const onKey = (e: KeyboardEvent): void => {
      if (e.key === "Escape") {
        e.preventDefault();
        e.stopPropagation();
        setOpen(false);
        buttonRef.current?.focus();
      }
    };

    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKey, true);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKey, true);
    };
  }, [open]);

  const horizontal = align === "end" ? "right-0" : "left-0";
  const vertical = side === "top" ? "bottom-full mb-2" : "top-full mt-2";

  return (
    <span ref={wrapperRef} className="relative inline-flex">
      <button
        ref={buttonRef}
        type="button"
        aria-label={`About ${title}`}
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((o) => !o)}
        className="inline-flex items-center justify-center rounded-full text-fg-faint transition-colors hover:text-fg-muted focus-visible:text-fg-muted"
      >
        <svg
          width="15"
          height="15"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinecap="round"
          aria-hidden="true"
        >
          <circle cx="12" cy="12" r="9" />
          <path d="M12 11v5" />
          <path d="M12 7.6h.01" />
        </svg>
      </button>

      {open ? (
        <div
          ref={panelRef}
          id={panelId}
          role="group"
          aria-labelledby={headingId}
          className={`absolute z-30 w-60 ${horizontal} ${vertical} rounded-lg border border-(--line-strong) bg-(--bg-elevated) p-3 text-left shadow-lg`}
        >
          <p id={headingId} className="text-xs font-medium text-fg">
            {title}
          </p>
          <p className="mt-1.5 text-xs leading-relaxed text-fg-muted">{what}</p>
          <p className="mt-1.5 text-xs leading-relaxed text-fg-muted">{how}</p>
        </div>
      ) : null}
    </span>
  );
}
