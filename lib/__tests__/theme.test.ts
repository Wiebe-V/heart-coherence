import { describe, it, expect, afterEach, vi } from "vitest";
import { resolveTheme, themeBootScript } from "@/lib/theme";
import { SETTINGS_KEY } from "@/lib/constants";

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("resolveTheme", () => {
  it("explicit 'light' wins over the system", () => {
    expect(resolveTheme("light")).toBe("light");
  });

  it("explicit 'dark' wins over the system", () => {
    expect(resolveTheme("dark")).toBe("dark");
  });

  it("null follows the system when it prefers light", () => {
    vi.stubGlobal("window", {
      matchMedia: (q: string) => ({ matches: q.includes("light") }),
    });
    expect(resolveTheme(null)).toBe("light");
  });

  it("null follows the system when it prefers dark", () => {
    vi.stubGlobal("window", { matchMedia: () => ({ matches: false }) });
    expect(resolveTheme(null)).toBe("dark");
  });

  it("null falls back to dark with no matchMedia (SSR)", () => {
    expect(resolveTheme(null)).toBe("dark");
  });
});

describe("themeBootScript", () => {
  it("references the settings key and resolves against the system query", () => {
    const s = themeBootScript();
    expect(typeof s).toBe("string");
    expect(s).toContain(SETTINGS_KEY);
    expect(s).toContain("data-theme");
    expect(s).toContain("prefers-color-scheme");
  });
});
