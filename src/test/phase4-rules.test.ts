import { describe, it, expect } from "vitest";
import { intervalMs, parseNaturalQuery } from "@/lib/intel-rules";
import { extractConcepts } from "@/lib/graph";

describe("agent schedule", () => {
  it("never runs more often than every 15 minutes", () => {
    expect(intervalMs("1m")).toBe(15 * 60e3);
    expect(intervalMs("bogus")).toBe(15 * 60e3);
  });
  it("honours longer intervals", () => {
    expect(intervalMs("6h")).toBe(6 * 3600e3);
    expect(intervalMs("1d")).toBe(864e5);
  });
});

describe("natural-language search", () => {
  it("reads a 14-day window and thread type", () => {
    expect(parseNaturalQuery("viral threads about local LLMs from the last 14 days")).toEqual({ days: 14, types: ["Thread"] });
  });
  it("reads weeks", () => {
    expect(parseNaturalQuery("posts from the past 2 weeks").days).toBe(14);
  });
});

describe("graph concepts", () => {
  it("drops filler words like 'Here'", () => {
    expect(extractConcepts("Here is why Apple Silicon wins")).toEqual(["Apple Silicon"]);
  });
});
