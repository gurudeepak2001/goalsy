import { describe, expect, it } from 'vitest';
import {
  completionDateIso,
  completionMonths,
  ESTIMATE_BUFFER_DAYS,
  estimatedCompletionDateIso,
  exactCompletionDateIso,
  fromMonthlyContribution,
  requiredMonthlyContribution,
  toMonthlyContribution,
} from '../lib/goalMath';

describe('goal math', () => {
  const target = 2_591;
  const saved = 500;

  it('uses the remaining balance when estimating a weekly contribution plan', () => {
    const monthlyPlan = toMonthlyContribution(25, 'weekly');

    expect(monthlyPlan).toBeCloseTo(108.33, 2);
    expect(completionMonths(target, saved, monthlyPlan)).toBeCloseTo(19.3, 1);
    expect((completionMonths(target, saved, monthlyPlan) ?? 0) * (52 / 12)).toBeCloseTo(83.6, 1);
  });

  it('suggests a buffered completion date that is never earlier than the exact remaining-balance date', () => {
    const now = new Date('2026-08-20T12:00:00.000Z');
    const monthlyPlan = toMonthlyContribution(25, 'weekly');

    const exact = exactCompletionDateIso(target, saved, monthlyPlan, now);
    const suggested = estimatedCompletionDateIso(target, saved, monthlyPlan, now);

    // ISO date inputs represent midnight UTC, so suggestions round forward to
    // the next calendar boundary rather than displaying a date before the
    // underlying timestamp.
    expect(exact).toBe('2028-03-31');
    expect(suggested).toBe('2028-04-21');
    expect(completionDateIso(target, saved, monthlyPlan, now)).toBe(suggested);
    expect(new Date(suggested!).getTime() - new Date(exact!).getTime())
      .toBe(ESTIMATE_BUFFER_DAYS * 24 * 60 * 60 * 1000);
  });

  it('does not add a buffer to a goal that is already complete', () => {
    const now = new Date('2026-08-20T12:00:00.000Z');

    expect(completionDateIso(2_591, 2_591, 100, now)).toBe('2026-08-20');
  });

  it('converts a deadline-required monthly amount back to a weekly form amount', () => {
    const now = new Date('2026-08-20T12:00:00.000Z');
    const requiredMonthly = requiredMonthlyContribution(target, saved, '2028-03-31', now);

    expect(requiredMonthly).not.toBeNull();
    expect(Math.ceil(fromMonthlyContribution(requiredMonthly!, 'weekly'))).toBe(26);
  });
});