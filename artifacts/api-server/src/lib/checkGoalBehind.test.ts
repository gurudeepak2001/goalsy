import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { checkGoalBehind } from "./checkGoalBehind";

const MS_PER_MONTH = 30.44 * 24 * 60 * 60 * 1000;

/** Build a minimal contribution-rate goal (no targetDate). */
function makeContributionGoal(overrides: {
  currentAmount?: number;
  monthlyContribution?: number;
  monthsOld?: number;
}): Parameters<typeof checkGoalBehind>[0] {
  const monthsOld = overrides.monthsOld ?? 3;
  const createdAt = new Date(Date.now() - monthsOld * MS_PER_MONTH);
  return {
    targetAmount: 10_000,
    currentAmount: overrides.currentAmount ?? 0,
    monthlyContribution: overrides.monthlyContribution ?? 500,
    targetDate: null,
    createdAt,
  };
}

describe("checkGoalBehind — contribution-rate mode (no targetDate)", () => {
  it("flags a goal as behind when the actual run-rate is below 90% of the planned monthly contribution", () => {
    // Goal is 3 months old, plan is $500/mo → expected ≈ $1 500; saving only $900 (≈ $300/mo).
    const goal = makeContributionGoal({ currentAmount: 900, monthlyContribution: 500, monthsOld: 3 });
    const result = checkGoalBehind(goal);

    expect(result.behind).toBe(true);
    expect(result.contributionShortfall).toBeGreaterThan(0);
    expect(result.expectedByNow).toBe(0); // not set in mode 2
  });

  it("does not flag a goal as behind when the actual run-rate meets the plan", () => {
    // Goal is 3 months old, plan is $500/mo → saving $1 600 (≈ $533/mo), on pace.
    const goal = makeContributionGoal({ currentAmount: 1_600, monthlyContribution: 500, monthsOld: 3 });
    const result = checkGoalBehind(goal);

    expect(result.behind).toBe(false);
    expect(result.contributionShortfall).toBe(0);
  });

  it("suppresses the alert when the goal is brand-new (< 0.1 months old)", () => {
    // Created just 1 day ago — not enough history.
    const oneDayMs = 24 * 60 * 60 * 1000;
    const goal: Parameters<typeof checkGoalBehind>[0] = {
      targetAmount: 10_000,
      currentAmount: 0,
      monthlyContribution: 500,
      targetDate: null,
      createdAt: new Date(Date.now() - oneDayMs),
    };
    const result = checkGoalBehind(goal);

    expect(result.behind).toBe(false);
    expect(result.contributionShortfall).toBe(0);
  });

  it("suppresses the alert when monthlyContribution is 0 (no plan set)", () => {
    const goal = makeContributionGoal({ currentAmount: 0, monthlyContribution: 0, monthsOld: 3 });
    const result = checkGoalBehind(goal);

    expect(result.behind).toBe(false);
    expect(result.contributionShortfall).toBe(0);
  });

  it("does not falsely alert when currentAmount is 0 but the goal is brand-new", () => {
    // Edge case: $0 saved, but created just hours ago — the 0.1-month guard must fire.
    const twoHoursMs = 2 * 60 * 60 * 1000;
    const goal: Parameters<typeof checkGoalBehind>[0] = {
      targetAmount: 10_000,
      currentAmount: 0,
      monthlyContribution: 500,
      targetDate: null,
      createdAt: new Date(Date.now() - twoHoursMs),
    };
    const result = checkGoalBehind(goal);

    expect(result.behind).toBe(false);
  });

  it("correctly computes contributionShortfall as the gap between planned and actual rate", () => {
    // 2 months old, $0 saved, plan $600/mo → actualRate = 0, shortfall = 600.
    const goal = makeContributionGoal({ currentAmount: 0, monthlyContribution: 600, monthsOld: 2 });
    const result = checkGoalBehind(goal);

    expect(result.behind).toBe(true);
    // shortfall should be close to monthlyContribution when actualRate ≈ 0
    expect(result.contributionShortfall).toBeCloseTo(600, 0);
  });
});

describe("checkGoalBehind — target-date mode", () => {
  it("flags a goal as behind when current amount is well below the linear expectation", () => {
    const created = new Date(Date.now() - 6 * MS_PER_MONTH);
    const target = new Date(Date.now() + 6 * MS_PER_MONTH).toISOString().split("T")[0];
    const goal: Parameters<typeof checkGoalBehind>[0] = {
      targetAmount: 12_000,
      currentAmount: 100, // should have ~$6 000 by now
      monthlyContribution: 0,
      targetDate: target,
      createdAt: created,
    };
    const result = checkGoalBehind(goal);

    expect(result.behind).toBe(true);
    expect(result.expectedByNow).toBeGreaterThan(0);
    expect(result.contributionShortfall).toBe(0);
  });

  it("does not flag a goal as behind when current amount is on pace", () => {
    const created = new Date(Date.now() - 6 * MS_PER_MONTH);
    const target = new Date(Date.now() + 6 * MS_PER_MONTH).toISOString().split("T")[0];
    const goal: Parameters<typeof checkGoalBehind>[0] = {
      targetAmount: 12_000,
      currentAmount: 6_000, // exactly on the linear midpoint
      monthlyContribution: 1_000, // enough to cover the $6,000 remaining over 6 months
      targetDate: target,
      createdAt: created,
    };
    const result = checkGoalBehind(goal);

    expect(result.behind).toBe(false);
  });
});
