import { describe, expect, it } from "vitest";
import { calculateMissionStreak } from "./missionStreak";

describe("calculateMissionStreak", () => {
  it("records the first verified seven-day award while retaining the current streak", () => {
    const completedMissions = Array.from({ length: 8 }, (_, index) => ({
      missionDate: `2026-08-${String(index + 10).padStart(2, "0")}`,
      completedAt: new Date(`2026-08-${String(index + 10).padStart(2, "0")}T09:30:00.000Z`),
      status: "completed",
    }));

    expect(calculateMissionStreak(completedMissions, "2026-08-17")).toEqual({
      currentStreak: 8,
      longestStreak: 8,
      firstSevenDayStreakAt: "2026-08-16T09:30:00.000Z",
    });
  });

  it("does not treat a broken or stale streak as current", () => {
    const completedMissions = [
      { missionDate: "2026-08-01", completedAt: new Date("2026-08-01T09:00:00.000Z"), status: "completed" },
      { missionDate: "2026-08-02", completedAt: new Date("2026-08-02T09:00:00.000Z"), status: "completed" },
      { missionDate: "2026-08-04", completedAt: new Date("2026-08-04T09:00:00.000Z"), status: "completed" },
    ];

    expect(calculateMissionStreak(completedMissions, "2026-08-07")).toEqual({
      currentStreak: 0,
      longestStreak: 2,
      firstSevenDayStreakAt: null,
    });
  });

  it("keeps yesterday's completed streak active until today's mission is due", () => {
    const completedMissions = [
      { missionDate: "2026-08-14", completedAt: new Date("2026-08-14T09:00:00.000Z"), status: "completed" },
      { missionDate: "2026-08-15", completedAt: new Date("2026-08-15T09:00:00.000Z"), status: "completed" },
      { missionDate: "2026-08-16", completedAt: new Date("2026-08-16T09:00:00.000Z"), status: "completed" },
    ];

    expect(calculateMissionStreak(completedMissions, "2026-08-17")).toMatchObject({
      currentStreak: 3,
      longestStreak: 3,
      firstSevenDayStreakAt: null,
    });
  });

  it("breaks the current streak when today's mission is explicitly skipped", () => {
    const missionHistory = [
      { missionDate: "2026-08-16", completedAt: new Date("2026-08-16T09:00:00.000Z"), status: "completed" },
      { missionDate: "2026-08-17", completedAt: null, status: "skipped" },
    ];

    expect(calculateMissionStreak(missionHistory, "2026-08-17")).toMatchObject({
      currentStreak: 0,
      longestStreak: 1,
      firstSevenDayStreakAt: null,
    });
  });
});