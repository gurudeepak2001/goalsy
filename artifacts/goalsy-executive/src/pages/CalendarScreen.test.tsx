import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, within } from '@testing-library/react';

const markBriefingViewed = vi.fn().mockResolvedValue(undefined);
const setQueryData = vi.fn();
const invalidateQueries = vi.fn().mockResolvedValue(undefined);

vi.mock('wouter', () => ({ useLocation: () => ['/calendar', vi.fn()] }));
vi.mock('@tanstack/react-query', () => ({
  useQueryClient: () => ({ invalidateQueries, setQueryData }),
}));
vi.mock('@workspace/api-client-react', () => ({
  getListBillsQueryKey: () => ['/api/bills'],
  getListBriefingsQueryKey: () => ['/api/briefings'],
  usePayBill: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useMarkBriefingViewed: () => ({ mutateAsync: markBriefingViewed }),
  useListGoals: () => ({ data: [] }),
  useGetTodayMission: () => ({
    data: {
      id: 'mission-1',
      userId: 'user-1',
      missionDate: '2026-09-10',
      title: 'Review emergency fund progress',
      description: 'Compare this week’s saved amount with your emergency fund target.',
      category: 'savings',
      status: 'pending',
      skipReason: null,
      completedAt: null,
      createdAt: '2026-09-10T12:00:00.000Z',
    },
  }),
  useListBills: () => ({
    data: [{
      id: 'bill-1',
      userId: 'user-1',
      name: 'Electric bill',
      amount: 125,
      dueDate: '2026-09-15',
      isPaid: false,
    }],
  }),
  useListBriefings: () => ({
    data: [{
      id: 'briefing-1',
      userId: 'user-1',
      title: 'Emergency Fund Review',
      summary: 'Review progress toward the saved goal.',
      scheduledDate: '2026-09-20',
      type: 'goal_review',
      contentVersion: 'current-version',
      viewedContentVersion: 'older-version',
    }],
  }),
}));
vi.mock('@/components/AppHeader', () => ({ default: () => null }));
vi.mock('@/components/AppShell', () => ({
  default: ({ children }: { children: React.ReactNode }) => <main>{children}</main>,
}));
vi.mock('@/components/AppModal', () => ({
  default: ({ open, title, children }: { open: boolean; title: string; children: React.ReactNode }) => (
    open ? <section role="dialog" aria-label={title}>{children}</section> : null
  ),
}));
vi.mock('@/hooks/use-toast', () => ({ toast: vi.fn() }));

import CalendarScreen from './CalendarScreen';

describe('CalendarScreen data integrity', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows saved API records without invented financial activity', () => {
    render(<CalendarScreen />);

    expect(screen.getByText('Review emergency fund progress')).toBeInTheDocument();
    expect(screen.getByText('Electric bill')).toBeInTheDocument();
    expect(screen.getByText('$125')).toBeInTheDocument();
    expect(screen.getByText('Emergency Fund Review')).toBeInTheDocument();

    expect(screen.queryByText(/Wealthfront|4012|1\.2%|Optimize Debt Interest|Autopay Preview/i)).not.toBeInTheDocument();
  });

  it('formats briefing details as readable bullet points', () => {
    render(<CalendarScreen />);
    fireEvent.click(screen.getByRole('button', { name: /Emergency Fund Review/i }));

    const dialog = screen.getByRole('dialog', { name: 'Emergency Fund Review' });
    expect(within(dialog).getByText('Goal Review')).toBeInTheDocument();
    expect(within(dialog).getByText(/Scheduled for Sunday, September 20/)).toBeInTheDocument();
    expect(within(dialog).getByText('Review progress toward the saved goal')).toBeInTheDocument();
  });

  it('keeps briefings visible and records the server content version when opened', async () => {
    render(<CalendarScreen />);
    const card = screen.getByRole('button', { name: /Emergency Fund Review/i });
    expect(within(card).getByText('Updated')).toBeInTheDocument();

    fireEvent.click(card);
    expect(screen.getByRole('dialog', { name: 'Emergency Fund Review' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Emergency Fund Review/i })).toBeInTheDocument();
    expect(markBriefingViewed).toHaveBeenCalledWith({
      id: 'briefing-1',
      data: { contentVersion: 'current-version' },
    });
  });
});