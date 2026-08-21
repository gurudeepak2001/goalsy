/**
 * Unit tests for computeWeeklyMilestones (GoalDetailScreen.tsx)
 *
 * Focus: verifying that brand-new goals do not prematurely mark early weeks
 * as 'behind' before the user has had a fair chance to log progress.
 *
 * The core rule under test:
 *   - 'behind' is only asserted when an *explicit* confirmedMap entry shows the
 *     logged amount is below the expected amount for that week.
 *   - An unconfirmed past week with currentAmount < expectedAmount stays
 *     'upcoming' (neutral), never 'behind'.
 *   - An unconfirmed past week with currentAmount >= expectedAmount stays
 *     'reached' (positive proxy inference, same as before the fix).
 *
 * This prevents the UX inconsistency where a green "on track" status banner
 * coexists with amber 'behind' diamond markers on the first milestone row —
 * a confusing signal for a goal that was just created.
 */

import { describe, it, expect, vi, afterEach } from 'vitest';
import { computeWeeklyMilestones } from '../pages/GoalDetailScreen';
import { estimatedCompletionDate } from '../lib/goalMath';
import type { Goal } from '@workspace/api-client-react';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const MS_PER_DAY = 24 * 60 * 60 * 1000;

/** Build a minimal Goal object, overridable per test. */
function makeGoal(overrides: Partial<Goal> = {}): Goal {
  const createdAt = new Date(Date.now() - 8 * MS_PER_DAY).toISOString(); // 8 days ago
  return {
    id: 'g1',
    userId: 'u1',
    title: 'Test Goal',
    goalType: 'other',
    targetAmount: 12_000,
    currentAmount: 0,
    monthlyContribution: 500,
    targetDate: null,
    createdAt,
    updatedAt: createdAt,
    ...overrides,
  } as unknown as Goal;
}

// ---------------------------------------------------------------------------
// Suite 1 – Brand-new goal (8 days old, currentAmount = 0)
// ---------------------------------------------------------------------------

describe('computeWeeklyMilestones – brand-new goal (8 days old, currentAmount = 0)', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('does NOT mark week 1 as "behind" when currentAmount is 0 and there is no confirmed entry', () => {
    // Goal created 8 days ago → week 1 (day 7) is 1 day in the past.
    // currentAmount = 0, monthlyContribution = 500, no confirmed log.
    // Expected: week 1 must not be 'behind'.
    const goal = makeGoal({ currentAmount: 0, monthlyContribution: 500 });
    const milestones = computeWeeklyMilestones(goal, new Map());

    const week1 = milestones.find(m => m.weekIndex === 1);
    expect(week1).toBeDefined();
    expect(week1!.isPast).toBe(true); // sanity: week 1 is indeed in the past
    expect(week1!.status).not.toBe('behind');
  });

  it('marks week 1 as "upcoming" (neutral) when currentAmount is 0 and there is no confirmed entry', () => {
    // The neutral fallback for an unconfirmed past week whose currentAmount
    // does not yet meet the expected bar must be 'upcoming', not 'behind'.
    const goal = makeGoal({ currentAmount: 0, monthlyContribution: 500 });
    const milestones = computeWeeklyMilestones(goal, new Map());

    const week1 = milestones.find(m => m.weekIndex === 1);
    expect(week1!.status).toBe('upcoming');
  });

  it('marks week 1 as "behind" when a confirmed entry is explicitly below expected', () => {
    // confirmedMap entry for week 1 = $10, expected ~= $115 → genuinely behind.
    const goal = makeGoal({ currentAmount: 0, monthlyContribution: 500 });
    const confirmedMap = new Map([[1, 10]]);
    const milestones = computeWeeklyMilestones(goal, confirmedMap);

    const week1 = milestones.find(m => m.weekIndex === 1);
    expect(week1!.status).toBe('behind');
  });

  it('marks week 1 as "reached" when a confirmed entry meets or exceeds expected', () => {
    // confirmedMap entry for week 1 = $200, expected ~= $115 → reached.
    const goal = makeGoal({ currentAmount: 0, monthlyContribution: 500 });
    const confirmedMap = new Map([[1, 200]]);
    const milestones = computeWeeklyMilestones(goal, confirmedMap);

    const week1 = milestones.find(m => m.weekIndex === 1);
    expect(week1!.status).toBe('reached');
  });

  it('keeps week 1 neutral when the current balance includes a starting amount but no new contribution is confirmed', () => {
    // The $500 starting balance is the baseline, so the first weekly target is
    // $500 + the week's planned contribution. Without a confirmation, we do
    // not infer that the new weekly amount was contributed.
    const goal = makeGoal({ currentAmount: 500, monthlyContribution: 500 });
    const milestones = computeWeeklyMilestones(goal, new Map());

    const week1 = milestones.find(m => m.weekIndex === 1);
    expect(week1!.status).toBe('upcoming');
  });
});

// ---------------------------------------------------------------------------
// Suite 2 – Status banner consistency: no 'behind' week alongside on_track
// ---------------------------------------------------------------------------

describe('computeWeeklyMilestones – status consistency with on_track computeRoadmap result', () => {
  it('produces no "behind" weeks for an 8-day-old goal with 0 savings and a positive contribution', () => {
    // computeRoadmap returns 'on_track' for a contribution-only goal (no targetDate),
    // regardless of currentAmount. computeWeeklyMilestones must not contradict this
    // by marking any week as 'behind' when no confirmed data exists.
    const goal = makeGoal({
      currentAmount: 0,
      monthlyContribution: 500,
      targetDate: null,
    });
    const milestones = computeWeeklyMilestones(goal, new Map());

    const behindWeeks = milestones.filter(m => m.status === 'behind');
    expect(behindWeeks).toHaveLength(0);
  });

  it('still surfaces "behind" weeks when confirmed entries prove the user fell short', () => {
    // Even though currentAmount is 0, two weeks are now 8+ days in the past
    // and both have confirmed entries below their expected amounts.
    // Use a goal created 15 days ago so weeks 1 and 2 are both past.
    const createdAt = new Date(Date.now() - 15 * MS_PER_DAY).toISOString();
    const goal = makeGoal({
      createdAt,
      currentAmount: 0,
      monthlyContribution: 500,
      targetDate: null,
    });

    // Week 1 confirmed at $10 (below ~$115), week 2 confirmed at $20 (below ~$230)
    const confirmedMap = new Map([[1, 10], [2, 20]]);
    const milestones = computeWeeklyMilestones(goal, confirmedMap);

    const behindWeeks = milestones.filter(m => m.status === 'behind');
    expect(behindWeeks.length).toBeGreaterThanOrEqual(2);
  });
});

// ---------------------------------------------------------------------------
// Suite 3 – Future weeks are always 'upcoming'
// ---------------------------------------------------------------------------

describe('computeWeeklyMilestones – future weeks are always "upcoming"', () => {
  it('marks all future weeks as "upcoming" regardless of confirmedMap', () => {
    // A goal created today — all weeks should be upcoming.
    const createdAt = new Date().toISOString();
    const goal = makeGoal({
      createdAt,
      currentAmount: 0,
      monthlyContribution: 500,
    });

    const milestones = computeWeeklyMilestones(goal, new Map());

    // No week should be 'behind' or 'reached' since none are in the past.
    const nonUpcoming = milestones.filter(m => m.status !== 'upcoming');
    expect(nonUpcoming).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// Suite 4 – Edge cases
// ---------------------------------------------------------------------------

describe('computeWeeklyMilestones – edge cases', () => {
  it('returns an empty array when targetAmount is 0', () => {
    const goal = makeGoal({ targetAmount: 0 });
    expect(computeWeeklyMilestones(goal, new Map())).toHaveLength(0);
  });

  it('returns an empty array when monthlyContribution is 0 and there is no targetDate', () => {
    // Without a targetDate or positive contribution, endDate cannot be computed.
    const goal = makeGoal({ monthlyContribution: 0, targetDate: null });
    expect(computeWeeklyMilestones(goal, new Map())).toHaveLength(0);
  });

  it('returns milestones when a targetDate is set even with monthlyContribution = 0', () => {
    // targetDate path: linear interpolation fallback, end date known.
    const futureDate = new Date(Date.now() + 365 * MS_PER_DAY).toISOString().split('T')[0];
    const goal = makeGoal({ monthlyContribution: 0, targetDate: futureDate });
    const milestones = computeWeeklyMilestones(goal, new Map());
    expect(milestones.length).toBeGreaterThan(0);
  });

  it('does not mark a targetDate-based week as "behind" if unconfirmed and currentAmount is 0', () => {
    // Same principle applies even when a targetDate is present: without an
    // explicit confirmation, week 1 must not show as 'behind'.
    const createdAt = new Date(Date.now() - 8 * MS_PER_DAY).toISOString();
    const futureDate = new Date(Date.now() + 180 * MS_PER_DAY).toISOString().split('T')[0];
    const goal = makeGoal({
      createdAt,
      currentAmount: 0,
      monthlyContribution: 0,
      targetDate: futureDate,
    });
    const milestones = computeWeeklyMilestones(goal, new Map());
    const week1 = milestones.find(m => m.weekIndex === 1);
    expect(week1).toBeDefined();
    expect(week1!.isPast).toBe(true);
    expect(week1!.status).not.toBe('behind');
  });
});

describe('computeWeeklyMilestones – remaining balance and buffered end date', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('starts from the saved balance and keeps the contribution-only schedule through the buffered estimate', () => {
    vi.useFakeTimers();
    const now = new Date('2026-08-20T12:00:00Z');
    vi.setSystemTime(now);
    const monthlyContribution = 25 * 52 / 12;
    const goal = makeGoal({
      createdAt: now.toISOString(),
      targetAmount: 2_591,
      currentAmount: 500,
      monthlyContribution,
      targetDate: null,
    });

    const milestones = computeWeeklyMilestones(goal, new Map());
    const bufferedEstimate = estimatedCompletionDate(2_591, 500, monthlyContribution, now)!;
    const lastMilestone = milestones.at(-1)!;

    expect(milestones[0]?.expectedAmount).toBe(525);
    expect(lastMilestone.weekDate.getTime()).toBeGreaterThanOrEqual(bufferedEstimate.getTime());
  });

  it('rebases an older goal’s next milestone to the balance saved today', () => {
    vi.useFakeTimers();
    const now = new Date('2026-08-20T12:00:00Z');
    vi.setSystemTime(now);
    const monthlyContribution = 25 * 52 / 12;
    const goal = makeGoal({
      createdAt: new Date(now.getTime() - 180 * MS_PER_DAY).toISOString(),
      targetAmount: 2_591,
      currentAmount: 500,
      monthlyContribution,
      targetDate: null,
    });

    const nextMilestone = computeWeeklyMilestones(goal, new Map())
      .find((milestone) => !milestone.isPast);

    expect(nextMilestone?.expectedAmount).toBe(525);
  });
});
