"use client";

import { useState } from "react";
import MetricPanel from "@/components/MetricPanel";
import SpectrumChart from "@/components/SpectrumChart";
import ZoneTimeChart from "@/components/ZoneTimeChart";

type Tab = "spectrum" | "zone";

export default function BarChartPanel() {
  const [tab, setTab] = useState<Tab>("spectrum");

  const toggle = (
    <div
      className="flex overflow-hidden rounded-full text-[0.63rem]"
      style={{ border: "1px solid var(--line-strong)" }}
    >
      {(["spectrum", "zone"] as Tab[]).map((t) => (
        <button
          key={t}
          type="button"
          className="px-2.5 py-0.5 uppercase tracking-[0.12em] transition-colors"
          style={{
            background: tab === t ? "var(--line-strong)" : "transparent",
            color: tab === t ? "var(--fg)" : "var(--fg-faint)",
          }}
          onClick={() => setTab(t)}
        >
          {t}
        </button>
      ))}
    </div>
  );

  return (
    <MetricPanel
      title={tab === "spectrum" ? "hrv spectrum" : "time in zone"}
      value={toggle}
    >
      {tab === "spectrum" ? <SpectrumChart /> : <ZoneTimeChart />}
    </MetricPanel>
  );
}
