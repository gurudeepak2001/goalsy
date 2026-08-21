import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';

const mocks = vi.hoisted(() => ({
  navigate: vi.fn(),
  saveProfile: vi.fn(),
  financialProfile: {
    profile: {
      annualIncome: 100_000,
      monthlyExpenses: 4_000,
      netWorth: null,
      savingsRate: null,
      riskTolerance: null,
      primaryGoalType: null,
    },
  },
}));

vi.mock('wouter', () => ({
  useLocation: () => [window.location.pathname, mocks.navigate],
}));

vi.mock('@workspace/api-client-react', () => ({
  useGetFinancialProfile: () => ({
    data: mocks.financialProfile,
    isLoading: false,
  }),
  useUpdateFinancialProfile: () => ({
    mutateAsync: mocks.saveProfile,
    isPending: false,
  }),
}));

vi.mock('@/components/AppHeader', () => ({ default: () => null }));
vi.mock('@/components/ExecutiveButton', () => ({
  default: ({
    text,
    onClick,
    disabled,
  }: {
    text: string;
    onClick?: () => void;
    disabled?: boolean;
  }) => (
    <button type="button" onClick={onClick} disabled={disabled}>
      {text}
    </button>
  ),
}));
vi.mock('@/hooks/use-toast', () => ({ toast: vi.fn() }));
vi.mock('@/lib/mockData', () => ({
  mockConnectedAccounts: [],
  simulateAsync: vi.fn(),
}));

import FinancialConnectionScreen from './FinancialConnectionScreen';

describe('FinancialConnectionScreen edit mode', () => {
  beforeEach(() => {
    window.history.replaceState({}, '', '/financial-connection?mode=edit');
    mocks.navigate.mockReset();
    mocks.saveProfile.mockReset().mockResolvedValue(undefined);
  });

  it('pre-populates the profile and saves directly back to Strategic Intelligence', async () => {
    render(<FinancialConnectionScreen />);

    expect(
      screen.getByRole('heading', { name: /Update Your Financial Picture/i }),
    ).toBeInTheDocument();
    expect(screen.queryByText('Step 02: Financial Profile')).not.toBeInTheDocument();
    expect(screen.getByDisplayValue('100000')).toBeInTheDocument();
    expect(screen.getByDisplayValue('4000')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Save Changes' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeInTheDocument();
    expect(screen.queryByText('Secure Data')).not.toBeInTheDocument();

    fireEvent.change(screen.getByPlaceholderText('120000'), {
      target: { value: '120000' },
    });
    fireEvent.change(screen.getByPlaceholderText('4500'), {
      target: { value: '4500' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Save Changes' }));

    await waitFor(() => {
      expect(mocks.saveProfile).toHaveBeenCalledWith({
        data: expect.objectContaining({
          annualIncome: 120_000,
          monthlyExpenses: 4_500,
        }),
      });
      expect(mocks.navigate).toHaveBeenCalledWith('/ai-home');
    });
  });

  it('returns to Strategic Intelligence when cancelled without entering onboarding', () => {
    render(<FinancialConnectionScreen />);

    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));

    expect(mocks.navigate).toHaveBeenCalledWith('/ai-home');
    expect(screen.queryByText('Secure Data')).not.toBeInTheDocument();
  });
});