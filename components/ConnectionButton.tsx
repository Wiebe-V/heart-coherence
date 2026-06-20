"use client";

import type { ReactNode } from "react";
import { useHeartRateSensor } from "@/hooks/useHeartRateSensor";

/**
 * Surfaces the full ConnectionState as quiet, directive UI. The switch over
 * connection.status is exhaustive (every ConnectionStatus + a `never` default),
 * so adding a status to the type forces a compile error here.
 */
export default function ConnectionButton() {
  const { connection, connect, disconnect } = useHeartRateSensor();

  const connectStrap = (
    <button type="button" className="btn btn-primary" onClick={() => void connect()}>
      connect strap
    </button>
  );
  const disconnectBtn = (
    <button type="button" className="btn btn-ghost" onClick={disconnect}>
      disconnect
    </button>
  );

  let content: ReactNode;

  switch (connection.status) {
    case "idle":
      content = connectStrap;
      break;

    case "requesting":
    case "connecting":
      content = (
        <div className="flex items-center gap-2.5 text-sm text-fg-muted">
          <span className="spinner" aria-hidden="true" />
          <span>connecting…</span>
        </div>
      );
      break;

    case "connected":
      content = (
        <div className="flex flex-wrap items-center justify-center gap-3">
          <span className="flex items-center gap-2 text-sm text-fg">
            <span
              className="inline-block h-1.5 w-1.5 rounded-full bg-zone"
              aria-hidden="true"
            />
            {connection.deviceName ?? "connected"}
          </span>
          {disconnectBtn}
        </div>
      );
      break;

    case "no-rr":
      content = (
        <div className="flex flex-col items-center gap-2 text-center">
          <p className="max-w-sm text-sm text-fg-muted">
            {connection.message ?? "This strap isn't sending beat-to-beat data."}
          </p>
          <p className="max-w-sm text-xs text-fg-faint">
            Try a strap that reports RR intervals (e.g. Polar H10).
          </p>
          {disconnectBtn}
        </div>
      );
      break;

    case "unsupported":
      content = (
        <p className="max-w-sm text-sm text-fg-muted">
          {connection.message ?? "Web Bluetooth needs Chrome or Edge over localhost or HTTPS."}
        </p>
      );
      break;

    case "error":
      content = (
        <div className="flex flex-col items-center gap-2 text-center">
          <p className="max-w-sm text-sm text-fg-muted">
            {connection.message ?? "Could not connect to the heart-rate sensor."}
          </p>
          <button type="button" className="btn btn-primary" onClick={() => void connect()}>
            try again
          </button>
        </div>
      );
      break;

    case "disconnected":
      content = (
        <button type="button" className="btn btn-primary" onClick={() => void connect()}>
          reconnect
        </button>
      );
      break;

    default: {
      const _exhaustive: never = connection.status;
      content = _exhaustive;
    }
  }

  return (
    <div aria-live="polite" className="flex min-h-[2.75rem] items-center justify-center">
      {content}
    </div>
  );
}
