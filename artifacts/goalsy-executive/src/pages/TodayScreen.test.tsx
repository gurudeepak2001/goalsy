import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, within } from '@testing-library/react';

const mocks = vi.hoisted(() => ({
  navigate: vi.fn(),
  mission: null as any,
  goals: [] as any[],
}));

vi.mock('wouter', () => ({ useLocation: () => ['/today', mocks.navigate] }));
vi.mock('@clerk/react', () => ({
  useUser: () => ({ user: { fullName: 'Alex Laurent', unsafeMetadata: {} } }),
}));
vi.mock('@tanstack/react-query', () => ({
  useQueryClient: () => ({ invalidateQueries: vi.fn() }),
}));
vi.mock('@workspace/api-client-react', () => ({
  getGetTodayMissionQueryKey: () => ['/api/missions/today'],
  useGetTodayMission: () => ({ data: mocks.mission, isLoading: false }),
  useCompleteMission: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useSkipMission: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useListGoals: () => ({ data: mocks.goals }),
  useListBills: () => ({ data: [] }),
  useListBriefings: () => ({ data: [] }),
  useGetScore: () => ({ data: { score: 842 } }),
  useGetPlaidAccounts: () => ({
    data: {
      accounts: [
        { id: 'checking', itemId: 'item', name: 'Plaid Checking', officialName: null, mask: '0000', type: 'depository', subtype: 'checking', currentBalance: 110, availableBalance: 100, currencyCode: 'USD' },
        { id: 'saving', itemId: 'item', name: 'Plaid Saving', officialName: null, mask: '1111', type: 'depository', subtype: 'savings', currentBalance: 210, availableBalance: 200, currencyCode: 'USD' },
        { id: 'cd', itemId: 'item', name: 'Plaid CD', officialName: null, mask: '2222', type: 'depository', subtype: 'cd', currentBalance: 1_000, availableBalance: 1_000, currencyCode: 'USD' },
        { id: 'credit', itemId: 'item', name: 'Plaid Credit Card', officialName: null, mask: '3333', type: 'credit', subtype: 'credit card', currentBalance: 410, availableBalance: 4_590, currencyCode: 'USD' },
      ],
    },
  }),
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
vi.mock('@/hooks/use-toast', () => ({ toast: vi.fn() }));

import TodayScreen from './TodayScreen';

describe('Today linked balance details', () => {
  it('opens an asset and debt breakdown from the net balance card', () => {
    render(<TodayScreen />);

    expect(screen.getByText('$910')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'View linked balance details' }));

    const dialog = screen.getByRole('dialog', { name: 'Linked Balance Details' });
    expect(within(dialog).getByText('$1,320')).toBeInTheDocument();
    expect(within(dialog).getByText('$410')).toBeInTheDocument();
    expect(within(dialog).getByText('$910')).toBeInTheDocument();
    expect(within(dialog).getByText('−$410.00')).toHaveClass('text-[#EF4444]');
    expect(within(dialog).getByText('Plaid Credit Card')).toBeInTheDocument();
  });

  it('opens the highest-priority goal contribution flow for the savings mission', () => {
    mocks.navigate.mockReset();
    mocks.mission = {
      id: 'mission-savings',
      title: 'Top up your highest-priority goal',
      description: 'Add progress to your top goal.',
      category: 'savings',
      status: 'pending',
    };
    mocks.goals = [
      { id: 'lower-goal', name: 'Vacation', status: 'active', priority: 3, createdAt: '2026-01-01', targetAmount: 2_000, currentAmount: 100 },
      { id: 'top-goal', name: 'Emergency Fund', status: 'active', priority: 1, createdAt: '2026-02-01', targetAmount: 10_000, currentAmount: 2_000 },
    ];

    render(<TodayScreen />);
    fireEvent.click(screen.getByRole('button', { name: 'Add progress to Emergency Fund' }));

    expect(mocks.navigate).toHaveBeenCalledWith('/goals/top-goal?action=contribute&missionId=mission-savings');
  });
});