import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';

const { navigate, toast, refetchGoals, refetchProfile, refetchScore } = vi.hoisted(() => ({
  navigate: vi.fn(),
  toast: vi.fn(),
  refetchGoals: vi.fn().mockResolvedValue(undefined),
  refetchProfile: vi.fn().mockResolvedValue(undefined),
  refetchScore: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('wouter', () => ({ useLocation: () => ['/ai-home', navigate] }));
vi.mock('@/hooks/use-toast', () => ({ toast }));
vi.mock('@/components/AppHeader', () => ({ default: () => null }));
vi.mock('@/components/AppShell', () => ({ default: ({ children }: { children: React.ReactNode }) => <main>{children}</main> }));
vi.mock('@workspace/api-client-react', () => ({
  useListGoals: () => ({
    data: [{
      id: 'goal-1', name: 'Home Down Payment', type: 'home_purchase', targetAmount: 50_000,
      currentAmount: 10_000, monthlyContribution: 500, status: 'active', createdAt: '2026-01-01T00:00:00.000Z',
    }],
    isLoading: false, isError: false, isFetching: false, refetch: refetchGoals,
  }),
  useGetFinancialProfile: () => ({
    data: { profile: { annualIncome: 120_000, monthlyExpenses: 4_000, netWorth: 30_000, savingsRate: 500 } },
    isLoading: false, isError: false, isFetching: false, refetch: refetchProfile,
  }),
  useGetScore: () => ({ isLoading: false, isError: false, isFetching: false, refetch: refetchScore }),
}));

import AIHomeScreen from './AIHomeScreen';

describe('AIHomeScreen interactions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('lets users adjust the scenario without silently changing their goal', () => {
    render(<AIHomeScreen />);

    expect(screen.getByText(/If you add \$500\/mo/i)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Increase monthly boost' }));
    expect(screen.getByText(/If you add \$550\/mo/i)).toBeInTheDocument();
    expect(screen.getByText(/Review and save the proposed amount/i)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /Adjust Home Down Payment/i }));
    expect(navigate).toHaveBeenCalledWith('/goals/goal-1?proposedMonthlyContribution=1050');
  });

  it('opens the data behind recommendations and hides Refresh after a successful update', async () => {
    render(<AIHomeScreen />);

    fireEvent.click(screen.getByRole('button', { name: /Update savings plan/i }));
    expect(navigate).toHaveBeenCalledWith('/financial-connection?mode=edit');

    fireEvent.click(screen.getByRole('button', { name: /Review financial health/i }));
    expect(navigate).toHaveBeenCalledWith('/financial-health');

    fireEvent.click(screen.getByRole('button', { name: /Refresh/i }));
    expect(refetchGoals).toHaveBeenCalledOnce();
    expect(refetchProfile).toHaveBeenCalledOnce();
    expect(refetchScore).toHaveBeenCalledOnce();
    await waitFor(() => expect(screen.queryByRole('button', { name: /Refresh/i })).not.toBeInTheDocument());
  });
});