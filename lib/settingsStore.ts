import { create } from "zustand";
import type { Settings } from "@/types";
import { loadSettings, saveSettings, mergeSettings } from "@/lib/settings";

interface SettingsState {
  settings: Settings;
  /** Merge + validate a partial, then persist. Drawer edits apply live. */
  update: (partial: Partial<Settings>) => void;
}

/**
 * Live, persisted Settings. Initialised from localStorage (DEFAULT_SETTINGS on
 * SSR / first import), so every consumer re-renders when the drawer edits a
 * setting. The live `pace` value still lives in useTrainerStore.
 */
export const useSettingsStore = create<SettingsState>((set, get) => ({
  settings: loadSettings(),
  update: (partial) => {
    const next = mergeSettings({ ...get().settings, ...partial });
    set({ settings: next });
    saveSettings(next);
  },
}));
