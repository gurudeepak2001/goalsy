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

const queryClient = new QueryClient();
const basePath = import.meta.env.BASE_URL.replace(/\/$/, '');

// ── Runtime detection ─────────────────────────────────────────────────────────
const isCapacitor = !!(window as any).Capacitor;

// ── Clerk publishable key & proxy URL ────────────────────────────────────────
// In Capacitor the hostname is always "localhost", so we use the key baked
// into the bundle instead of deriving it from the hostname.
const clerkPubKey = isCapacitor
  ? import.meta.env.VITE_CLERK_PUBLISHABLE_KEY
  : publishableKeyFromHost(window.location.hostname, import.meta.env.VITE_CLERK_PUBLISHABLE_KEY);

const clerkProxyUrl = isCapacitor ? undefined : import.meta.env.VITE_CLERK_PROXY_URL;

if (!clerkPubKey) {
  throw new Error('Missing VITE_CLERK_PUBLISHABLE_KEY in .env file');
}

// ── __clerk_db_jwt device-token persistence ───────────────────────────────────
//
// Clerk passes a device token (__clerk_db_jwt) as a query parameter on every
// FAPI request.  In a cross-origin Capacitor context this token lives only in
// JS memory — it is NOT stored in cookies, localStorage, or IndexedDB (confirmed
// via Network + Storage tab inspection).  On force-kill the JS heap is wiped and
// a fresh cold start produces a brand-new token with zero sessions.
//
// Fix:
//   1. Intercept every FAPI fetch call.
//      a. If the outgoing URL contains __clerk_db_jwt, extract and save it to
//         Capacitor Preferences (backed by iOS UserDefaults — survives force-kill).
//      b. Also read the Clerk-Db-Jwt response header as a belt-and-suspenders
//         source of the same value.
//      c. If the outgoing URL does NOT contain __clerk_db_jwt but we have a saved
//         value in memory, inject it as a query parameter so Clerk's first cold-
//         start request identifies the existing device/client instead of creating
//         a new one.
//   2. Before ClerkProvider mounts, preload the saved token from Preferences into
//      the module-level variable so the interceptor can inject it synchronously.

const DB_JWT_PREF_KEY = 'cm_clerk_db_jwt';

// Module-level cache — populated in preloadDbJwt() before ClerkProvider mounts.
let cachedDbJwt: string | null = null;

/** Read the previously saved device token from UserDefaults-backed Preferences. */
async function preloadDbJwt(): Promise<void> {
  if (!isCapacitor) return;
  try {
    const { value } = await Preferences.get({ key: DB_JWT_PREF_KEY });
    if (value) {
      cachedDbJwt = value;
      console.log('[Goalsy:jwt] preloaded __clerk_db_jwt from Preferences (len:', value.length, ')');
    } else {
      console.log('[Goalsy:jwt] no saved __clerk_db_jwt — first launch after install');
    }
  } catch (err) {
    console.error('[Goalsy:jwt] Preferences.get failed:', err);
  }
}

/** Persist the device token to Preferences and update the in-memory cache. */
function persistDbJwt(token: string): void {
  if (!token || token === cachedDbJwt) return;
  cachedDbJwt = token;
  Preferences.set({ key: DB_JWT_PREF_KEY, value: token }).catch(() => {});
  console.log('[Goalsy:jwt] persisted __clerk_db_jwt (len:', token.length, ')');
}

// ── FAPI base URL (derived from publishable key) ──────────────────────────────
function computeFapiUrl(): string {
  try {
    const key = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY ?? '';
    const b64 = key.replace(/^pk_(live|test)_/, '');
    return `https://${atob(b64).replace(/\$$/, '')}`;
  } catch { return ''; }
}
const FAPI_ORIGIN = computeFapiUrl();

// ── Fetch interceptor (installed before ClerkProvider, before any FAPI call) ──
if (isCapacitor && FAPI_ORIGIN) {
  const _fetch = window.fetch.bind(window);
  (window as any).fetch = async function clerkFapiInterceptor(
    input: RequestInfo | URL,
    init?: RequestInit,
  ) {
    let urlStr = input instanceof Request ? input.url : String(input);

    const isFapiCall = urlStr.startsWith(FAPI_ORIGIN) && !urlStr.includes('/npm/@clerk');

    if (isFapiCall) {
      // ── (a) Extract token from outgoing request URL ────────────────────────
      const urlObj = new URL(urlStr);
      const jwtInRequest = urlObj.searchParams.get('__clerk_db_jwt');

      if (jwtInRequest) {
        // Clerk already has the token in memory — save/update our copy.
        persistDbJwt(jwtInRequest);
      } else if (cachedDbJwt) {
        // Clerk does NOT have a token yet (cold start) — inject our saved one
        // so FAPI recognises the existing device and returns the live sessions.
        urlObj.searchParams.set('__clerk_db_jwt', cachedDbJwt);
        urlStr = urlObj.toString();
        console.log('[Goalsy:jwt] injected __clerk_db_jwt into cold-start FAPI request');
        // Rebuild input with the modified URL.
        input = input instanceof Request
          ? new Request(urlStr, input)
          : urlStr;
      }
    }

    const response = await _fetch(input as RequestInfo, init);

    if (isFapiCall) {
      // ── (b) Read token from Clerk-Db-Jwt response header (belt-and-suspenders)
      try {
        const jwtFromHeader = response.headers.get('Clerk-Db-Jwt')
                           ?? response.headers.get('clerk-db-jwt');
        if (jwtFromHeader) persistDbJwt(jwtFromHeader);
      } catch { /* non-fatal */ }

      // Diagnostic log — helps verify the correct client is restored.
      try {
        const clone = response.clone();
        const data = await clone.json().catch(() => null);
        if (data) {
          const path = (input instanceof Request ? input.url : String(input))
            .replace(FAPI_ORIGIN, '').split('?')[0];
          const clientUat: number | undefined = data?.client_uat ?? data?.response?.updated_at;
          const sessions: unknown[] = data?.response?.sessions ?? [];
          const clientId: string | undefined = data?.response?.id ?? data?.client?.id;
          console.log(
            `[Goalsy:fapi] ${path}`,
            '→ client_id:', clientId ?? 'N/A',
            '| client_uat:', clientUat ?? 'N/A',
            '| sessions:', sessions.length,
            '| last_active:', data?.response?.last_active_session_id ?? 'none',
          );
        }
      } catch { /* non-fatal */ }
    }

    return response;
  };
  console.log('[Goalsy:jwt] fetch interceptor installed, FAPI_ORIGIN:', FAPI_ORIGIN);
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

  useEffect(() => { initApiClient(getToken); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Refresh the session token when returning to the foreground so the next
  // API call doesn't 401 after the JS runtime was suspended.
  useEffect(() => {
    const handleVisibilityChange = async () => {
      if (!document.hidden) {
        try { await getToken({ skipCache: true }); } catch { /* auth guard handles */ }
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [getToken]);

  // Keepalive: refresh the token every 10 minutes so Clerk's inactivity clock
  // doesn't expire a long-running foreground session.
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

function App() {
  // Gate ClerkProvider on preloading the saved __clerk_db_jwt from Preferences.
  // The interceptor needs cachedDbJwt populated BEFORE Clerk makes its first
  // FAPI request, so we wait here — Preferences.get is typically < 10 ms.
  // Non-Capacitor builds skip immediately (storageReady starts as true).
  const [storageReady, setStorageReady] = useState(!isCapacitor);

  useEffect(() => {
    document.documentElement.classList.add('dark');
    if (!isCapacitor) return;
    preloadDbJwt().finally(() => setStorageReady(true));
  }, []);

  if (!storageReady) return <SplashScreen />;

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
