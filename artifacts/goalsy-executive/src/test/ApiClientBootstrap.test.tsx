/**
 * Tests that ApiClientBootstrap shows a "Session expired" toast when
 * getToken returns null on foreground restore AND the user was previously
 * signed in.  This guards against a future refactor silently removing the
 * visibilitychange → getToken guard.
 *
 * Coverage:
 *   1. Toast fires when session expires after user was signed in
 *   2. Toast does NOT fire when user was never signed in (guest on /welcome)
 *   3. Toast does NOT fire when getToken succeeds (non-null token)
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, act } from '@testing-library/react';
import React from 'react';

// ── Hoisted mutable flags ──────────────────────────────────────────────────────

// Controls what useAuth returns so each test can configure the scenario.
// Use an implementation-typed fn so vi.fn infers the signature automatically
// (Vitest v4 removed the two-arg generic overload).
const authState = vi.hoisted(() => ({
  getToken: vi.fn(() => Promise.resolve<string | null>(null)),
  isSignedIn: true as boolean,
}));

// Captures the toast call so tests can assert on title/description.
const mockToast = vi.hoisted(() => vi.fn());

// ── Mock @capacitor/preferences ───────────────────────────────────────────────
// App.tsx imports Preferences at the top; provide no-op stubs so the module
// loads cleanly even though isCapacitor is false in jsdom (all capacitor-gated
// code returns early, but the import itself must resolve).
vi.mock('@capacitor/preferences', () => ({
  Preferences: {
    get: vi.fn().mockResolvedValue({ value: null }),
    set: vi.fn().mockResolvedValue(undefined),
    remove: vi.fn().mockResolvedValue(undefined),
  },
}));

// ── Mock @capacitor/core ──────────────────────────────────────────────────────
vi.mock('@capacitor/core', () => ({
  Capacitor: {
    isNativePlatform: () => false,
    getPlatform: () => 'web',
  },
}));

// ── Mock @clerk/react ─────────────────────────────────────────────────────────
// Provide the hooks + components App.tsx imports so the module loads cleanly.
vi.mock('@clerk/react', () => ({
  useAuth: () => ({
    getToken: authState.getToken,
    isSignedIn: authState.isSignedIn,
  }),
  ClerkProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  ClerkLoading: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  ClerkLoaded: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  Show: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

// ── Mock @/hooks/use-toast ────────────────────────────────────────────────────
vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({ toast: mockToast }),
  toast: mockToast,
}));

// ── Mock @/lib/apiClient ──────────────────────────────────────────────────────
vi.mock('@/lib/apiClient', () => ({
  initApiClient: vi.fn(),
}));

// ── Mock page components (avoid pulling in heavy subtrees) ────────────────────
vi.mock('@/pages/SplashScreen', () => ({ default: () => null }));
vi.mock('@/pages/WelcomeScreen', () => ({ default: () => null }));
vi.mock('@/pages/SignInScreen', () => ({ default: () => null }));
vi.mock('@/pages/CreateAccountScreen', () => ({ default: () => null }));
vi.mock('@/pages/FinancialConnectionScreen', () => ({ default: () => null }));
vi.mock('@/pages/AIHomeScreen', () => ({ default: () => null }));
vi.mock('@/pages/FinancialHealthScreen', () => ({ default: () => null }));
vi.mock('@/pages/TodayScreen', () => ({ default: () => null }));
vi.mock('@/pages/CalendarScreen', () => ({ default: () => null }));
vi.mock('@/pages/GoalsOverviewScreen', () => ({ default: () => null }));
vi.mock('@/pages/GoalDetailScreen', () => ({ default: () => null }));
vi.mock('@/pages/ProfileScreen', () => ({ default: () => null }));
vi.mock('@/pages/ScoreScreen', () => ({ default: () => null }));
vi.mock('@/pages/not-found', () => ({ default: () => null }));

// ── Mock shared UI components ─────────────────────────────────────────────────
vi.mock('@/components/ui/toaster', () => ({ Toaster: () => null }));
vi.mock('@/components/ui/tooltip', () => ({
  TooltipProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));
vi.mock('@/components/ErrorBoundary', () => ({
  default: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

// ── Mock wouter ───────────────────────────────────────────────────────────────
vi.mock('wouter', () => ({
  Route: () => null,
  Switch: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  Redirect: () => null,
  useLocation: () => ['/', vi.fn()],
  Router: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

// ── Mock @tanstack/react-query ────────────────────────────────────────────────
vi.mock('@tanstack/react-query', () => ({
  QueryClient: class { defaultOptions = {}; },
  QueryClientProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

// ── Import component under test ───────────────────────────────────────────────
// Import after all vi.mock() calls so hoisted mocks are in place.
import { ApiClientBootstrap } from '../App';

// ── Helper: fire visibilitychange with document.hidden = false ────────────────
// jsdom defaults document.hidden to false (document is "visible"), so we just
// dispatch the event.  To simulate the hidden→visible transition (foreground
// restore after background), we briefly set hidden to true then back to false.
function fireVisibilityForeground() {
  Object.defineProperty(document, 'hidden', { configurable: true, value: false });
  document.dispatchEvent(new Event('visibilitychange'));
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('ApiClientBootstrap – session-expired toast on foreground restore', () => {
  beforeEach(() => {
    mockToast.mockClear();
    authState.getToken = vi.fn(() => Promise.resolve<string | null>(null));
    authState.isSignedIn = true;
    Object.defineProperty(document, 'hidden', { configurable: true, value: false });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('shows "Session expired" toast when getToken returns null and user was signed in', async () => {
    // Mount with isSignedIn = true so wasSignedIn.current starts as true.
    render(<ApiClientBootstrap />);

    // Wait for effects (wasSignedIn ref update, initApiClient, handler registration).
    await act(async () => {
      await Promise.resolve();
    });

    // Simulate app returning to foreground.
    await act(async () => {
      fireVisibilityForeground();
      // Let the async getToken() promise resolve.
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(mockToast).toHaveBeenCalledOnce();
    expect(mockToast).toHaveBeenCalledWith(
      expect.objectContaining({ title: 'Session expired' }),
    );
  });

  it('does NOT show the toast when the user was never signed in (guest flow)', async () => {
    // isSignedIn = false — wasSignedIn.current stays false throughout.
    authState.isSignedIn = false;

    render(<ApiClientBootstrap />);

    await act(async () => {
      await Promise.resolve();
    });

    await act(async () => {
      fireVisibilityForeground();
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(mockToast).not.toHaveBeenCalled();
  });

  it('does NOT show the toast when getToken returns a valid token', async () => {
    // Session is healthy — getToken returns a non-null JWT.
    authState.getToken = vi.fn(() => Promise.resolve<string | null>('valid.jwt.token'));
    authState.isSignedIn = true;

    render(<ApiClientBootstrap />);

    await act(async () => {
      await Promise.resolve();
    });

    await act(async () => {
      fireVisibilityForeground();
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(mockToast).not.toHaveBeenCalled();
  });

  it('shows the toast only once per sign-out transition even if foreground fires again', async () => {
    render(<ApiClientBootstrap />);

    await act(async () => {
      await Promise.resolve();
    });

    // First foreground restore — session has expired → toast fires.
    await act(async () => {
      fireVisibilityForeground();
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(mockToast).toHaveBeenCalledOnce();

    // Second foreground restore — wasSignedIn.current is now false → toast must not fire again.
    await act(async () => {
      fireVisibilityForeground();
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(mockToast).toHaveBeenCalledOnce(); // still only once
  });
});

// ── Keepalive timer tests ──────────────────────────────────────────────────────

describe('ApiClientBootstrap – keepalive timer respects document.hidden', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    mockToast.mockClear();
    authState.getToken = vi.fn(() => Promise.resolve<string | null>('valid.jwt.token'));
    authState.isSignedIn = true;
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('does NOT call getToken when document.hidden = true and the 10-min interval fires', async () => {
    // App is in the background.
    Object.defineProperty(document, 'hidden', { configurable: true, value: true });

    render(<ApiClientBootstrap />);

    // Let mount effects settle.
    await act(async () => { await Promise.resolve(); });

    // Clear the getToken call made by initApiClient effect so we can isolate the keepalive.
    authState.getToken.mockClear();

    // Advance past the 10-minute keepalive interval.
    await act(async () => {
      vi.advanceTimersByTime(10 * 60 * 1000 + 100);
      // Let any promises inside the interval callback settle.
      await Promise.resolve();
    });

    // The keepalive guard must have blocked the call.
    expect(authState.getToken).not.toHaveBeenCalled();
  });

  it('DOES call getToken when document.hidden = false and the 10-min interval fires', async () => {
    // App is in the foreground.
    Object.defineProperty(document, 'hidden', { configurable: true, value: false });

    render(<ApiClientBootstrap />);

    // Let mount effects settle.
    await act(async () => { await Promise.resolve(); });

    // Clear calls from mount effects.
    authState.getToken.mockClear();

    // Advance past the 10-minute keepalive interval.
    await act(async () => {
      vi.advanceTimersByTime(10 * 60 * 1000 + 100);
      await Promise.resolve();
    });

    // The keepalive should have fired getToken once.
    expect(authState.getToken).toHaveBeenCalledOnce();
    expect(authState.getToken).toHaveBeenCalledWith({ skipCache: true });
  });
});
