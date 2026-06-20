import { describe, it, expect, beforeEach } from "vitest";
import { useSettingsStore } from "@/lib/settingsStore";
import { DEFAULT_SETTINGS, PACE } from "@/lib/constants";

function resetStore() {
  useSettingsStore.setState({ settings: DEFAULT_SETTINGS });
}

describe("useSettingsStore", () => {
  beforeEach(resetStore);

  it("initial settings equal defaults", () => {
    expect(useSettingsStore.getState().settings).toEqual(DEFAULT_SETTINGS);
  });

  it("update merges a valid partial, leaving other fields intact", () => {
    useSettingsStore.getState().update({ achievementGoal: 400 });
    const s = useSettingsStore.getState().settings;
    expect(s.achievementGoal).toBe(400);
    expect(s.pace).toBe(DEFAULT_SETTINGS.pace);
  });

  it("update validates invalid values via mergeSettings", () => {
    useSettingsStore.getState().update({ achievementGoal: -5 });
    expect(useSettingsStore.getState().settings.achievementGoal).toBe(
      DEFAULT_SETTINGS.achievementGoal,
    );
  });

  it("update clamps pace", () => {
    useSettingsStore.getState().update({ pace: 99 });
    expect(useSettingsStore.getState().settings.pace).toBe(PACE.max);
  });

  it("update preserves previously updated fields across updates", () => {
    useSettingsStore.getState().update({ achievementGoal: 250 });
    useSettingsStore.getState().update({ resonanceIntervalS: 90 });
    const s = useSettingsStore.getState().settings;
    expect(s.achievementGoal).toBe(250);
    expect(s.resonanceIntervalS).toBe(90);
  });
});
