import { describe, expect, it } from 'vitest';
import {
  completionDateIso,
  completionMonths,
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

  it('uses the same remaining-balance calculation for an auto-filled completion date', () => {
    const now = new Date('2026-08-20T12:00:00.000Z');
    const monthlyPlan = toMonthlyContribution(25, 'weekly');

    expect(completionDateIso(target, saved, monthlyPlan, now)).toMatch(/^2028-03-/);
  });

  it('converts a deadline-required monthly amount back to a weekly form amount', () => {
    const now = new Date('2026-08-20T12:00:00.000Z');
    const requiredMonthly = requiredMonthlyContribution(target, saved, '2028-03-31', now);

    expect(requiredMonthly).not.toBeNull();
    expect(Math.ceil(fromMonthlyContribution(requiredMonthly!, 'weekly'))).toBe(26);
  });
});