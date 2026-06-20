"use client";

import { useEffect, useRef, useState } from "react";
import {
  getDebugPackets,
  subscribeDebug,
  clearDebugPackets,
  type BleDebugPacket,
} from "@/lib/bleDebug";

export default function BleDebugPanel() {
  const [packets, setPackets] = useState<BleDebugPacket[]>(() => getDebugPackets());
  const [pinned, setPinned] = useState(true);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    return subscribeDebug(() => setPackets([...getDebugPackets()]));
  }, []);

  useEffect(() => {
    if (pinned && listRef.current) {
      listRef.current.scrollTop = listRef.current.scrollHeight;
    }
  }, [packets, pinned]);

  const t0 = packets[0]?.ts ?? 0;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 border-t border-[var(--line-strong)] bg-[var(--surface)]/95 backdrop-blur-sm">
      <div className="flex items-center justify-between px-3 py-1.5">
        <span className="font-mono text-xs text-[var(--fg-faint)]">
          BLE debug · {packets.length} packets
        </span>
        <div className="flex gap-4 text-xs text-[var(--fg-faint)]">
          <button
            type="button"
            onClick={() => setPinned((p) => !p)}
            className="hover:text-[var(--fg-muted)]"
          >
            {pinned ? "unpin" : "pin"}
          </button>
          <button
            type="button"
            onClick={clearDebugPackets}
            className="hover:text-[var(--fg-muted)]"
          >
            clear
          </button>
        </div>
      </div>

      <div ref={listRef} className="h-48 overflow-y-auto px-3 pb-2">
        {packets.length === 0 ? (
          <p className="py-6 text-center font-mono text-xs text-[var(--fg-faint)]">
            waiting for BLE packets…
          </p>
        ) : (
          <table className="w-full font-mono text-xs">
            <thead className="sticky top-0 bg-[var(--surface)]">
              <tr className="text-left text-[var(--fg-faint)]">
                <th className="w-16 py-1 pr-3">+ms</th>
                <th className="py-1 pr-3">hex</th>
                <th className="w-10 py-1 pr-3">HR</th>
                <th className="w-14 py-1 pr-3">hasRR</th>
                <th className="py-1">RR (ms)</th>
              </tr>
            </thead>
            <tbody>
              {packets.map((p, i) => (
                <tr
                  key={i}
                  className="border-t border-[var(--line-strong)]/40"
                >
                  <td className="py-0.5 pr-3 text-[var(--fg-faint)]">
                    {Math.round(p.ts - t0)}
                  </td>
                  <td className="break-all py-0.5 pr-3 text-[var(--fg-muted)]">{p.hex}</td>
                  <td className="py-0.5 pr-3 text-[var(--fg)]">{Math.round(p.hr)}</td>
                  <td
                    className="py-0.5 pr-3"
                    style={{ color: p.hasRR ? "var(--zone)" : "#f87171" }}
                  >
                    {p.hasRR ? "yes" : "no"}
                  </td>
                  <td className="py-0.5 text-[var(--fg-muted)]">
                    {p.rr.length ? p.rr.map((r) => Math.round(r)).join(", ") : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
