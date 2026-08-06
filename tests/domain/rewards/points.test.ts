import { describe, expect, it } from "vitest";
import { contributionPoints, loggingPointsForDay, milestonePoints, streakBonusPoints } from "../../../src/domain/rewards/points";
import { cents } from "../../../src/domain/money";

describe("loggingPointsForDay", () => {
  it("awards 5 per transaction", () => {
    expect(loggingPointsForDay(1)).toBe(5);
    expect(loggingPointsForDay(2)).toBe(10);
  });

  it("caps at 15/day", () => {
    expect(loggingPointsForDay(3)).toBe(15);
    expect(loggingPointsForDay(10)).toBe(15);
  });

  it("is zero for no transactions", () => {
    expect(loggingPointsForDay(0)).toBe(0);
  });
});

describe("contributionPoints", () => {
  it("awards 1 point per $10 contributed", () => {
    expect(contributionPoints(cents(5000))).toBe(5); // $50
    expect(contributionPoints(cents(2500))).toBe(2); // $25 -> floors to 2 tens
  });

  it("caps at 100 points per contribution event", () => {
    expect(contributionPoints(cents(500000))).toBe(100); // $5000 would be 500 points uncapped
  });
});

describe("milestonePoints / streakBonusPoints", () => {
  it("matches the configured table", () => {
    expect(milestonePoints(25)).toBe(100);
    expect(milestonePoints(50)).toBe(150);
    expect(milestonePoints(75)).toBe(200);
    expect(milestonePoints(100)).toBe(500);
    expect(streakBonusPoints(7)).toBe(50);
    expect(streakBonusPoints(30)).toBe(200);
    expect(streakBonusPoints(100)).toBe(750);
  });
});
