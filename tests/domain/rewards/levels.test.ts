import { describe, expect, it } from "vitest";
import { computeLevel, levelInfo, nextLevelInfo } from "../../../src/domain/rewards/levels";
import { points } from "../../../src/domain/types/rewards";

describe("computeLevel", () => {
  it("starts at level 1 with zero points", () => {
    expect(computeLevel(points(0))).toBe(1);
  });

  it("advances at each threshold", () => {
    expect(computeLevel(points(99))).toBe(1);
    expect(computeLevel(points(100))).toBe(2);
    expect(computeLevel(points(300))).toBe(3);
    expect(computeLevel(points(10000))).toBe(10);
  });

  it("caps at the top level for points beyond the last threshold", () => {
    expect(computeLevel(points(999999))).toBe(10);
  });
});

describe("levelInfo / nextLevelInfo", () => {
  it("returns the right info and the next level's info", () => {
    expect(levelInfo(1).name).toBe("Getting Started");
    expect(nextLevelInfo(1)?.name).toBe("Building Habits");
    expect(nextLevelInfo(10)).toBe(null);
  });
});
