import { useCallback, useEffect, useMemo, useRef } from "react";
import type { ConnectionState } from "@/types";
import { useTrainerStore } from "@/lib/store";
import { reset as resetBeatBuffer } from "@/lib/beatBuffer";
import {
  BleHeartRateSource,
  SimulatedSource,
  type BeatSource,
  type SourceCallbacks,
} from "@/lib/source";

const HR_THROTTLE_MS = 1000;

function readableError(err: unknown): string {
  if (err instanceof Error && err.message) return err.message;
  return "Could not connect to the heart-rate sensor.";
}

export function useHeartRateSensor(): {
  connection: ConnectionState;
  supported: boolean;
  connect: () => Promise<void>;
  connectSimulator: () => Promise<void>;
  disconnect: () => void;
} {
  const connection = useTrainerStore((s) => s.connection);
  const sourceRef = useRef<BeatSource | null>(null);
  const lastHrTsRef = useRef(0);

  const callbacks = useMemo<SourceCallbacks>(
    () => ({
      onConnectionState: (state) => {
        useTrainerStore.getState().setConnection(state);
      },
      onHr: (hr) => {
        const now = performance.now();
        if (now - lastHrTsRef.current < HR_THROTTLE_MS) return;
        lastHrTsRef.current = now;
        useTrainerStore.getState().setHr(Math.round(hr));
      },
    }),
    [],
  );

  const connect = useCallback(async (): Promise<void> => {
    const supported = typeof navigator !== "undefined" && "bluetooth" in navigator;
    const store = useTrainerStore.getState();
    if (!supported) {
      store.setConnection({
        status: "unsupported",
        message: "Web Bluetooth needs Chrome or Edge over localhost or HTTPS.",
      });
      return;
    }
    resetBeatBuffer();
    store.resetSignal();
    store.setMode("ble");
    store.setConnection({ status: "requesting" });
    const src = new BleHeartRateSource(callbacks);
    sourceRef.current = src;
    try {
      await src.start();
    } catch (err) {
      sourceRef.current = null;
      const cancelled =
        err instanceof DOMException &&
        (err.name === "NotFoundError" || err.name === "AbortError");
      if (cancelled) {
        store.setMode(null);
        store.setConnection({ status: "idle" });
      } else {
        store.setConnection({ status: "error", message: readableError(err) });
      }
    }
  }, [callbacks]);

  const connectSimulator = useCallback(async (): Promise<void> => {
    const store = useTrainerStore.getState();
    resetBeatBuffer();
    store.resetSignal();
    store.setMode("simulator");
    const src = new SimulatedSource(callbacks);
    sourceRef.current = src;
    try {
      await src.start();
      store.setConnection({ status: "connected", deviceName: "Simulator" });
    } catch (err) {
      sourceRef.current = null;
      store.setMode(null);
      store.setConnection({ status: "error", message: readableError(err) });
    }
  }, [callbacks]);

  const disconnect = useCallback((): void => {
    sourceRef.current?.stop();
    sourceRef.current = null;
    resetBeatBuffer();
    const store = useTrainerStore.getState();
    store.resetSignal();
    store.setMode(null);
    store.setConnection({ status: "disconnected" });
  }, []);

  useEffect(
    () => () => {
      sourceRef.current?.stop();
    },
    [],
  );

  const supported = typeof navigator !== "undefined" && "bluetooth" in navigator;

  return { connection, supported, connect, connectSimulator, disconnect };
}
