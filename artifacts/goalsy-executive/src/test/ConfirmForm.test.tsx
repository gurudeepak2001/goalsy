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

// `platformFlag` controls the string returned by Capacitor.getPlatform().
// Each suite sets it in beforeEach ('ios' | 'android' | 'web') and resets
// it in afterEach. Defaults to 'web' so non-native suites are unaffected.
const platformFlag = vi.hoisted(() => ({ value: 'web' as string }));

// A shared store that the @capacitor/keyboard mock writes into so individual
// tests can retrieve and invoke the registered listener.
const keyboardListenerStore = vi.hoisted(() => ({
  listeners: new Map<string, () => void>(),
}));

// When set to true the @capacitor/keyboard mock throws from addListener,
// which propagates through the .then() chain and triggers the .catch() block
// inside the ConfirmForm useEffect — simulating an unavailable Capacitor plugin.
const keyboardShouldFail = vi.hoisted(() => ({ value: false }));

// ── Mock heavy dependencies pulled in by GoalDetailScreen ─────────────────────

vi.mock('@capacitor/core', () => ({
  Capacitor: {
    isNativePlatform: () => nativePlatformFlag.value,
    // Reads platformFlag so individual suites can override the platform.
    // Defaults to 'web'; native suites set it to 'ios' or 'android' in beforeEach.
    getPlatform: () => platformFlag.value,
  },
}));

// Capacitor Keyboard plugin – capture the listener so tests can fire it.
// When keyboardShouldFail.value is true, addListener throws synchronously,
// propagating through the .then() chain and triggering the .catch() block in
// the ConfirmForm useEffect (simulating an unavailable / unregistered plugin).
vi.mock('@capacitor/keyboard', () => ({
  Keyboard: {
    addListener: (event: string, cb: () => void) => {
      if (keyboardShouldFail.value) {
        throw new Error('@capacitor/keyboard plugin not registered');
      }
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
    platformFlag.value = 'web';
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

describe('ConfirmForm – keyboard visibility (Capacitor native path, Android)', () => {
  let scrollIntoViewMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    // Enable native platform (Android) so the component registers a keyboardDidShow listener.
    nativePlatformFlag.value = true;
    platformFlag.value = 'android';
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
    platformFlag.value = 'web';
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('calls scrollIntoView when keyboardDidShow fires via the Capacitor plugin listener', async () => {
    render(<ConfirmForm {...defaultProps} />);

    // Flush the dynamic import promise and the addListener promise so the
    // listener is registered before we try to invoke it.
    await act(async () => {
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
    // On native, if the Capacitor keyboard event never fires (e.g. plugin bug,
    // timing issue, or unsupported OS version), the 150 ms unconditional timer
    // must still scroll the form into view so it is never left hidden.

    // Suppress visualViewport so it cannot be the one to trigger the scroll –
    // only the timer fallback should satisfy the assertion.
    const originalVV = window.visualViewport;
    Object.defineProperty(window, 'visualViewport', { configurable: true, value: null });

    try {
      render(<ConfirmForm {...defaultProps} />);

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

// ── Tests: native Capacitor iOS keyboardWillShow path ─────────────────────────
//
// On iOS the component branches on `Capacitor.getPlatform() === 'ios'` and
// registers `keyboardWillShow` instead of `keyboardDidShow`. Without this suite
// a regression on the iOS path (e.g. accidentally swapping the event names)
// would go completely undetected because the existing native suite uses the
// Android default.

describe('ConfirmForm – keyboard visibility (Capacitor iOS keyboardWillShow path)', () => {
  let scrollIntoViewMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    nativePlatformFlag.value = true;
    platformFlag.value = 'ios';
    keyboardListenerStore.listeners.clear();
    setMobileViewport();
    scrollIntoViewMock = vi.fn();
    window.HTMLElement.prototype.scrollIntoView = scrollIntoViewMock as unknown as typeof HTMLElement.prototype.scrollIntoView;
    vi.useFakeTimers();
  });

  afterEach(() => {
    nativePlatformFlag.value = false;
    platformFlag.value = 'android';
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('registers keyboardWillShow (not keyboardDidShow) on iOS', async () => {
    render(<ConfirmForm {...defaultProps} />);

    // Flush the dynamic import and both .then() promise chains.
    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
      await Promise.resolve();
    });

    // iOS must register keyboardWillShow, not keyboardDidShow.
    expect(keyboardListenerStore.listeners.has('keyboardWillShow')).toBe(true);
    expect(keyboardListenerStore.listeners.has('keyboardDidShow')).toBe(false);
  });

  it('calls scrollIntoView when keyboardWillShow fires on iOS', async () => {
    render(<ConfirmForm {...defaultProps} />);

    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
      await Promise.resolve();
    });

    // Simulate the iOS keyboard-will-show event.
    await act(async () => {
      keyboardListenerStore.listeners.get('keyboardWillShow')!();
    });

    // On iOS the scroll block is 'center' (task #26: avoids clipping on small screens).
    expect(scrollIntoViewMock).toHaveBeenCalledWith({ behavior: 'smooth', block: 'center' });
  });

  it('scrollIntoView is NOT called before keyboardWillShow fires on iOS', async () => {
    render(<ConfirmForm {...defaultProps} />);

    // Flush dynamic import — listener registered, but event has not fired yet.
    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
      await Promise.resolve();
    });

    // Timer has not advanced and the event has not fired — must be silent.
    expect(scrollIntoViewMock).not.toHaveBeenCalled();
  });

  it('timer fallback calls scrollIntoView on iOS when keyboardWillShow never arrives', async () => {
    // Regression guard: if the Capacitor keyboard event is never delivered
    // (e.g. plugin timing, OS quirk), the 150 ms unconditional timer must
    // still scroll the form into view so it is never left hidden on iOS.

    // Suppress visualViewport so only the timer fallback can satisfy the assertion.
    const originalVV = window.visualViewport;
    Object.defineProperty(window, 'visualViewport', { configurable: true, value: null });

    try {
      render(<ConfirmForm {...defaultProps} />);

      // Flush dynamic import microtasks — listener registered but never invoked.
      await act(async () => {
        await Promise.resolve();
        await Promise.resolve();
        await Promise.resolve();
      });

      // Listener registered — scrollIntoView must still be silent.
      expect(keyboardListenerStore.listeners.has('keyboardWillShow')).toBe(true);
      expect(scrollIntoViewMock).not.toHaveBeenCalled();

      // Advance past the 150 ms fallback — the timer must fire.
      await act(async () => {
        vi.advanceTimersByTime(200);
      });

      // On iOS the scroll block is 'center' (task #26: avoids clipping on small screens).
      expect(scrollIntoViewMock).toHaveBeenCalledWith({ behavior: 'smooth', block: 'center' });
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
    platformFlag.value = 'web';
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

// ── Tests: Capacitor keyboard plugin unavailable (error-branch / offline) ─────
//
// When the @capacitor/keyboard plugin is not registered (e.g. partially-bundled
// build, older Capacitor runtime, or the device is fully offline and the plugin
// DLL fails to load), addListener throws synchronously inside the .then() handler
// of the dynamic import, which propagates to the .catch() block and silently
// falls through. The 150 ms unconditional timer must still fire so the form is
// never left hidden behind the keyboard.

describe('ConfirmForm – keyboard visibility (Capacitor plugin unavailable / offline)', () => {
  let scrollIntoViewMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    // Enable native platform so the component attempts the Capacitor path.
    nativePlatformFlag.value = true;
    platformFlag.value = 'android';
    // Tell the mock to throw from addListener, exercising the .catch() branch.
    keyboardShouldFail.value = true;
    keyboardListenerStore.listeners.clear();
    setMobileViewport();
    scrollIntoViewMock = vi.fn();
    window.HTMLElement.prototype.scrollIntoView = scrollIntoViewMock as unknown as typeof HTMLElement.prototype.scrollIntoView;
    vi.useFakeTimers();
  });

  afterEach(() => {
    nativePlatformFlag.value = false;
    platformFlag.value = 'web';
    keyboardShouldFail.value = false;
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('timer fallback calls scrollIntoView within 150 ms when the Capacitor keyboard plugin throws (error branch exercised)', async () => {
    render(<ConfirmForm {...defaultProps} />);

    // Flush microtasks so the dynamic import .then() executes, addListener
    // throws, and the .catch() block silently swallows the error.
    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
      await Promise.resolve();
    });

    // The error branch swallowed the exception — no listener was registered.
    expect(keyboardListenerStore.listeners.has('keyboardDidShow')).toBe(false);
    expect(keyboardListenerStore.listeners.has('keyboardWillShow')).toBe(false);

    // scrollIntoView must not yet have been called (timer hasn't fired).
    expect(scrollIntoViewMock).not.toHaveBeenCalled();

    // Advance past the 150 ms fallback timer — it must fire regardless of the
    // plugin failure, ensuring the form is never left hidden behind the keyboard.
    await act(async () => {
      vi.advanceTimersByTime(200);
    });

    expect(scrollIntoViewMock).toHaveBeenCalledOnce();
    expect(scrollIntoViewMock).toHaveBeenCalledWith({ behavior: 'smooth', block: 'nearest' });
  });
});

// ── Tests: iOS small viewport — block:'center' at 375×667 ────────────────────
//
// On iPhone SE and 13 mini (375 × 667 px), the space above the soft keyboard
// is tighter than on larger iPhones. `block:'nearest'` only scrolls far enough
// to bring the edge into view and can leave the ConfirmForm partially clipped
// when the confirming row is near the bottom of a long milestone list.
// For iOS native builds the scroll strategy is therefore `block:'center'`,
// which places the form in the middle of the remaining visible area regardless
// of list length.

describe('ConfirmForm – iOS small-viewport scroll block (375×667, iPhone SE)', () => {
  let scrollIntoViewMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    nativePlatformFlag.value = true;
    platformFlag.value = 'ios';
    keyboardListenerStore.listeners.clear();
    // Simulate the smallest common iOS viewport (iPhone SE / 13 mini).
    Object.defineProperty(window, 'innerWidth',  { writable: true, configurable: true, value: 375 });
    Object.defineProperty(window, 'innerHeight', { writable: true, configurable: true, value: 667 });
    scrollIntoViewMock = vi.fn();
    window.HTMLElement.prototype.scrollIntoView = scrollIntoViewMock as unknown as typeof HTMLElement.prototype.scrollIntoView;
    vi.useFakeTimers();
  });

  afterEach(() => {
    nativePlatformFlag.value = false;
    platformFlag.value = 'web';
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('uses block:"center" (not "nearest") on iOS at 375×667 to avoid clipping below the keyboard', async () => {
    render(<ConfirmForm {...defaultProps} />);

    // Flush the dynamic import and addListener promise chains so the
    // keyboardWillShow listener is registered before we fire it.
    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(keyboardListenerStore.listeners.has('keyboardWillShow')).toBe(true);

    // Fire the iOS keyboard event – this is what triggers scrollIntoView.
    await act(async () => {
      keyboardListenerStore.listeners.get('keyboardWillShow')!();
    });

    // On iOS the scroll block must be 'center' so the form lands in the
    // middle of the compressed viewport above the keyboard.
    expect(scrollIntoViewMock).toHaveBeenCalledWith({ behavior: 'smooth', block: 'center' });
  });

  it('timer fallback also uses block:"center" on iOS when keyboardWillShow never fires', async () => {
    // Suppress visualViewport so only the timer path can fire the scroll.
    const originalVV = window.visualViewport;
    Object.defineProperty(window, 'visualViewport', { configurable: true, value: null });

    try {
      render(<ConfirmForm {...defaultProps} />);

      await act(async () => {
        await Promise.resolve();
        await Promise.resolve();
        await Promise.resolve();
      });

      // Timer not yet advanced — silent.
      expect(scrollIntoViewMock).not.toHaveBeenCalled();

      await act(async () => {
        vi.advanceTimersByTime(200);
      });

      // Even the fallback timer must honour the iOS block:'center' rule.
      expect(scrollIntoViewMock).toHaveBeenCalledWith({ behavior: 'smooth', block: 'center' });
    } finally {
      Object.defineProperty(window, 'visualViewport', { configurable: true, value: originalVV });
    }
  });
});

// ── Tests: iOS large viewport — block:'nearest' at 430×932 (Pro Max) ─────────
//
// On large iPhones (Pro Max, Plus — innerHeight ≥ 844 px) the visible area
// above the soft keyboard is generous.  `block:'center'` does NOT no-op when
// the element is already in view; it re-centers unconditionally, causing an
// unwanted scroll jump.  `block:'nearest'` IS a no-op when the element fits,
// so the component uses 'nearest' whenever innerHeight ≥ 700 px.
//
// This suite pins innerHeight to 932 px (iPhone 15 Pro Max layout viewport)
// and asserts that scrollIntoView is called with block:'nearest' so the
// already-visible form is not jarred upward by an unnecessary re-center.

describe('ConfirmForm – iOS large-viewport scroll block (430×932, iPhone Pro Max)', () => {
  let scrollIntoViewMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    nativePlatformFlag.value = true;
    platformFlag.value = 'ios';
    keyboardListenerStore.listeners.clear();
    // Large iPhone Pro Max layout viewport (innerHeight ≥ 700 threshold → nearest).
    Object.defineProperty(window, 'innerWidth',  { writable: true, configurable: true, value: 430 });
    Object.defineProperty(window, 'innerHeight', { writable: true, configurable: true, value: 932 });
    scrollIntoViewMock = vi.fn();
    window.HTMLElement.prototype.scrollIntoView = scrollIntoViewMock as unknown as typeof HTMLElement.prototype.scrollIntoView;
    vi.useFakeTimers();
  });

  afterEach(() => {
    nativePlatformFlag.value = false;
    platformFlag.value = 'web';
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('uses block:"nearest" (not "center") on iOS at 430×932 so an already-visible form is not re-centered', async () => {
    // block:'nearest' is a no-op when the element is already fully in view,
    // preventing the unnecessary scroll jump that block:'center' would cause
    // on large iPhones with generous above-keyboard space.
    render(<ConfirmForm {...defaultProps} />);

    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(keyboardListenerStore.listeners.has('keyboardWillShow')).toBe(true);

    await act(async () => {
      keyboardListenerStore.listeners.get('keyboardWillShow')!();
    });

    // Must be 'nearest', not 'center', at this viewport height.
    expect(scrollIntoViewMock).toHaveBeenCalledWith({ behavior: 'smooth', block: 'nearest' });
  });

  it('timer fallback also uses block:"nearest" on iOS at 430×932', async () => {
    // Suppress visualViewport so only the timer fallback can fire the scroll.
    const originalVV = window.visualViewport;
    Object.defineProperty(window, 'visualViewport', { configurable: true, value: null });

    try {
      render(<ConfirmForm {...defaultProps} />);

      await act(async () => {
        await Promise.resolve();
        await Promise.resolve();
        await Promise.resolve();
      });

      expect(scrollIntoViewMock).not.toHaveBeenCalled();

      await act(async () => {
        vi.advanceTimersByTime(200);
      });

      // Even the fallback timer must respect the height-gated rule.
      expect(scrollIntoViewMock).toHaveBeenCalledWith({ behavior: 'smooth', block: 'nearest' });
    } finally {
      Object.defineProperty(window, 'visualViewport', { configurable: true, value: originalVV });
    }
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
    expect(getByText(/how much did you deposit this week/i)).toBeInTheDocument();

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
