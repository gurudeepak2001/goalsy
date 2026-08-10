/**
 * Tests that the ConfirmForm element calls scrollIntoView when it mounts,
 * keeping the progress-log form above the soft keyboard on mobile viewports.
 *
 * Viewport is set to 375 × 667 px (iPhone SE) to match a typical small mobile
 * screen where the keyboard would cover the bottom portion of the page.
 *
 * Coverage:
 *   1. Timer fallback path (isNativePlatform = false, no visualViewport resize)
 *   2. Native Capacitor keyboardDidShow path (isNativePlatform = true)
 *   3. visualViewport resize path (isolated, before timer fires)
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, act } from '@testing-library/react';
import React from 'react';

// ── Hoisted mutable flags (must be hoisted alongside vi.mock calls) ────────────

// `isNativePlatform` is toggled per-suite so the same mock factory works for
// both the web (false) and Capacitor (true) test scenarios.
const nativePlatformFlag = vi.hoisted(() => ({ value: false }));

// A shared store that the @capacitor/keyboard mock writes into so individual
// tests can retrieve and invoke the registered listener.
const keyboardListenerStore = vi.hoisted(() => ({
  listeners: new Map<string, () => void>(),
}));

// ── Mock heavy dependencies pulled in by GoalDetailScreen ─────────────────────

vi.mock('@capacitor/core', () => ({
  Capacitor: { isNativePlatform: () => nativePlatformFlag.value },
}));

// Capacitor Keyboard plugin – capture the listener so tests can fire it.
vi.mock('@capacitor/keyboard', () => ({
  Keyboard: {
    addListener: (event: string, cb: () => void) => {
      keyboardListenerStore.listeners.set(event, cb);
      return Promise.resolve({ remove: vi.fn() });
    },
  },
}));

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
import { ConfirmForm, WeeklyMilestoneRow } from '../pages/GoalDetailScreen';
import type { WeekMilestone } from '../pages/GoalDetailScreen';
import { fireEvent } from '@testing-library/react';

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Simulate a 375px-wide mobile viewport (iPhone SE width). */
function setMobileViewport() {
  Object.defineProperty(window, 'innerWidth', { writable: true, configurable: true, value: 375 });
  Object.defineProperty(window, 'innerHeight', { writable: true, configurable: true, value: 667 });
}

const defaultProps = {
  expectedAmount: 5000,
  confirmValue: '',
  onConfirmChange: vi.fn(),
  onSave: vi.fn(),
  onCancelConfirm: vi.fn(),
  isSaving: false,
} as const;

// ── Tests: timer fallback path (web) ──────────────────────────────────────────

describe('ConfirmForm – keyboard visibility (timer fallback, web path)', () => {
  let scrollIntoViewMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    nativePlatformFlag.value = false;
    setMobileViewport();
    scrollIntoViewMock = vi.fn();
    window.HTMLElement.prototype.scrollIntoView = scrollIntoViewMock as unknown as typeof HTMLElement.prototype.scrollIntoView;
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('calls scrollIntoView on mount at a 375 px viewport so the form stays above the keyboard', async () => {
    render(<ConfirmForm {...defaultProps} />);

    // The component defers scrollIntoView by 150 ms to let the keyboard animate in.
    // Advance past that delay and flush all effects.
    await act(async () => {
      vi.advanceTimersByTime(200);
    });

    expect(scrollIntoViewMock).toHaveBeenCalledOnce();
    expect(scrollIntoViewMock).toHaveBeenCalledWith({ behavior: 'smooth', block: 'nearest' });
  });

  it('does NOT call scrollIntoView before the keyboard-delay timer fires', () => {
    render(<ConfirmForm {...defaultProps} />);

    // Timer has not fired yet – scrollIntoView must not have been called
    expect(scrollIntoViewMock).not.toHaveBeenCalled();
  });
});

// ── Tests: native Capacitor keyboardDidShow path ───────────────────────────────

describe('ConfirmForm – keyboard visibility (Capacitor native path)', () => {
  let scrollIntoViewMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    // Enable native platform so the component registers a keyboardDidShow listener.
    nativePlatformFlag.value = true;
    keyboardListenerStore.listeners.clear();
    setMobileViewport();
    scrollIntoViewMock = vi.fn();
    window.HTMLElement.prototype.scrollIntoView = scrollIntoViewMock as unknown as typeof HTMLElement.prototype.scrollIntoView;
    // Use fake timers but do NOT advance them – the native event should fire
    // independently of the 150 ms timer fallback.
    vi.useFakeTimers();
  });

  afterEach(() => {
    nativePlatformFlag.value = false;
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('calls scrollIntoView when keyboardDidShow fires via the Capacitor plugin listener', async () => {
    render(<ConfirmForm {...defaultProps} />);

    // Flush the dynamic import promise and the addListener promise so the
    // listener is registered before we try to invoke it.
    await act(async () => {
      // Two rounds of microtask flushing: one for `import('@capacitor/keyboard')`
      // and one for the `.then(({ Keyboard }) => Keyboard.addListener(...).then(...))`.
      await Promise.resolve();
      await Promise.resolve();
      await Promise.resolve();
    });

    // Verify the listener was registered by the component.
    expect(keyboardListenerStore.listeners.has('keyboardDidShow')).toBe(true);

    // Simulate the native keyboard-did-show event.
    await act(async () => {
      keyboardListenerStore.listeners.get('keyboardDidShow')!();
    });

    expect(scrollIntoViewMock).toHaveBeenCalledWith({ behavior: 'smooth', block: 'nearest' });
  });

  it('scrollIntoView is NOT called before keyboardDidShow fires (native path)', async () => {
    render(<ConfirmForm {...defaultProps} />);

    // Flush the dynamic import so the listener is registered, but do NOT
    // advance the timer and do NOT fire the event.
    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
      await Promise.resolve();
    });

    // Timer has not advanced and the event has not fired – must be silent.
    expect(scrollIntoViewMock).not.toHaveBeenCalled();
  });

  it('timer fallback calls scrollIntoView on native when keyboardDidShow never arrives', async () => {
    // This is the key regression guard for task #24:
    // on native, if the Capacitor keyboard event never fires (e.g. plugin bug,
    // timing issue, or unsupported OS version), the 150 ms unconditional timer
    // must still scroll the form into view so it is never left hidden.

    // Suppress visualViewport so it cannot be the one to trigger the scroll –
    // only the timer fallback should satisfy the assertion.
    const originalVV = window.visualViewport;
    Object.defineProperty(window, 'visualViewport', { configurable: true, value: null });

    try {
      render(<ConfirmForm {...defaultProps} />);

      // Flush the dynamic import microtasks so the listener registration
      // completes, but do NOT invoke the keyboardDidShow listener.
      await act(async () => {
        await Promise.resolve();
        await Promise.resolve();
        await Promise.resolve();
      });

      // Listener registered but never fired – scrollIntoView must still be silent.
      expect(scrollIntoViewMock).not.toHaveBeenCalled();

      // Advance past the 150 ms timer — the fallback must now fire.
      await act(async () => {
        vi.advanceTimersByTime(200);
      });

      expect(scrollIntoViewMock).toHaveBeenCalledWith({ behavior: 'smooth', block: 'nearest' });
    } finally {
      Object.defineProperty(window, 'visualViewport', { configurable: true, value: originalVV });
    }
  });
});

// ── Tests: visualViewport resize path ─────────────────────────────────────────

describe('ConfirmForm – keyboard visibility (visualViewport resize path)', () => {
  let scrollIntoViewMock: ReturnType<typeof vi.fn>;
  let originalVisualViewport: typeof window.visualViewport;

  beforeEach(() => {
    nativePlatformFlag.value = false;
    setMobileViewport();
    scrollIntoViewMock = vi.fn();
    window.HTMLElement.prototype.scrollIntoView = scrollIntoViewMock as unknown as typeof HTMLElement.prototype.scrollIntoView;

    // Provide a minimal EventTarget-based visualViewport so the resize event
    // can be dispatched without advancing the timer.
    originalVisualViewport = window.visualViewport;
    const vv = new EventTarget() as EventTarget & { width: number; height: number };
    vv.width = 375;
    vv.height = 667;
    Object.defineProperty(window, 'visualViewport', {
      configurable: true,
      value: vv,
    });

    vi.useFakeTimers();
  });

  afterEach(() => {
    Object.defineProperty(window, 'visualViewport', {
      configurable: true,
      value: originalVisualViewport,
    });
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('calls scrollIntoView when visualViewport fires a resize event (before the 150 ms timer)', async () => {
    render(<ConfirmForm {...defaultProps} />);

    // Dispatch a resize event on the mocked visualViewport – keyboard opened.
    await act(async () => {
      window.visualViewport!.dispatchEvent(new Event('resize'));
    });

    // The visualViewport path should have fired scrollIntoView already,
    // before any timer advance.
    expect(scrollIntoViewMock).toHaveBeenCalledWith({ behavior: 'smooth', block: 'nearest' });
  });
});

// ── WeeklyMilestoneRow – post-save state transition ───────────────────────────

describe('WeeklyMilestoneRow – post-save state transition', () => {
  const milestone: WeekMilestone = {
    weekIndex: 1,
    weekDate: new Date('2026-01-07'),
    dateLabel: 'Jan 7, 26',
    expectedAmount: 5000,
    status: 'behind',
    isPast: true,
  };

  beforeEach(() => {
    nativePlatformFlag.value = false;
    // ConfirmForm calls scrollIntoView on mount; provide a no-op so jsdom doesn't error
    window.HTMLElement.prototype.scrollIntoView = vi.fn() as unknown as typeof HTMLElement.prototype.scrollIntoView;
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('shows the confirm form when isConfirming=true and hides it after save with confirmed state', async () => {
    const onSave = vi.fn();
    const onConfirmChange = vi.fn();

    const { rerender, getByText, queryByText } = render(
      <WeeklyMilestoneRow
        milestone={milestone}
        color="#22C55E"
        isHistoryConfirmed={false}
        isConfirming={true}
        confirmValue="4800"
        onConfirmChange={onConfirmChange}
        onTap={vi.fn()}
        onSave={onSave}
        onCancelConfirm={vi.fn()}
        isSaving={false}
      />,
    );

    // Form should be visible: the question prompt is present
    expect(getByText(/how much have you actually saved/i)).toBeInTheDocument();

    // Clicking Save triggers onSave
    fireEvent.click(getByText('Save'));
    expect(onSave).toHaveBeenCalledOnce();

    // Simulate parent updating state after a successful save:
    // form closes and the row switches to confirmed mode
    rerender(
      <WeeklyMilestoneRow
        milestone={milestone}
        color="#22C55E"
        isHistoryConfirmed={true}
        historyAmount={4800}
        isConfirming={false}
        confirmValue=""
        onConfirmChange={onConfirmChange}
        onTap={vi.fn()}
        onSave={onSave}
        onCancelConfirm={vi.fn()}
        isSaving={false}
      />,
    );

    // Form is gone – no Save button and no prompt text
    expect(queryByText('Save')).not.toBeInTheDocument();
    expect(queryByText(/how much have you actually saved/i)).not.toBeInTheDocument();

    // The row is in confirmed state – the date label is still rendered
    expect(getByText('Jan 7, 26')).toBeInTheDocument();
  });
});
