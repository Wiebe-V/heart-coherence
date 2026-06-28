"use client";

import type { ReactNode } from "react";

interface MetricPanelProps {
  title: string;
  value?: ReactNode;
  /** Optional control rendered immediately after the title (e.g. an InfoBubble). */
  info?: ReactNode;
  children: ReactNode;
  className?: string;
}

export default function MetricPanel({ title, value, info, children, className = "" }: MetricPanelProps) {
  return (
    <section
      aria-label={title}
      className={`flex flex-col gap-3 rounded-xl border p-4 ${className}`}
      style={{ background: "var(--bg-elevated)", borderColor: "var(--line)" }}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5">
          <span className="text-[0.68rem] uppercase tracking-[0.18em] text-fg-faint">{title}</span>
          {info}
        </div>
        {value !== undefined ? <div className="flex items-center">{value}</div> : null}
      </div>
      {children}
    </section>
  );
}
