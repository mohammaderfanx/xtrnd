import { describe, expect, it } from "vitest";
import { canExportDigest, toggleDigestItem } from "@/lib/digest-selection";
import { FREE_AI_PER_DAY } from "@/lib/plan";

describe("Phase 3 rules", () => {
  it("allows three daily free summaries", () => {
    expect(FREE_AI_PER_DAY).toBe(3);
  });
  it("requires at least five digest items", () => {
    expect(canExportDigest(4)).toBe(false);
    expect(canExportDigest(5)).toBe(true);
  });
  it("limits digest selection and export to ten items", () => {
    const ids = Array.from({ length: 10 }, (_, i) => String(i));
    expect(toggleDigestItem(ids, "extra")).toEqual(ids);
    expect(canExportDigest(10)).toBe(true);
    expect(canExportDigest(11)).toBe(false);
  });
});