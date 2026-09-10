import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, within } from '@testing-library/react';

const mocks = vi.hoisted(() => ({
  navigate: vi.fn(),
  signOut: vi.fn(),
  updatePref: vi.fn(),
  hidePlaidAccount: vi.fn(),
  invalidateQueries: vi.fn(),
  plaidConnections: [] as Array<{ id: string; institutionName: string | null; status: string }>,
  plaidAccounts: [] as Array<{
    id: string;
    itemId: string;
    name: string;
    officialName: string | null;
    mask: string | null;
    type: string;
    subtype: string | null;
    currentBalance: number | null;
    availableBalance: number | null;
    creditLimit: number | null;
    currencyCode: string | null;
    minimumPaymentAmount: number | null;
    aprPercentage: number | null;
    aprType: string | null;
    nextPaymentDueDate: string | null;
  }>,
  financialProfile: {
    profile: {
      netWorth: 125_000,
        savingsMilestone100kAt: '2026-08-14T12:00:00.000Z',
    },
  },
    missionStreak: {
      currentStreak: 4,
      longestStreak: 4,
      firstSevenDayStreakAt: null,
    } as {
      currentStreak: number;
      longestStreak: number;
      firstSevenDayStreakAt: string | null;
    },
}));

vi.mock('wouter', () => ({
  useLocation: () => ['/profile', mocks.navigate],
}));

vi.mock('@clerk/react', () => ({
  useUser: () => ({
    user: {
      fullName: 'Alex Laurent',
      hasImage: false,
      unsafeMetadata: {},
      update: vi.fn(),
    },
  }),
  useClerk: () => ({ signOut: mocks.signOut }),
}));

vi.mock('@tanstack/react-query', () => ({
  useQueryClient: () => ({ invalidateQueries: mocks.invalidateQueries }),
}));

vi.mock('@workspace/api-client-react', () => ({
  getListNotificationPreferencesQueryKey: () => ['notification-preferences'],
  useGetScore: () => ({ data: { score: 842, tier: 'Command', computedAt: '2026-08-21T12:00:00.000Z' } }),
  useGetFinancialProfile: () => ({ data: mocks.financialProfile }),
  useGetMissionStreak: () => ({ data: mocks.missionStreak }),
  useGetPlaidAccounts: () => ({ data: { accounts: mocks.plaidAccounts } }),
  useGetPlaidConnections: () => ({ data: { connections: mocks.plaidConnections } }),
  useHidePlaidAccount: () => ({ mutateAsync: mocks.hidePlaidAccount, isPending: false }),
  getGetPlaidAccountsQueryKey: () => ['plaid-accounts'],
  getGetPlaidConnectionsQueryKey: () => ['plaid-connections'],
  useListNotificationPreferences: () => ({ data: [] }),
  useUpdateNotificationPreference: () => ({ mutateAsync: mocks.updatePref }),
}));

vi.mock('@/components/AppHeader', () => ({ default: () => null }));
vi.mock('@/components/AppShell', () => ({
  default: ({ children }: { children: React.ReactNode }) => <main>{children}</main>,
}));
vi.mock('@/components/Avatar', () => ({ default: () => <div /> }));
vi.mock('@/components/CircularScoreRing', () => ({ default: () => <div /> }));
vi.mock('@/components/SectionLabel', () => ({ default: ({ text }: { text: string }) => <h2>{text}</h2> }));
vi.mock('@/components/ExecutiveInput', () => ({ default: () => <input /> }));
vi.mock('@/components/ExecutiveButton', () => ({
  default: ({ text, onClick, disabled }: { text: string; onClick?: () => void; disabled?: boolean }) => (
    <button type="button" onClick={onClick} disabled={disabled}>{text}</button>
  ),
}));
vi.mock('@/components/ui/switch', () => ({ Switch: () => <button type="button">Toggle</button> }));
vi.mock('@/components/AppModal', () => ({
  default: ({
    open,
    title,
    children,
  }: {
    open: boolean;
    title: string;
    children: React.ReactNode;
  }) => (open ? <section role="dialog" aria-label={title}><h2>{title}</h2>{children}</section> : null),
}));
vi.mock('@/hooks/use-toast', () => ({ toast: vi.fn() }));

import ProfileScreen from './ProfileScreen';

describe('ProfileScreen achievements and help', () => {
  beforeEach(() => {
    mocks.financialProfile = {
      profile: {
        netWorth: 125_000,
        savingsMilestone100kAt: '2026-08-14T12:00:00.000Z',
      },
    };
    mocks.missionStreak = {
      currentStreak: 4,
      longestStreak: 4,
      firstSevenDayStreakAt: null,
    };
    mocks.navigate.mockReset();
    mocks.signOut.mockReset();
    mocks.updatePref.mockReset();
    mocks.hidePlaidAccount.mockReset().mockResolvedValue(undefined);
    mocks.invalidateQueries.mockReset().mockResolvedValue(undefined);
    mocks.plaidConnections = [];
    mocks.plaidAccounts = [];
  });

  it('opens a persisted earned savings achievement detail with live profile progress', () => {
    render(<ProfileScreen />);

    fireEvent.click(screen.getByRole('button', { name: /view details for savings milestone/i }));

    const detailDialog = screen.getByRole('dialog', { name: 'Savings Milestone: $100k' });
    expect(detailDialog).toBeInTheDocument();
    expect(within(detailDialog).getByText('$125,000 of $100,000 (100%)')).toBeInTheDocument();
    expect(within(detailDialog).getByText('Date earned: Aug 14, 2026')).toBeInTheDocument();
  });

  it('shows verified consecutive mission streak progress without an invented award date', () => {
    render(<ProfileScreen />);

    fireEvent.click(screen.getByRole('button', { name: /view details for 7-day mission streak/i }));

    const detailDialog = screen.getByRole('dialog', { name: '7-Day Mission Streak' });
    expect(within(detailDialog).getByText('4 of 7 consecutive days')).toBeInTheDocument();
    expect(within(detailDialog).queryByText(/Date earned:/)).not.toBeInTheDocument();
  });

  it('shows the saved first seven-day mission award date after the streak is earned', () => {
    mocks.missionStreak = {
      currentStreak: 8,
      longestStreak: 10,
      firstSevenDayStreakAt: '2026-08-10T09:30:00.000Z',
    };

    render(<ProfileScreen />);

    fireEvent.click(screen.getByRole('button', { name: /view details for 7-day mission streak/i }));

    const detailDialog = screen.getByRole('dialog', { name: '7-Day Mission Streak' });
    expect(within(detailDialog).getByText('8-day current streak · Best: 10 days')).toBeInTheDocument();
    expect(within(detailDialog).getByText('Date earned: Aug 10, 2026')).toBeInTheDocument();
  });

  it('covers every current app feature area in Help & Support without unsupported promises', () => {
    render(<ProfileScreen />);

    fireEvent.click(screen.getByRole('button', { name: 'Help & Support' }));

    const helpDialog = screen.getByRole('dialog', { name: 'Help & Support' });
    expect(helpDialog).toHaveTextContent('Onboarding & Financial Profile');
    expect(helpDialog).toHaveTextContent('Goals & Roadmaps');
    expect(helpDialog).toHaveTextContent('Expenses');
    expect(helpDialog).toHaveTextContent('Bills & Calendar');
    expect(helpDialog).toHaveTextContent('Notifications');
    expect(helpDialog).toHaveTextContent('Strategic Intelligence');
    expect(helpDialog).toHaveTextContent('Goalsy Score');
    expect(helpDialog).toHaveTextContent('Profile & Account Settings');
    expect(helpDialog).not.toHaveTextContent(/Plaid|cancel my subscription/i);

    fireEvent.click(screen.getByRole('button', { name: 'Onboarding & Financial Profile' }));
    expect(helpDialog).toHaveTextContent(/update it any time from Strategic Intelligence/i);
  });

  it('shows credit balances as debt and opens detailed account information', () => {
    mocks.plaidAccounts = [{
      id: 'credit-account',
      itemId: 'plaid-item',
      name: 'Plaid Credit Card',
      officialName: 'Plaid Credit Card',
      mask: '3333',
      type: 'credit',
      subtype: 'credit card',
      currentBalance: 410,
      availableBalance: 4_590,
      creditLimit: 5_000,
      currencyCode: 'USD',
      minimumPaymentAmount: 35,
      aprPercentage: 21.49,
      aprType: 'purchase_apr',
      nextPaymentDueDate: '2026-09-28',
    }];

    render(<ProfileScreen />);
    fireEvent.click(screen.getByRole('button', { name: /Connected Accounts/ }));

    const accountsDialog = screen.getByRole('dialog', { name: 'Connected Accounts' });
    expect(within(accountsDialog).getByText('$410.00 owed')).toHaveClass('text-[#EF4444]');

    fireEvent.click(within(accountsDialog).getByRole('button', { name: 'View details for Plaid Credit Card' }));

    const detailDialog = screen.getByRole('dialog', { name: 'Plaid Credit Card' });
    expect(within(detailDialog).getByText('Current amount owed')).toBeInTheDocument();
    expect(within(detailDialog).getByText('$410.00')).toHaveClass('text-[#EF4444]');
    expect(within(detailDialog).getByText('Available credit')).toBeInTheDocument();
    expect(within(detailDialog).getByText('$4,590.00')).toBeInTheDocument();
    expect(within(detailDialog).getByText('Credit limit')).toBeInTheDocument();
    expect(within(detailDialog).getByText('$5,000.00')).toBeInTheDocument();
    expect(within(detailDialog).getByText('8.2%')).toBeInTheDocument();
    expect(within(detailDialog).getByText('$35.00')).toBeInTheDocument();
    expect(within(detailDialog).getByText('21.49%')).toBeInTheDocument();
    expect(within(detailDialog).getByText('Sep 28, 2026')).toBeInTheDocument();
    expect(within(detailDialog).getByText('•••• 3333')).toBeInTheDocument();
  });

  it('shows distinct institutions and removes only the selected account from Goalsy', async () => {
    mocks.plaidConnections = [
      { id: 'item-1', institutionName: 'Plaid Bank', status: 'active' },
      { id: 'item-2', institutionName: 'Plaid Bank', status: 'active' },
    ];
    mocks.plaidAccounts = [
      {
        id: 'account-1', itemId: 'item-1', name: 'Checking', officialName: null, mask: '1111',
        type: 'depository', subtype: 'checking', currentBalance: 500, availableBalance: 450,
        creditLimit: null, currencyCode: 'USD', minimumPaymentAmount: null, aprPercentage: null,
        aprType: null, nextPaymentDueDate: null,
      },
      {
        id: 'account-2', itemId: 'item-1', name: 'Savings', officialName: null, mask: '2222',
        type: 'depository', subtype: 'savings', currentBalance: 900, availableBalance: 900,
        creditLimit: null, currencyCode: 'USD', minimumPaymentAmount: null, aprPercentage: null,
        aprType: null, nextPaymentDueDate: null,
      },
    ];

    render(<ProfileScreen />);
    expect(screen.getByText('1 institution · 2 accounts')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Connected Accounts/ }));
    fireEvent.click(screen.getByRole('button', { name: 'View details for Checking' }));
    fireEvent.click(screen.getByRole('button', { name: 'Remove from Goalsy' }));
    expect(screen.getByRole('dialog', { name: 'Remove Connected Account?' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Remove Account' }));

    await vi.waitFor(() => expect(mocks.hidePlaidAccount).toHaveBeenCalledWith({ id: 'account-1' }));
    expect(mocks.invalidateQueries).toHaveBeenCalledWith({ queryKey: ['plaid-accounts'] });
  });

  it('labels missing credit liability fields as unavailable', () => {
    mocks.plaidAccounts = [{
      id: 'credit-account',
      itemId: 'plaid-item',
      name: 'Limited Data Card',
      officialName: null,
      mask: null,
      type: 'credit',
      subtype: 'credit card',
      currentBalance: 100,
      availableBalance: null,
      creditLimit: null,
      currencyCode: 'USD',
      minimumPaymentAmount: null,
      aprPercentage: null,
      aprType: null,
      nextPaymentDueDate: null,
    }];

    render(<ProfileScreen />);
    fireEvent.click(screen.getByRole('button', { name: /Connected Accounts/ }));
    fireEvent.click(screen.getByRole('button', { name: 'View details for Limited Data Card' }));

    const detailDialog = screen.getByRole('dialog', { name: 'Limited Data Card' });
    expect(within(detailDialog).getAllByText('Unavailable')).toHaveLength(7);
  });
});