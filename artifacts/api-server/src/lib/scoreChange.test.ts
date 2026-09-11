import { describe, expect, it } from "vitest";
import { buildScoreChange } from "./scoreChange";

const currentDrivers = [
  { label: "Savings Rate", value: 150, maxValue: 250, trend: "up" },
  { label: "Goal Momentum", value: 100, maxValue: 250, trend: "neutral" },
];

describe("buildScoreChange", () => {
  it("returns driver-backed reasons for a real score increase", () => {
    const change = buildScoreChange(250, currentDrivers, {
      score: 210,
      driversJson: JSON.stringify([
        { label: "Savings Rate", value: 110, maxValue: 250, trend: "neutral" },
        { label: "Goal Momentum", value: 100, maxValue: 250, trend: "neutral" },
      ]),
    });

    expect(change).toMatchObject({
      status: "changed",
      delta: 40,
      previousScore: 210,
      reasons: [{
        label: "Savings Rate",
        delta: 40,
        previousValue: 110,
        currentValue: 150,
      }],
    });
  });

  it("does not invent reasons when history is unavailable or unchanged", () => {
    expect(buildScoreChange(250, currentDrivers, undefined)).toEqual({
      status: "insufficient_history",
      delta: 0,
      previousScore: null,
      reasons: [],
    });
    expect(buildScoreChange(250, currentDrivers, { score: 250, driversJson: "not-json" })).toMatchObject({
      status: "unchanged",
      delta: 0,
      reasons: [],
    });
  });
});