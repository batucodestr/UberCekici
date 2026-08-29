import { describe, expect, it } from "vitest";

import { estimateDurationMinutes, haversineDistanceKm } from "@/lib/geo";

describe("haversineDistanceKm", () => {
  it("returns 0 for identical coordinates", () => {
    expect(haversineDistanceKm(41.0082, 28.9784, 41.0082, 28.9784)).toBe(0);
  });

  it("estimates distance between two known points", () => {
    const distance = haversineDistanceKm(41.0082, 28.9784, 39.9334, 32.8597);
    expect(distance).toBeGreaterThan(340);
    expect(distance).toBeLessThan(360);
  });
});

describe("estimateDurationMinutes", () => {
  it("scales with distance at the assumed average speed", () => {
    expect(estimateDurationMinutes(35)).toBe(60);
  });
});
