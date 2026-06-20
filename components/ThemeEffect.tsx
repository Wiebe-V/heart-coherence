"use client";

import { useEffect } from "react";
import { useSettingsStore } from "@/lib/settingsStore";
import { applyTheme } from "@/lib/theme";

/**
 * Applies the persisted theme preference to <html> and keeps it synced with the
 * system when set to follow. The boot script handles the pre-paint apply; this
 * covers runtime changes from the settings drawer and OS-level shifts. Renders
 * nothing — mounted once near the root.
 */
export default function ThemeEffect() {
  const theme = useSettingsStore((s) => s.settings.theme);

  useEffect(() => {
    applyTheme(theme);
  }, [theme]);

  useEffect(() => {
    if (theme !== null) return;
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") return;
    const mql = window.matchMedia("(prefers-color-scheme: light)");
    const onChange = (): void => applyTheme(null);
    mql.addEventListener("change", onChange);
    return () => mql.removeEventListener("change", onChange);
  }, [theme]);

  return null;
}
