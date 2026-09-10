import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';

const mocks = vi.hoisted(() => ({
  logProgress: vi.fn(),
  completeMission: vi.fn(),
  navigate: vi.fn(),
  invalidateQueries: vi.fn(),
}));

vi.mock('@capacitor/core', () => ({
  Capacitor: { isNativePlatform: () => false, getPlatform: () => 'web' },
}));
vi.mock('@capacitor/keyboard', () => ({
  Keyboard: { addListener: vi.fn().mockResolvedValue({ remove: vi.fn() }) },
}));
vi.mock('wouter', () => ({
  useParams: () => ({ id: 'top-goal' }),
  useLocation: () => ['/goals/top-goal', mocks.navigate],
}));
vi.mock('@tanstack/react-query', () => ({
  useQueryClient: () => ({
    invalidateQueries: mocks.invalidateQueries,
    setQueryData: vi.fn(),
  }),
}));
vi.mock('@/hooks/use-toast', () => ({ toast: vi.fn() }));
vi.mock('@workspace/api-client-react', () => ({
  useGetGoal: () => ({
    data: {
      id: 'top-goal',
      userId: 'user-1',
      name: 'Emergency Fund',
      type: 'emergency_fund',
      targetAmount: 10_000,
      currentAmount: 2_000,
      openingAmount: 1_500,
      monthlyContribution: 200,
      paymentFrequency: 'monthly',
      targetDate: '2027-12-31',
      status: 'active',
      priority: 1,
      createdAt: '2026-08-01T12:00:00.000Z',
      updatedAt: '2026-09-01T12:00:00.000Z',
    },
    isLoading: false,
  }),
  useUpdateGoal: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useDeleteGoal: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useGetFinancialProfile: () => ({ data: { profile: null } }),
  useListGoalProgress: () => ({ data: [] }),
  useCreateGoalProgress: () => ({ mutateAsync: mocks.logProgress, isPending: false }),
  useCompleteMission: () => ({ mutateAsync: mocks.completeMission, isPending: false }),
  getListGoalsQueryKey: () => ['goals'],
  getGetGoalQueryKey: (id: string) => ['goal', id],
  getListGoalProgressQueryKey: (id: string) => ['goal-progress', id],
  getGetTodayMissionQueryKey: () => ['mission-today'],
  getGetScoreQueryKey: () => ['score'],
}));
vi.mock('@/components/AppHeader', () => ({ default: () => null }));
vi.mock('@/components/AppShell', () => ({
  default: ({ children }: { children: React.ReactNode }) => <main>{children}</main>,
}));
vi.mock('@/components/AppModal', () => ({
  default: ({ open, title, children }: { open: boolean; title: string; children: React.ReactNode }) => (
    open ? <section role="dialog" aria-label={title}><h2>{title}</h2>{children}</section> : null
  ),
}));
vi.mock('@/components/ExecutiveButton', () => ({
  default: ({ text, onClick, disabled }: { text: string; onClick?: () => void; disabled?: boolean }) => (
    <button type="button" onClick={onClick} disabled={disabled}>{text}</button>
  ),
}));
vi.mock('@/components/ExecutiveInput', () => ({
  default: ({ label, value, onChange }: {
    label?: string;
    value?: string;
    onChange?: React.ChangeEventHandler<HTMLInputElement>;
  }) => <label>{label}<input aria-label={label} value={value} onChange={onChange} /></label>,
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

describe('goal contribution mission flow', () => {
  beforeEach(() => {
    window.history.replaceState({}, '', '/goals/top-goal?action=contribute&missionId=mission-savings');
    mocks.logProgress.mockReset().mockResolvedValue({});
    mocks.completeMission.mockReset().mockResolvedValue({});
    mocks.navigate.mockReset();
    mocks.invalidateQueries.mockReset().mockResolvedValue(undefined);
  });

  it('saves goal progress before completing the mission and refreshing the score', async () => {
    render(<GoalDetailScreen />);

    const dialog = await screen.findByRole('dialog', { name: 'Add Progress to Emergency Fund' });
    expect(dialog).toHaveTextContent('$2,000 of $10,000');
    expect(screen.getByRole('textbox', { name: 'Amount added' })).toHaveValue('46');

    fireEvent.change(screen.getByRole('textbox', { name: 'Amount added' }), { target: { value: '75' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save Progress & Complete Mission' }));

    await waitFor(() => expect(mocks.completeMission).toHaveBeenCalledWith({ id: 'mission-savings' }));
    expect(mocks.logProgress).toHaveBeenCalledWith({
      id: 'top-goal',
      data: expect.objectContaining({ weeklyDeposit: 75 }),
    });
    expect(mocks.logProgress.mock.invocationCallOrder[0]).toBeLessThan(
      mocks.completeMission.mock.invocationCallOrder[0],
    );
    expect(mocks.invalidateQueries).toHaveBeenCalledWith({ queryKey: ['score'] });
    expect(mocks.navigate).toHaveBeenCalledWith('/today');
  });
});