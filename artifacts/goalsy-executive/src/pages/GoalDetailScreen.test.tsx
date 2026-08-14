/**
 * Unit tests for computeRoadmap – contribution-rate goal grace-period guard.
 *
 * Coverage:
 *   1. A contribution-rate goal created <3 days ago with monthlyContribution>0
 *      and currentAmount=0 returns overallStatus='on_track' (not 'behind').
 *   2. The same goal at 60+ days old with zero savings returns 'behind'.
 *
 * The 0.1-month (≈3-day) guard lives at the `monthsElapsed < 0.1` branch
 * inside computeRoadmap.  Without this test a future refactor could silently
 * remove that guard and start showing false "behind schedule" banners the
 * moment a user creates a contribution-rate goal.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// ── Mock heavy dependencies pulled in by GoalDetailScreen ────────────────────

vi.mock('@capacitor/core', () => ({
  Capacitor: {
    isNativePlatform: () => false,
    getPlatform: () => 'web',
  },
}));

vi.mock('@capacitor/keyboard', () => ({
  Keyboard: {
    addListener: (_event: string, _cb: () => void) =>
      Promise.resolve({ remove: vi.fn() }),
  },
}));

vi.mock('wouter', () => ({
  useParams: () => ({ id: '1' }),
  useLocation: () => ['/', vi.fn()],
}));

vi.mock('@tanstack/react-query', () => ({
  useQueryClient: () => ({ invalidateQueries: vi.fn() }),
}));

vi.mock('@/hooks/use-toast', () => ({
  toast: vi.fn(),
}));

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
  default: ({
    placeholder,
    value,
    onChange,
  }: {
    placeholder?: string;
    value?: string;
    onChange?: React.ChangeEventHandler<HTMLInputElement>;
  }) => <input placeholder={placeholder} value={value} onChange={onChange} />,
}));

vi.mock('recharts', () => ({
  ResponsiveContainer: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  LineChart: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  Line: () => null,
  XAxis: () => null,
  YAxis: () => null,
  Tooltip: () => null,
}));

// ── Import after all mocks are set up ────────────────────────────────────────

import { computeRoadmap } from '@/lib/roadmap';
import type { Goal } from '@workspace/api-client-react';

// ── Helpers ──────────────────────────────────────────────────────────────────

const MS_PER_DAY = 24 * 60 * 60 * 1000;

/** Build a minimal contribution-rate Goal (no targetDate). */
function makeContribGoal(overrides: Partial<Goal> = {}): Goal {
  return {
    id: 1,
    userId: 'user-1',
    name: 'Emergency Fund',
    type: 'emergency_fund',
    targetAmount: 12000,
    currentAmount: 0,
    monthlyContribution: 500,
    targetDate: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides,
  } as unknown as Goal;
}

// ── Tests ────────────────────────────────────────────────────────────────────

describe('computeRoadmap – contribution-rate goal grace-period guard', () => {
  const FIXED_NOW = new Date('2026-08-14T12:00:00Z');

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(FIXED_NOW);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it(
    'returns on_track for a brand-new goal (1 day old) with zero savings — ' +
      'the <0.1-month guard prevents a false "behind" flash on creation',
    () => {
      const oneDayAgo = new Date(FIXED_NOW.getTime() - 1 * MS_PER_DAY);
      const goal = makeContribGoal({
        currentAmount: 0,
        monthlyContribution: 500,
        createdAt: oneDayAgo.toISOString(),
      });

      const { overallStatus } = computeRoadmap(goal, null);

      expect(overallStatus).toBe('on_track');
    },
  );

  it(
    'returns on_track for a 2-day-old goal with zero savings — ' +
      'still inside the ≈3-day grace window',
    () => {
      const twoDaysAgo = new Date(FIXED_NOW.getTime() - 2 * MS_PER_DAY);
      const goal = makeContribGoal({
        currentAmount: 0,
        monthlyContribution: 500,
        createdAt: twoDaysAgo.toISOString(),
      });

      const { overallStatus } = computeRoadmap(goal, null);

      expect(overallStatus).toBe('on_track');
    },
  );

  it(
    'returns behind for the same goal at 60 days old with zero savings — ' +
      'past the grace window, contributions are expected',
    () => {
      const sixtyDaysAgo = new Date(FIXED_NOW.getTime() - 60 * MS_PER_DAY);
      const goal = makeContribGoal({
        currentAmount: 0,
        monthlyContribution: 500,
        createdAt: sixtyDaysAgo.toISOString(),
      });

      const { overallStatus } = computeRoadmap(goal, null);

      expect(overallStatus).toBe('behind');
    },
  );

  it(
    'returns on_track at 60 days when savings keep pace with the monthly rate',
    () => {
      const sixtyDaysAgo = new Date(FIXED_NOW.getTime() - 60 * MS_PER_DAY);
      // 60 days ≈ 1.97 months; 500/mo × 1.97 ≈ $985 expected.
      // Supplying $985 meets the ≥90% threshold → on_track.
      const goal = makeContribGoal({
        currentAmount: 985,
        monthlyContribution: 500,
        createdAt: sixtyDaysAgo.toISOString(),
      });

      const { overallStatus } = computeRoadmap(goal, null);

      expect(overallStatus).toBe('on_track');
    },
  );
});
