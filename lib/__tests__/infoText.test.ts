import { describe, it, expect } from "vitest";
import { INFO } from "@/lib/infoText";

describe("INFO registry", () => {
  it("has entries", () => {
    expect(Object.keys(INFO).length).toBeGreaterThan(0);
  });

  for (const [key, entry] of Object.entries(INFO)) {
    describe(key, () => {
      it("has a non-empty title", () => {
        expect(entry.title.trim()).not.toBe("");
      });
      it("has a non-empty what", () => {
        expect(entry.what.trim()).not.toBe("");
      });
      it("has a non-empty how", () => {
        expect(entry.how.trim()).not.toBe("");
      });
    });
  }
});
