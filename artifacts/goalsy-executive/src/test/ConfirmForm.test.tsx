/**
 * Tests that the ConfirmForm element calls scrollIntoView when it mounts,
 * keeping the progress-log form above the soft keyboard on mobile viewports.
 *
 * Viewport is set to 375 × 667 px (iPhone SE) to match a typical small mobile
 * screen where the keyboard would cover the bottom portion of the page.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, act } from '@testing-library/react';
import React from 'react';

// ── Mock heavy dependencies pulled in by GoalDetailScreen ─────────────────────

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
vi.mock('@/components/AppShell', () => ({ default: ({ children }: { children: React.ReactNode }) => <>{children}</> }));
vi.mock('@/components/ExecutiveButton', () => ({
  default: ({ text, onClick }: { text: string; onClick?: () => void }) => (
    <button type="button" onClick={onClick}>{text}</button>
  ),
}));
vi.mock('@/components/ExecutiveInput', () => ({
  default: ({ placeholder, value, onChange }: { placeholder?: string; value?: string; onChange?: React.ChangeEventHandler<HTMLInputElement> }) => (
    <input placeholder={placeholder} value={value} onChange={onChange} />
  ),
}));

vi.mock('recharts', () => ({
  ResponsiveContainer: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  LineChart: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  Line: () => null,
  XAxis: () => null,
  YAxis: () => null,
  Tooltip: () => null,
}));

// ── Import the component under test ──────────────────────────────────────────

// Import after all mocks are set up
import { ConfirmForm } from '../pages/GoalDetailScreen';

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Simulate a 375px-wide mobile viewport (iPhone SE width). */
function setMobileViewport() {
  Object.defineProperty(window, 'innerWidth', { writable: true, configurable: true, value: 375 });
  Object.defineProperty(window, 'innerHeight', { writable: true, configurable: true, value: 667 });
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('ConfirmForm – keyboard visibility', () => {
  let scrollIntoViewMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    setMobileViewport();
    // jsdom does not implement scrollIntoView; provide a spy so we can assert it
    scrollIntoViewMock = vi.fn();
    window.HTMLElement.prototype.scrollIntoView = scrollIntoViewMock;
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('calls scrollIntoView on mount at a 375 px viewport so the form stays above the keyboard', async () => {
    render(
      <ConfirmForm
        expectedAmount={5000}
        confirmValue=""
        onConfirmChange={vi.fn()}
        onSave={vi.fn()}
        onCancelConfirm={vi.fn()}
        isSaving={false}
      />,
    );

    // The component defers scrollIntoView by 150 ms to let the keyboard animate in.
    // Advance past that delay and flush all effects.
    await act(async () => {
      vi.advanceTimersByTime(200);
    });

    expect(scrollIntoViewMock).toHaveBeenCalledOnce();
    expect(scrollIntoViewMock).toHaveBeenCalledWith({ behavior: 'smooth', block: 'nearest' });
  });

  it('does NOT call scrollIntoView before the keyboard-delay timer fires', () => {
    render(
      <ConfirmForm
        expectedAmount={5000}
        confirmValue=""
        onConfirmChange={vi.fn()}
        onSave={vi.fn()}
        onCancelConfirm={vi.fn()}
        isSaving={false}
      />,
    );

    // Timer has not fired yet – scrollIntoView must not have been called
    expect(scrollIntoViewMock).not.toHaveBeenCalled();
  });
});
