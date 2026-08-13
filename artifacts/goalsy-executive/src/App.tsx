// ── Goalsy App entry point ────────────────────────────────────────────────────
// FIRST executable line — confirms JS execution reached this module.
console.log('[Goalsy] App.tsx module loading');

import { useEffect, type ComponentType } from 'react';
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

console.log('[Goalsy] imports done');

const queryClient = new QueryClient();
const basePath = import.meta.env.BASE_URL.replace(/\/$/, '');

// ── Runtime detection ─────────────────────────────────────────────────────────
const isCapacitor = !!(window as any).Capacitor;
console.log('[Goalsy] isCapacitor:', isCapacitor);

// ── Clerk publishable key & proxy URL ────────────────────────────────────────
const clerkPubKey = isCapacitor
  ? import.meta.env.VITE_CLERK_PUBLISHABLE_KEY
  : publishableKeyFromHost(window.location.hostname, import.meta.env.VITE_CLERK_PUBLISHABLE_KEY);

const clerkProxyUrl = isCapacitor ? undefined : import.meta.env.VITE_CLERK_PROXY_URL;

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

async function preloadDbJwt(): Promise<void> {
  if (!isCapacitor) return;
  try {
    const { value } = await Preferences.get({ key: DB_JWT_PREF_KEY });
    if (value) {
      cachedDbJwt = value;
      console.log('[Goalsy:jwt] preloaded __clerk_db_jwt (len:', value.length, ')');
    } else {
      console.log('[Goalsy:jwt] no saved __clerk_db_jwt — first launch');
    }
  } catch (err) {
    // Bridge not ready or plugin missing — proceed without; interceptor will
    // capture and save the token once Clerk makes its first request.
    console.log('[Goalsy:jwt] preload skipped:', err);
  }
}

function persistDbJwt(token: string): void {
  try {
    if (!token || token === cachedDbJwt) return;
    cachedDbJwt = token;
    Preferences.set({ key: DB_JWT_PREF_KEY, value: token }).catch(() => {});
    console.log('[Goalsy:jwt] persisted __clerk_db_jwt (len:', token.length, ')');
  } catch { /* never crash the fetch call */ }
}

// Fire the preload immediately at module evaluation — this gives it the maximum
// head-start before Clerk's CDN bundle finishes loading and makes its first
// FAPI call (typically 200–500 ms later).
const _preloadPromise: Promise<void> = preloadDbJwt();

// ── FAPI base URL ─────────────────────────────────────────────────────────────
function computeFapiUrl(): string {
  try {
    const key = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY ?? '';
    const b64 = key.replace(/^pk_(live|test)_/, '');
    return `https://${atob(b64).replace(/\$$/, '')}`;
  } catch { return ''; }
}
const FAPI_ORIGIN = computeFapiUrl();
console.log('[Goalsy] FAPI_ORIGIN:', FAPI_ORIGIN);

// ── Fetch interceptor ─────────────────────────────────────────────────────────
// Installed at module level, before any import of @clerk/* triggers a CDN load.
// Wrapped entirely in try/catch — any failure falls through to the real fetch.
if (isCapacitor && FAPI_ORIGIN) {
  const _fetch = window.fetch.bind(window);
  (window as any).fetch = async function clerkFapiInterceptor(
    input: RequestInfo | URL,
    init?: RequestInit,
  ) {
    try {
      const originalUrl = input instanceof Request ? input.url : String(input);
      const isFapiCall = originalUrl.startsWith(FAPI_ORIGIN) && !originalUrl.includes('/npm/@clerk');

      if (isFapiCall) {
        const urlObj = new URL(originalUrl);
        const jwtInRequest = urlObj.searchParams.get('__clerk_db_jwt');

        if (jwtInRequest) {
          // Token present in outgoing request — update our persisted copy.
          persistDbJwt(jwtInRequest);
        } else if (cachedDbJwt) {
          // Only inject into /v1/client — the endpoint that actually resolves a
          // device token back to an authenticated session.  Other FAPI endpoints
          // (e.g. /v1/dev_browser, /v1/environment) don't use __clerk_db_jwt the
          // same way and injecting into them causes json() parse failures in Clerk.
          const pathname = urlObj.pathname;
          const isClientEndpoint = pathname === '/v1/client' || pathname.startsWith('/v1/client/');

          if (isClientEndpoint) {
            // Skip injection if Clerk's AbortSignal is already fired — retrying
            // with a dead signal just causes a second AbortError in the fallback.
            if (init?.signal?.aborted) {
              console.log('[Goalsy:jwt] signal already aborted, skipping injection for', pathname);
            } else {
              // Cold-start: Clerk doesn't have a token yet but we have a saved one.
              // Entire inject path is in its own try/catch.
              try {
                urlObj.searchParams.set('__clerk_db_jwt', cachedDbJwt);
                const modifiedUrl = urlObj.toString();
                console.log('[Goalsy:jwt] injecting __clerk_db_jwt into', pathname,
                  '— url:', modifiedUrl.slice(0, 100));

                const injectedResponse = await _fetch(modifiedUrl, init);

                if (injectedResponse.type === 'error') {
                  throw new Error('network error on injected request');
                }

                // Try to capture the device token from the response header.
                try {
                  const h = injectedResponse.headers.get('Clerk-Db-Jwt')
                         ?? injectedResponse.headers.get('clerk-db-jwt');
                  if (h) persistDbJwt(h);
                } catch { /* non-fatal */ }

                console.log('[Goalsy:jwt] injection succeeded, status:', injectedResponse.status);
                // Return a clone so Clerk gets a fresh unread body stream.
                return injectedResponse.clone();
              } catch (injectErr) {
                const e = injectErr as any;
                // AbortError = Clerk intentionally cancelled this request.
                // Re-throw immediately — the fallback _fetch uses the SAME signal
                // and would also abort, producing a duplicate error and confusing Clerk.
                if (e?.name === 'AbortError') {
                  console.log('[Goalsy:jwt] injection aborted by Clerk (signal fired), re-throwing');
                  throw injectErr;
                }
                // Any other error: fall through to the unmodified _fetch below.
                console.error('[Goalsy:jwt] injection failed, falling back —',
                  'name:', e?.name, '| message:', e?.message, '| stack:', e?.stack ?? String(injectErr));
              }
            }
          }
        }
      }

      // Default path: pass through unchanged.
      const response = await _fetch(input as RequestInfo, init);

      if (isFapiCall) {
        try {
          const h = response.headers.get('Clerk-Db-Jwt') ?? response.headers.get('clerk-db-jwt');
          if (h) persistDbJwt(h);
        } catch { /* non-fatal */ }

        try {
          const data = await response.clone().json().catch(() => null);
          if (data) {
            const path = (input instanceof Request ? input.url : String(input))
              .replace(FAPI_ORIGIN, '').split('?')[0];
            console.log(`[Goalsy:fapi] ${path}`,
              '→ client_id:', data?.response?.id ?? 'N/A',
              '| sessions:', (data?.response?.sessions ?? []).length,
              '| last_active:', data?.response?.last_active_session_id ?? 'none');
          }
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
      console.error('[Goalsy:fapi] interceptor error, falling back —',
        'name:', e?.name, '| message:', e?.message, '| stack:', e?.stack ?? String(interceptorErr));
      return _fetch(input as RequestInfo, init);
    }
  };
  console.log('[Goalsy:jwt] fetch interceptor installed');
}

console.log('[Goalsy] module setup complete');

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

  useEffect(() => { initApiClient(getToken); }, []); // eslint-disable-line react-hooks/exhaustive-deps

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
// No storageReady gate — rendering is never blocked on async Preferences work.
// The preload started at module level; it completes well before Clerk's CDN
// bundle finishes loading and fires its first FAPI request.

function App() {
  useEffect(() => {
    document.documentElement.classList.add('dark');
  }, []);

  // Ensure the preload promise doesn't produce an unhandled rejection.
  useEffect(() => { _preloadPromise.catch(() => {}); }, []);

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
