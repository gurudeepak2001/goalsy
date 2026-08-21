import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, within } from '@testing-library/react';

const mocks = vi.hoisted(() => ({
  navigate: vi.fn(),
  signOut: vi.fn(),
  updatePref: vi.fn(),
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
  useQueryClient: () => ({ invalidateQueries: vi.fn() }),
}));

vi.mock('@workspace/api-client-react', () => ({
  getListNotificationPreferencesQueryKey: () => ['notification-preferences'],
  useGetScore: () => ({ data: { score: 842, tier: 'Command', computedAt: '2026-08-21T12:00:00.000Z' } }),
  useGetFinancialProfile: () => ({ data: mocks.financialProfile }),
  useGetMissionStreak: () => ({ data: mocks.missionStreak }),
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
vi.mock('@/components/ExecutiveButton', () => ({ default: ({ text }: { text: string }) => <button type="button">{text}</button> }));
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
});