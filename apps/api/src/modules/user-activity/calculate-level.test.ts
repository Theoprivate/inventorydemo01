import { describe, expect, it } from "vitest";
import { calculateLevel, xpThresholdForLevel } from "./calculate-level.js";

describe("calculateLevel", () => {
  it("calculates fixed thresholds and progress", () => {
    expect(calculateLevel(0)).toMatchObject({ level: 1, totalXp: 0, currentLevelXp: 0, nextLevelXp: 100, progressPercent: 0 });
    expect(calculateLevel(175)).toMatchObject({ level: 2, totalXp: 175, currentLevelXp: 75, nextLevelXp: 150, progressPercent: 50 });
    expect(calculateLevel(700)).toMatchObject({ level: 5, currentLevelXp: 0, nextLevelXp: 300 });
    expect(calculateLevel(1_000)).toMatchObject({ level: 6, currentLevelXp: 0, nextLevelXp: 350 });
  });

  it("supports large XP without reducing the level", () => {
    const result = calculateLevel(10_000_000);
    expect(result.level).toBeGreaterThan(5);
    expect(xpThresholdForLevel(result.level)).toBeLessThanOrEqual(result.totalXp);
    expect(xpThresholdForLevel(result.level + 1)).toBeGreaterThan(result.totalXp);
  });
});
