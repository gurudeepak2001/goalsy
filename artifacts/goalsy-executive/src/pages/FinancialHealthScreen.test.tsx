import { fireEvent, render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import FinancialHealthScreen from './FinancialHealthScreen';
import {
  useGetFinancialProfile,
  useGetPlaidAccounts,
  useListGoals,
  useListExpenses,
  useListBills,
  useGetScore,
  useGetScoreHistory,
} from '@workspace/api-client-react';

const mocks = vi.hoisted(() => ({
  navigate: vi.fn(),
}));

vi.mock('wouter', () => ({
  useLocation: () => ['/', mocks.navigate],
}));

vi.mock('@/components/AppHeader', () => ({ default: () => null }));
vi.mock('@/components/AppShell', () => ({
  default: ({ children }: { children: React.ReactNode }) => <main>{children}</main>,
}));

vi.mock('@workspace/api-client-react', () => ({
  useGetFinancialProfile: vi.fn(),
  useGetPlaidAccounts: vi.fn(),
  useListGoals: vi.fn(),
  useListExpenses: vi.fn(),
  useListBills: vi.fn(),
  useGetScore: vi.fn(),
  useGetScoreHistory: vi.fn(),
}));

vi.mock('recharts', async () => {
  const OriginalRecharts = await vi.importActual('recharts');
  return {
    ...OriginalRecharts,
    ResponsiveContainer: ({ children }: any) => <div>{children}</div>,
  };
});

describe('FinancialHealthScreen', () => {
  beforeEach(() => {
    mocks.navigate.mockReset();
    vi.mocked(useGetFinancialProfile).mockReturnValue({
      data: { profile: { annualIncome: 120000, monthlyExpenses: 5000, emergencyFundMonths: 6 } },
      isLoading: false,
      isError: false,
    } as any);

    vi.mocked(useGetPlaidAccounts).mockReturnValue({
      data: {
        accounts: [
          { type: 'credit', currentBalance: 1000, creditLimit: 10000 },
          { type: 'loan', currentBalance: 5000 },
        ],
      },
      isLoading: false,
      isError: false,
    } as any);

    vi.mocked(useListGoals).mockReturnValue({
      data: [{ id: '1', type: 'emergency_fund', currentAmount: 5000, targetAmount: 10000 }],
      isLoading: false,
      isError: false,
    } as any);

    vi.mocked(useListExpenses).mockReturnValue({
      data: [{ amount: 2000, frequency: 'monthly', category: 'Food' }],
      isLoading: false,
      isError: false,
    } as any);

    vi.mocked(useListBills).mockReturnValue({
      data: [{ id: '1', name: 'Water', amount: 100, isPaid: false, dueDate: '2026-08-15' }],
      isLoading: false,
      isError: false,
    } as any);

    vi.mocked(useGetScore).mockReturnValue({
      data: { score: 750, tier: 'Good' },
      isLoading: false,
      isError: false,
    } as any);

    vi.mocked(useGetScoreHistory).mockReturnValue({
      data: [{ score: 740 }, { score: 750 }],
    } as any);
  });

  it('renders all sections with live data', () => {
    render(<FinancialHealthScreen />);

    // Cash Flow uses the saved monthly estimate: 10000 income - 5000 expenses
    expect(screen.getByText('+$5,000')).toBeInTheDocument();
    expect(screen.getByText('Estimated expenses: $5,000')).toBeInTheDocument();
    
    // Goalsy Score
    expect(screen.getByText('750')).toBeInTheDocument();
    expect(screen.getByText('Good')).toBeInTheDocument();

    // Debt & Utilization
    // 1000 credit + 5000 loan = 6000 total debt
    expect(screen.getByText('$6,000')).toBeInTheDocument();
    // 1000 / 10000 = 10%
    expect(screen.getByText('10.0%')).toBeInTheDocument();
    
    // Emergency Fund
    expect(screen.getByText('50% Complete')).toBeInTheDocument();
    expect(screen.getByText('$5,000 to go')).toBeInTheDocument();
    expect(screen.getByText('Target: 6 months of expenses ($5,000 per month).')).toBeInTheDocument();

    // Current Expenses
    expect(screen.getAllByText('$2,000')).toHaveLength(2);
    
    // Upcoming Obligations
    expect(screen.getByText('Water')).toBeInTheDocument();
    expect(screen.getByText('$100')).toBeInTheDocument();
    expect(screen.getByText('Overdue Aug 15')).toBeInTheDocument();
  });

  it('shows unavailable states instead of false healthy claims when APIs fail', () => {
    vi.mocked(useGetFinancialProfile).mockReturnValue({ isLoading: false, isError: true } as any);
    vi.mocked(useGetPlaidAccounts).mockReturnValue({ isLoading: false, isError: true } as any);
    vi.mocked(useListGoals).mockReturnValue({ isLoading: false, isError: true } as any);
    vi.mocked(useListExpenses).mockReturnValue({ isLoading: false, isError: true } as any);
    vi.mocked(useListBills).mockReturnValue({ isLoading: false, isError: true } as any);
    vi.mocked(useGetScore).mockReturnValue({ isLoading: false, isError: true } as any);

    render(<FinancialHealthScreen />);

    expect(screen.getAllByText(/temporarily unavailable/i)).toHaveLength(6);
    expect(screen.queryByText(/all caught up/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/no debt accounts linked/i)).not.toBeInTheDocument();
  });

  it('opens the real detail pages from interactive health sections', () => {
    render(<FinancialHealthScreen />);

    fireEvent.click(screen.getByText('Goalsy Score'));
    expect(mocks.navigate).toHaveBeenCalledWith('/score');

    fireEvent.click(screen.getByText('Emergency Fund'));
    expect(mocks.navigate).toHaveBeenCalledWith('/goals/1');

    fireEvent.click(screen.getByText('Current Expenses'));
    expect(mocks.navigate).toHaveBeenCalledWith('/expenses');

    fireEvent.click(screen.getByRole('button', { name: 'Manage' }));
    expect(mocks.navigate).toHaveBeenCalledWith('/financial-connection');

    fireEvent.click(screen.getByRole('button', { name: 'View Calendar' }));
    expect(mocks.navigate).toHaveBeenCalledWith('/calendar');
  });
});
