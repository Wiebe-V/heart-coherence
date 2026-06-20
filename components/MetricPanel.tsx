"use client";

import type { ReactNode } from "react";

interface MetricPanelProps {
  title: string;
  value?: ReactNode;
  children: ReactNode;
  className?: string;
}

export default function MetricPanel({ title, value, children, className = "" }: MetricPanelProps) {
  return (
    <section
      aria-label={title}
      className={`flex flex-col gap-3 rounded-xl border p-4 ${className}`}
      style={{ background: "var(--bg-elevated)", borderColor: "var(--line)" }}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="text-[0.68rem] uppercase tracking-[0.18em] text-fg-faint">{title}</span>
        {value !== undefined ? <div className="flex items-center">{value}</div> : null}
      </div>
      {children}
    </section>
  );
}
