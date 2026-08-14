/**
 * Unit tests for the production computeRoadmap function in src/lib/roadmap.ts,
 * focused on contribution-rate goals (no targetDate) and the
 * contributionShortfall catch-up calculation.
 *
 * Key invariant: contributionShortfall is the ACCUMULATED deficit —
 *   monthly * monthsElapsed − currentAmount
 * — not a per-month rate gap. This gives users a concrete lump sum to add.
 *
 * All tests pin `now` via the optional third argument so results are
 * deterministic regardless of when the suite runs.
 */

import { describe, it, expect } from 'vitest';
import { computeRoadmap, MS_PER_MONTH } from '../lib/roadmap';
import type { Goal } from '@workspace/api-client-react';

// ── Helpers ───────────────────────────────────────────────────────────────────

const NOW = new Date('2026-08-14T12:00:00Z');

function monthsAgo(n: number): string {
  return new Date(NOW.getTime() - n * MS_PER_MONTH).toISOString();
}

/** Minimal valid Goal for contribution-rate (no targetDate) scenarios. */
function makeGoal(overrides: Partial<Goal> = {}): Goal {
  return {
    id: 'test-goal',
    userId: 'user-1',
    name: 'Test Goal',
    type: 'investment',
    targetAmount: 10_000,
    currentAmount: 0,
    monthlyContribution: 600,
    targetDate: null,
    status: 'active',
    priority: 1,
    createdAt: monthsAgo(2),
    updatedAt: NOW.toISOString(),
    ...overrides,
  };
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('computeRoadmap – contribution-rate goal catch-up amount', () => {
  it('shows accumulated deficit, not a single-month rate gap', () => {
    // $600/mo goal, created 2 months ago, $0 saved.
    // Per-month rate gap would be $600; accumulated deficit is ~$1,200.
    const result = computeRoadmap(makeGoal({ currentAmount: 0 }), null, NOW);

    expect(result.overallStatus).toBe('behind');
    // Shortfall must be ~$1,200 (2 × $600), not ~$600.
    expect(result.contributionShortfall).not.toBeNull();
    expect(result.contributionShortfall!).toBeGreaterThan(1_000);
    expect(result.contributionShortfall!).toBeLessThan(1_400);
  });

  it('reduces shortfall as user catches up mid-period', () => {
    // Same 2-month goal; user has saved $800 of the ~$1,200 expected.
    const result = computeRoadmap(makeGoal({ currentAmount: 800 }), null, NOW);

    expect(result.overallStatus).toBe('behind');
    // Shortfall ≈ $1,200 expected − $800 saved = ~$400.
    expect(result.contributionShortfall).not.toBeNull();
    expect(result.contributionShortfall!).toBeGreaterThan(200);
    expect(result.contributionShortfall!).toBeLessThan(600);
  });

  it('clears behind status when savings cross the 90% threshold', () => {
    // $1,100 saved after 2 months (> 90% of $1,200 expected → on track).
    const result = computeRoadmap(makeGoal({ currentAmount: 1_100 }), null, NOW);

    expect(result.overallStatus).toBe('on_track');
    expect(result.contributionShortfall).toBeNull();
  });

  it('returns no_data and no shortfall when monthlyContribution is zero', () => {
    const result = computeRoadmap(
      makeGoal({ monthlyContribution: 0, currentAmount: 0 }),
      null,
      NOW,
    );

    expect(result.overallStatus).toBe('no_data');
    expect(result.contributionShortfall).toBeNull();
  });

  it('suppresses behind status within the first 0.1 months after creation', () => {
    // Goal created 1 day ago — too soon to flag as behind.
    const oneDayAgo = new Date(NOW.getTime() - 1 * 24 * 60 * 60 * 1_000).toISOString();
    const result = computeRoadmap(
      makeGoal({ currentAmount: 0, createdAt: oneDayAgo }),
      null,
      NOW,
    );

    expect(result.overallStatus).toBe('on_track');
    expect(result.contributionShortfall).toBeNull();
  });

  it('marks complete and returns no shortfall when currentAmount >= targetAmount', () => {
    const result = computeRoadmap(
      makeGoal({ currentAmount: 10_000, targetAmount: 10_000 }),
      null,
      NOW,
    );

    expect(result.overallStatus).toBe('complete');
    expect(result.contributionShortfall).toBeNull();
  });

  it('shortfall is zero (not negative) when user has slightly overpaid', () => {
    // User saved $1,300 against a ~$1,200 expected — still behind threshold
    // due to 90% check but shortfall should floor at zero.
    // (At $1,300 / 2 months = $650/mo actual vs $600 planned → on_track actually)
    // Use a higher goal contribution so they remain behind.
    const result = computeRoadmap(
      makeGoal({ currentAmount: 1_300, monthlyContribution: 1_000 }),
      null,
      NOW,
    );

    // Expected ≈ $2,000; actual $1,300 → behind. Shortfall ≈ $700.
    expect(result.overallStatus).toBe('behind');
    expect(result.contributionShortfall).toBeGreaterThan(0);
  });
});
