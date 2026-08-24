import { describe, expect, it } from "vitest";
import {
  buildProgressLedger,
  normalizeProgressEntries,
  type GoalRow,
  type ProgressRow,
} from "./progressLedger";

function makeGoal(): GoalRow {
  return {
    id: "goal-1",
    userId: "user-1",
    name: "Home deposit",
    type: "savings",
    targetAmount: 10_000,
    currentAmount: 2_600,
    openingAmount: 0,
    monthlyContribution: 500,
    paymentFrequency: "monthly",
    targetDate: null,
    status: "active",
    priority: 1,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

function legacySnapshot(weekIndex: number, confirmedAmount: number): ProgressRow {
  return {
    id: `entry-${weekIndex}`,
    goalId: "goal-1",
    userId: "user-1",
    weekIndex,
    weeklyDeposit: null,
    confirmedAmount,
    confirmedAt: new Date(),
  };
}

describe("progress ledger legacy conversion", () => {
  it("reduces every later total when an earlier legacy week is lowered", () => {
    const goal = makeGoal();
    const legacyEntries = [
      legacySnapshot(1, 100),
      legacySnapshot(2, 1_300),
      legacySnapshot(3, 2_600),
    ];

    const normalizedEntries = normalizeProgressEntries(goal, legacyEntries);
    expect(normalizedEntries.map((entry) => entry.weeklyDeposit)).toEqual([100, 1_200, 1_300]);

    const editedEntries = normalizedEntries.map((entry) =>
      entry.weekIndex === 2 ? { ...entry, weeklyDeposit: 500 } : entry,
    );
    const ledger = buildProgressLedger(goal, editedEntries);

    expect(ledger.rows.map((row) => row.confirmedAmount)).toEqual([100, 600, 1_900]);
    expect(ledger.currentAmount).toBe(1_900);
  });
});