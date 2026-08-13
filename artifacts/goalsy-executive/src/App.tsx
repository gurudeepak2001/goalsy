// ── Goalsy App entry point ────────────────────────────────────────────────────
import { useEffect, useState, type ComponentType } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ClerkProvider, ClerkLoading, ClerkLoaded, Show, useAuth } from '@clerk/react';
import { Preferences } from '@capacitor/preferences';
import ErrorBoundary from '@/components/ErrorBoundary';
import { initApiClient } from '@/lib/apiClient';
import { publishableKeyFromHost } from '@clerk/react/internal';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import NotFound from '@/pages/not-found';
import { Route, Switch, Redirect, useLocation, Router as WouterRouter } from 'wouter';

import SplashScreen from '@/pages/SplashScreen';
import WelcomeScreen from '@/pages/WelcomeScreen';
import SignInScreen from '@/pages/SignInScreen';
import CreateAccountScreen from '@/pages/CreateAccountScreen';
import FinancialConnectionScreen from '@/pages/FinancialConnectionScreen';
import AIHomeScreen from '@/pages/AIHomeScreen';
import FinancialHealthScreen from '@/pages/FinancialHealthScreen';
import TodayScreen from '@/pages/TodayScreen';
import CalendarScreen from '@/pages/CalendarScreen';
import GoalsOverviewScreen from '@/pages/GoalsOverviewScreen';
import GoalDetailScreen from '@/pages/GoalDetailScreen';
import ProfileScreen from '@/pages/ProfileScreen';
import ScoreScreen from '@/pages/ScoreScreen';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Never retry 401/403 — the user isn't authenticated; retrying won't help
      // and floods the server. Retry once on genuine server errors (5xx).
      retry: (failureCount, error: unknown) => {
        const status = (error as { status?: number })?.status;
        if (status === 401 || status === 403) return false;
        return failureCount < 1;
      },
      // Treat data as fresh for 60 seconds — avoids re-fetching on every
      // navigation or tab-focus when the data hasn't changed.
      staleTime: 60_000,
      // Don't refetch just because the user switched tabs. The keepalive
      // in ApiClientBootstrap refreshes the token; queries refresh on
      // mutation invalidation and explicit user action.
      refetchOnWindowFocus: false,
    },
  },
});
const basePath = import.meta.env.BASE_URL.replace(/\/$/, '');

// ── Runtime detection ─────────────────────────────────────────────────────────
const isCapacitor = !!(window as any).Capacitor;

// ── Clerk publishable key & proxy URL ────────────────────────────────────────
// Native builds (cap:build) bake in VITE_API_BASE_URL — the deployed server.
// The deployed server validates sessions against the PRODUCTION Clerk instance
// (live keys are swapped in at publish time), so the native app must
// authenticate against that same instance, through the server's Clerk proxy
// (/api/__clerk) — exactly like the published web app does. Using the dev
// (pk_test) instance here produces tokens the deployed API always rejects (401).
const nativeApiBase = isCapacitor ? (import.meta.env.VITE_API_BASE_URL ?? '') : '';
const nativeApiHost = (() => {
  try { return nativeApiBase ? new URL(nativeApiBase).hostname : ''; } catch { return ''; }
})();

const clerkPubKey = isCapacitor
  ? (nativeApiHost
      // No fallback here on purpose: publishableKeyFromHost short-circuits to
      // the fallback whenever it is a dev (pk_test) key, which would silently
      // keep the native app on the dev Clerk instance — the exact bug this
      // block exists to fix. The derived key MUST come from the deployed host.
      ? publishableKeyFromHost(nativeApiHost)
      : import.meta.env.VITE_CLERK_PUBLISHABLE_KEY)
  : publishableKeyFromHost(window.location.hostname, import.meta.env.VITE_CLERK_PUBLISHABLE_KEY);

const clerkProxyUrl = isCapacitor
  ? (nativeApiHost ? `https://${nativeApiHost}/api/__clerk` : undefined)
  : import.meta.env.VITE_CLERK_PROXY_URL;

if (!clerkPubKey) {
  throw new Error('Missing VITE_CLERK_PUBLISHABLE_KEY in .env file');
}

// ── __clerk_db_jwt device-token persistence ───────────────────────────────────
//
// Clerk passes its device token as a __clerk_db_jwt query parameter on every
// FAPI request.  In a cross-origin Capacitor context this token lives only in
// JS memory per page load — not in cookies, localStorage, or IndexedDB —
// confirmed via Network + Storage tab inspection.  Force-kill wipes the heap.
//
// Strategy:
//   • Fire preloadDbJwt() at module level (earliest possible moment) so the
//     cached token is ready before Clerk's CDN bundle finishes loading.
//   • Never block rendering on the preload — if the token isn't ready in time,
//     that particular FAPI call goes out without it (creates a new client once).
//     Every subsequent call will have the token.
//   • The fetch interceptor saves the token every time Clerk includes it in a
//     request URL, and also reads it from the Clerk-Db-Jwt response header.

const DB_JWT_PREF_KEY = 'cm_clerk_db_jwt';
let cachedDbJwt: string | null = null;
let restoreDone = false;     // restoreDbJwtIntoUrl() has run

// Clerk device JWTs are always 300+ characters (they are signed JWTs).
// Anything shorter is a corrupted/truncated value — treat it as absent and
// delete it so we don't silently auth every request as 401.
const MIN_JWT_LENGTH = 100;

async function preloadDbJwt(): Promise<void> {
  // Dev-instance-only machinery: __clerk_db_jwt is Clerk's development-browser
  // token. Production-proxy native builds (nativeApiHost set) use the live
  // instance, which has a different session contract — skip entirely.
  if (!isCapacitor || nativeApiHost) return;
  try {
    const { value } = await Preferences.get({ key: DB_JWT_PREF_KEY });
    if (value && value.length >= MIN_JWT_LENGTH) {
      cachedDbJwt = value;
    } else if (value) {
      // Value exists but is too short to be a real JWT — discard it so Clerk
      // falls through to its own sign-in flow instead of silently failing.
      Preferences.remove({ key: DB_JWT_PREF_KEY }).catch(() => {});
    }
  } catch { /* fall through to normal sign-in */ }
}

// ── The actual restore: hand the token to Clerk through its own front door ───
// clerk-js's devBrowser.setup() looks for __clerk_db_jwt in the page URL's
// search params FIRST (extractDevBrowserFromURL), before checking its own
// storage or minting a new token via POST /v1/dev_browser.  If we put the
// saved token in the URL before Clerk initializes, Clerk adopts it natively,
// decorates every FAPI request itself (onBeforeRequest), and cleans the URL.
// No fetch-level injection needed — that approach fought Clerk's own layer.
function restoreDbJwtIntoUrl(): void {
  if (!isCapacitor || nativeApiHost) return;
  try {
    if (!cachedDbJwt) {
      restoreDone = true;
      return;
    }
    const url = new URL(window.location.href);
    if (!url.searchParams.get('__clerk_db_jwt')) {
      url.searchParams.set('__clerk_db_jwt', cachedDbJwt);
      window.history.replaceState(null, '', url.toString());
    }
    restoreDone = true;
  } catch {
    restoreDone = true;
  }
}

function persistDbJwt(token: string, source: string): void {
  try {
    if (!token || token === cachedDbJwt) return;
    // Never persist a value too short to be a real JWT — a truncated or
    // bogus URL param would overwrite the good saved token and sign the
    // user out on next launch.
    if (token.length < MIN_JWT_LENGTH) return;
    // Clobber guard: until the preload+restore sequence has settled we cannot
    // know whether a saved token exists — refuse ALL writes so a freshly minted
    // (session-less) token can never overwrite an unread saved one.
    if (!restoreDone) return;
    cachedDbJwt = token;
    Preferences.set({ key: DB_JWT_PREF_KEY, value: token }).catch(() => {});
  } catch { /* never crash the fetch call */ }
}

// Preload then restore, at module evaluation — Preferences.get is a fast native
// bridge call (~ms) while Clerk's CDN bundle takes hundreds of ms to load, so
// the URL is decorated well before clerk-js reads window.location.
const _preloadPromise: Promise<void> = preloadDbJwt().then(restoreDbJwtIntoUrl);

// Boot gate: ClerkProvider must not mount until the restore has settled — but
// never wait more than 1.5s (a stuck Capacitor bridge previously caused an
// indefinite blank-screen hang when rendering was gated without a timeout).
const bootReady: Promise<void> = Promise.race([
  _preloadPromise,
  new Promise<void>((resolve) => setTimeout(resolve, 1500)),
]).catch(() => {});

// ── FAPI base URL ─────────────────────────────────────────────────────────────
function computeFapiUrl(): string {
  try {
    const key = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY ?? '';
    const b64 = key.replace(/^pk_(live|test)_/, '');
    return `https://${atob(b64).replace(/\$$/, '')}`;
  } catch { return ''; }
}
const FAPI_ORIGIN = computeFapiUrl();

// ── Fetch interceptor ─────────────────────────────────────────────────────────
// Installed at module level, before any import of @clerk/* triggers a CDN load.
// Wrapped entirely in try/catch — any failure falls through to the real fetch.
if (isCapacitor && !nativeApiHost && FAPI_ORIGIN) {
  const _fetch = window.fetch.bind(window);
  (window as any).fetch = async function clerkFapiInterceptor(
    input: RequestInfo | URL,
    init?: RequestInit,
  ) {
    try {
      const originalUrl = input instanceof Request ? input.url : String(input);
      const isFapiCall = originalUrl.startsWith(FAPI_ORIGIN) && !originalUrl.includes('/npm/@clerk');

      if (isFapiCall) {
        // Passive observation only — NO request modification.  Clerk decorates
        // its own requests with __clerk_db_jwt (devBrowser onBeforeRequest); we
        // just persist whatever token it is using so the next cold start can
        // restore it via the URL (restoreDbJwtIntoUrl above).
        const urlObj = new URL(originalUrl);
        const jwtInRequest = urlObj.searchParams.get('__clerk_db_jwt');
        if (jwtInRequest) persistDbJwt(jwtInRequest, 'request-url');
      }

      // Pass through unchanged.
      const response = await _fetch(input as RequestInfo, init);

      if (isFapiCall) {
        try {
          const h = response.headers.get('Clerk-Db-Jwt') ?? response.headers.get('clerk-db-jwt');
          if (h) persistDbJwt(h, 'response-header');
        } catch { /* non-fatal */ }
      }

      return response;

    } catch (interceptorErr) {
      const e = interceptorErr as any;
      // AbortError = Clerk cancelled this request intentionally via its own signal.
      // Re-throw it — the signal is already dead, so retrying _fetch(input, init)
      // would immediately throw a second AbortError and confuse Clerk's error handling.
      if (e?.name === 'AbortError') {
        throw interceptorErr;
      }
      // Any other error: fall back to the real fetch unconditionally.
      return _fetch(input as RequestInfo, init);
    }
  };
}

// ── Route guards ──────────────────────────────────────────────────────────────

function AuthGate({ component: Component }: { component: ComponentType }) {
  return (
    <>
      <Show when="signed-in"><Component /></Show>
      <Show when="signed-out"><Redirect to="/welcome" /></Show>
    </>
  );
}

function GuestOnly({ component: Component }: { component: ComponentType }) {
  return (
    <>
      <Show when="signed-out"><Component /></Show>
      <Show when="signed-in"><Redirect to="/ai-home" /></Show>
    </>
  );
}

function HomeRedirect() {
  return (
    <>
      <Show when="signed-in"><Redirect to="/ai-home" /></Show>
      <Show when="signed-out"><SplashScreen /></Show>
    </>
  );
}

function Router() {
  return (
    <Switch>
      <Route path="/"                     component={HomeRedirect} />
      <Route path="/welcome"              component={() => <GuestOnly component={WelcomeScreen} />} />
      <Route path="/signin"               component={() => <GuestOnly component={SignInScreen} />} />
      <Route path="/create-account"       component={() => <GuestOnly component={CreateAccountScreen} />} />
      <Route path="/financial-connection" component={() => <AuthGate component={FinancialConnectionScreen} />} />
      <Route path="/ai-home"              component={() => <AuthGate component={AIHomeScreen} />} />
      <Route path="/today"                component={() => <AuthGate component={TodayScreen} />} />
      <Route path="/financial-health"     component={() => <AuthGate component={FinancialHealthScreen} />} />
      <Route path="/calendar"             component={() => <AuthGate component={CalendarScreen} />} />
      <Route path="/goals"                component={() => <AuthGate component={GoalsOverviewScreen} />} />
      <Route path="/goals/:id"            component={() => <AuthGate component={GoalDetailScreen} />} />
      <Route path="/profile"              component={() => <AuthGate component={ProfileScreen} />} />
      <Route path="/score"                component={() => <AuthGate component={ScoreScreen} />} />
      <Route component={NotFound} />
    </Switch>
  );
}

// ── ApiClientBootstrap ────────────────────────────────────────────────────────

function ApiClientBootstrap() {
  const { getToken } = useAuth();

  // Re-init whenever getToken's identity changes (sign-in / sign-out) — the
  // api client must never hold a stale pre-sign-in getToken that returns null.
  useEffect(() => { initApiClient(getToken); }, [getToken]);

  // Refresh session token on foreground restore (prevents 401 after suspension).
  useEffect(() => {
    const handleVisibilityChange = async () => {
      if (!document.hidden) {
        try { await getToken({ skipCache: true }); } catch { /* auth guard handles */ }
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [getToken]);

  // Keepalive: every 10 minutes to reset Clerk's inactivity clock.
  useEffect(() => {
    const interval = setInterval(async () => {
      if (!document.hidden) {
        try { await getToken({ skipCache: true }); } catch { /* ignore */ }
      }
    }, 10 * 60 * 1000);
    return () => clearInterval(interval);
  }, [getToken]);

  return null;
}

// ── ClerkProviderWithRoutes ───────────────────────────────────────────────────

function ClerkProviderWithRoutes() {
  const [, setLocation] = useLocation();
  return (
    <ClerkProvider
      publishableKey={clerkPubKey}
      proxyUrl={clerkProxyUrl}
      routerPush={(to) => setLocation(to)}
      routerReplace={(to) => setLocation(to, { replace: true })}
    >
      <ClerkLoading><SplashScreen /></ClerkLoading>
      <ClerkLoaded>
        <ApiClientBootstrap />
        <Router />
      </ClerkLoaded>
    </ClerkProvider>
  );
}

// ── App ───────────────────────────────────────────────────────────────────────
// Boot gate: ClerkProvider mounts only after the token restore has settled
// (or after the 1.5s timeout — never an indefinite hang). While waiting, a
// dark placeholder matching the splash background prevents a white flash.

function App() {
  const [booted, setBooted] = useState(!isCapacitor);

  useEffect(() => {
    document.documentElement.classList.add('dark');
  }, []);

  useEffect(() => {
    if (!booted) bootReady.then(() => setBooted(true));
  }, [booted]);

  if (!booted) {
    return <div style={{ minHeight: '100dvh', backgroundColor: '#05070A' }} />;
  }

  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <WouterRouter base={basePath}>
            <ClerkProviderWithRoutes />
          </WouterRouter>
          <Toaster />
        </TooltipProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}

export default App;
