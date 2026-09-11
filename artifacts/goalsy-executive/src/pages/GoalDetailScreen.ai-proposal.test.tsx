import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';

const { updateGoal, queryClient } = vi.hoisted(() => ({
  updateGoal: vi.fn().mockResolvedValue(undefined),
  queryClient: {
    setQueryData: vi.fn(),
    invalidateQueries: vi.fn().mockResolvedValue(undefined),
  },
}));
const scrollIntoView = vi.fn();

vi.mock('@capacitor/core', () => ({
  Capacitor: { isNativePlatform: () => false, getPlatform: () => 'web' },
}));
vi.mock('@capacitor/keyboard', () => ({
  Keyboard: { addListener: vi.fn().mockResolvedValue({ remove: vi.fn() }) },
}));
vi.mock('wouter', () => ({
  useParams: () => ({ id: 'goal-1' }),
  useLocation: () => ['/goals/goal-1', vi.fn()],
}));
vi.mock('@tanstack/react-query', () => ({ useQueryClient: () => queryClient }));
vi.mock('@/hooks/use-toast', () => ({ toast: vi.fn() }));
vi.mock('@workspace/api-client-react', () => ({
  useGetGoal: () => ({
    isLoading: false,
    data: {
      id: 'goal-1', userId: 'user-1', name: 'Taxable Investment Portfolio', type: 'investment',
      targetAmount: 100_000, currentAmount: 20_000, monthlyContribution: 500,
      paymentFrequency: 'monthly', targetDate: null, status: 'active', priority: 1,
      createdAt: '2026-01-01T00:00:00.000Z', updatedAt: '2026-01-01T00:00:00.000Z',
    },
  }),
  useGetFinancialProfile: () => ({ data: undefined }),
  useListGoalProgress: () => ({ data: [] }),
  useUpdateGoal: () => ({ mutateAsync: updateGoal, isPending: false }),
  useCreateGoalProgress: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useCompleteMission: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useDeleteGoal: () => ({ mutateAsync: vi.fn(), isPending: false }),
  getListGoalsQueryKey: () => ['goals'],
  getGetGoalQueryKey: () => ['goal', 'goal-1'],
  getListGoalProgressQueryKey: () => ['goal-progress', 'goal-1'],
  getGetTodayMissionQueryKey: () => ['today-mission'],
  getGetScoreQueryKey: () => ['score'],
}));
vi.mock('@/components/AppHeader', () => ({ default: () => null }));
vi.mock('@/components/AppShell', () => ({
  default: ({ children }: { children: React.ReactNode }) => <main>{children}</main>,
}));
vi.mock('@/components/AppModal', () => ({ default: () => null }));
vi.mock('@/components/ExecutiveButton', () => ({
  default: ({ text, onClick, disabled }: { text: string; onClick?: () => void; disabled?: boolean }) => (
    <button type="button" onClick={onClick} disabled={disabled}>{text}</button>
  ),
}));
vi.mock('@/components/ExecutiveInput', () => ({
  default: ({ placeholder, value, onChange, onBlur }: {
    placeholder?: string;
    value?: string;
    onChange?: React.ChangeEventHandler<HTMLInputElement>;
    onBlur?: React.FocusEventHandler<HTMLInputElement>;
  }) => <input placeholder={placeholder} value={value} onChange={onChange} onBlur={onBlur} />,
}));
vi.mock('recharts', () => ({
  ResponsiveContainer: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  LineChart: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  Line: () => null,
  XAxis: () => null,
  YAxis: () => null,
  Tooltip: () => null,
}));

import GoalDetailScreen from './GoalDetailScreen';

describe('AI scenario contribution proposal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    Object.defineProperty(HTMLElement.prototype, 'scrollIntoView', {
      configurable: true,
      value: scrollIntoView,
    });
    window.history.replaceState({}, '', '/goals/goal-1?proposedMonthlyContribution=1050');
  });

  it('opens a reviewable draft and does not save when cancelled', async () => {
    render(<GoalDetailScreen />);

    await waitFor(() => {
      expect(screen.getByText(/AI scenario draft: \$1,050\/mo/i)).toBeInTheDocument();
    });
    expect(screen.getByPlaceholderText('e.g. 1500')).toHaveValue('1050');
    await waitFor(() => expect(scrollIntoView).toHaveBeenCalledWith({ behavior: 'smooth', block: 'center' }));

    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(updateGoal).not.toHaveBeenCalled();
  });

  it('saves the AI proposal only after the user confirms Save Plan', async () => {
    render(<GoalDetailScreen />);

    await waitFor(() => expect(screen.getByRole('button', { name: 'Save Plan' })).toBeInTheDocument());
    fireEvent.click(screen.getByRole('button', { name: 'Save Plan' }));

    await waitFor(() => {
      expect(updateGoal).toHaveBeenCalledWith({
        id: 'goal-1',
        data: { monthlyContribution: 1050, paymentFrequency: 'monthly', targetDate: null },
      });
    });
  });
});