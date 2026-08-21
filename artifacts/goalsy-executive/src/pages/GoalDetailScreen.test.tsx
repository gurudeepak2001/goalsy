/**
 * Unit tests for `computeRoadmap` in GoalDetailScreen.
 *
 * Coverage:
 *   1. A deadline-based goal created <3 days ago with currentAmount=0 returns 'on_track'
 *      (grace-window guard prevents a false 'behind' flash on the detail screen).
 *   2. The same goal structure at 60+ days old with zero savings returns 'behind'
 *      (grace window has expired; the goal genuinely has not progressed).
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// ── Mock heavy dependencies pulled in by GoalDetailScreen ─────────────────────

vi.mock('@capacitor/core', () => ({
  Capacitor: { isNativePlatform: () => false, getPlatform: () => 'web' },
}));

vi.mock('@capacitor/keyboard', () => ({
  Keyboard: { addListener: vi.fn().mockResolvedValue({ remove: vi.fn() }) },
}));

vi.mock('wouter', () => ({
  useParams: () => ({ id: '1' }),
  useLocation: () => ['/', vi.fn()],
}));

vi.mock('@tanstack/react-query', () => ({
  useQueryClient: () => ({ invalidateQueries: vi.fn() }),
}));

vi.mock('@/hooks/use-toast', () => ({ toast: vi.fn() }));

vi.mock('@workspace/api-client-react', () => ({
  useGetGoal: () => ({ data: undefined, isLoading: true }),
  useUpdateGoal: () => ({ mutateAsync: vi.fn() }),
  useDeleteGoal: () => ({ mutateAsync: vi.fn() }),
  useGetFinancialProfile: () => ({ data: undefined }),
  useListGoalProgress: () => ({ data: undefined }),
  useCreateGoalProgress: () => ({ mutateAsync: vi.fn(), isPending: false }),
  getListGoalsQueryKey: () => ['goals'],
  getGetGoalQueryKey: () => ['goal', '1'],
  getListGoalProgressQueryKey: () => ['goal-progress', '1'],
}));

vi.mock('@/components/AppHeader', () => ({ default: () => null }));
vi.mock('@/components/AppShell', () => ({
  default: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));
vi.mock('@/components/ExecutiveButton', () => ({
  default: ({ text, onClick }: { text: string; onClick?: () => void }) => (
    <button type="button" onClick={onClick}>{text}</button>
  ),
}));
vi.mock('@/components/ExecutiveInput', () => ({
  default: ({ placeholder, value, onChange }: {
    placeholder?: string; value?: string; onChange?: React.ChangeEventHandler<HTMLInputElement>;
  }) => <input placeholder={placeholder} value={value} onChange={onChange} />,
}));

vi.mock('recharts', () => ({
  ResponsiveContainer: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  LineChart: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  Line: () => null,
  XAxis: () => null,
  YAxis: () => null,
  Tooltip: () => null,
}));

// ── Import after all mocks ────────────────────────────────────────────────────

import { computeRoadmap } from './GoalDetailScreen';
import type { Goal } from '@workspace/api-client-react';

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeDeadlineGoal(overrides: Partial<Goal> = {}): Goal {
  return {
    id: 'goal-1',
    userId: 'user-1',
    name: 'Down Payment',
    type: 'home_purchase',
    targetAmount: 50_000,
    currentAmount: 0,
    monthlyContribution: 0,
    paymentFrequency: 'monthly',
    targetDate: null,
    status: 'active',
    priority: 1,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides,
  };
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('computeRoadmap – grace window for brand-new deadline-based goals', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns on_track for a goal created 1 day ago with currentAmount=0', () => {
    const now = new Date('2026-08-15T12:00:00Z');
    vi.setSystemTime(now);

    const oneDayAgo = new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000).toISOString();
    const oneYearOut = new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000)
      .toISOString()
      .split('T')[0];

    const goal = makeDeadlineGoal({
      createdAt: oneDayAgo,
      targetDate: oneYearOut,
      currentAmount: 0,
    });

    const { overallStatus } = computeRoadmap(goal, null);

    expect(overallStatus).toBe('on_track');
  });

  it('returns on_track for a goal created 2 days ago with currentAmount=0', () => {
    const now = new Date('2026-08-15T12:00:00Z');
    vi.setSystemTime(now);

    const twoDaysAgo = new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000).toISOString();
    const oneYearOut = new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000)
      .toISOString()
      .split('T')[0];

    const goal = makeDeadlineGoal({
      createdAt: twoDaysAgo,
      targetDate: oneYearOut,
      currentAmount: 0,
    });

    const { overallStatus } = computeRoadmap(goal, null);

    expect(overallStatus).toBe('on_track');
  });

  it('returns behind for the same goal structure at 60 days old with currentAmount=0', () => {
    const now = new Date('2026-08-15T12:00:00Z');
    vi.setSystemTime(now);

    // Created 60 days ago, target still 1 year from now (so ~305 days remain).
    const sixtyDaysAgo = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000).toISOString();
    const oneYearFromNow = new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000)
      .toISOString()
      .split('T')[0];

    const goal = makeDeadlineGoal({
      createdAt: sixtyDaysAgo,
      targetDate: oneYearFromNow,
      currentAmount: 0,
    });

    const { overallStatus } = computeRoadmap(goal, null);

    expect(overallStatus).toBe('behind');
  });

  it('grace window does not suppress a genuinely ahead status', () => {
    // A goal created 1 day ago with substantial savings should still show 'ahead'.
    const now = new Date('2026-08-15T12:00:00Z');
    vi.setSystemTime(now);

    const oneDayAgo = new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000).toISOString();
    const oneYearOut = new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000)
      .toISOString()
      .split('T')[0];

    const goal = makeDeadlineGoal({
      createdAt: oneDayAgo,
      targetDate: oneYearOut,
      // $5,000/mo is well above the ~$3,300/mo required for the $40,000 remaining balance.
      currentAmount: 10_000,
      monthlyContribution: 5_000,
    });

    const { overallStatus } = computeRoadmap(goal, null);

    expect(overallStatus).toBe('ahead');
  });
});

describe('computeRoadmap – displayed estimate', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('shows the buffered estimate based on the remaining balance', () => {
    vi.setSystemTime(new Date('2026-08-20T12:00:00Z'));
    const result = computeRoadmap(makeDeadlineGoal({
      targetAmount: 2_591,
      currentAmount: 500,
      monthlyContribution: 25 * 52 / 12,
    }), null);

    expect(result.estimatedCompletionDate).toBe('Apr 2028');
  });
});
