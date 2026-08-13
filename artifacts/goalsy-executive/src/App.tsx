import { useEffect, type ComponentType } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ClerkProvider, ClerkLoading, ClerkLoaded, Show, useAuth } from '@clerk/react';
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
//
// window.Capacitor is injected by the Capacitor bridge on both iOS and Android.
// In a normal browser it is undefined.
const isCapacitor = !!(window as any).Capacitor;

// ── Clerk publishable key & proxy URL ────────────────────────────────────────
//
// In a normal browser the hostname matches the Clerk domain and
// publishableKeyFromHost derives the key automatically.  Inside a Capacitor
// WebView the hostname is always "localhost" regardless of the real Clerk
// domain — publishableKeyFromHost then constructs a key whose embedded
// frontend API resolves to "clerk.localhost", which doesn't exist, causing
// Clerk's JS bundle load to fail.  We detect the Capacitor runtime and bypass
// the hostname derivation entirely, using the key baked into the bundle.
const clerkPubKey = isCapacitor
  ? import.meta.env.VITE_CLERK_PUBLISHABLE_KEY
  : publishableKeyFromHost(window.location.hostname, import.meta.env.VITE_CLERK_PUBLISHABLE_KEY);

// In the browser the Clerk proxy URL routes auth through Replit's domain.
// In a Capacitor native build Clerk must talk to its servers directly, so we
// clear the proxy URL — the allowNavigation list in capacitor.config.ts covers it.
const clerkProxyUrl = isCapacitor ? undefined : import.meta.env.VITE_CLERK_PROXY_URL;

if (!clerkPubKey) {
  throw new Error('Missing VITE_CLERK_PUBLISHABLE_KEY in .env file');
}

// ── FAPI diagnostic interceptor ───────────────────────────────────────────────
//
// Session persistence on iOS is handled entirely at the native Swift layer
// (AppDelegate.swift): WKHTTPCookieStore cookies for Clerk/FAPI domains are
// saved to UserDefaults in applicationDidEnterBackground and restored into
// WKHTTPCookieStore before the WebView loads on every cold start.
//
// This JS interceptor is diagnostic only — it logs FAPI responses so we can
// verify which client and sessions Clerk receives, without touching
// document.cookie or localStorage (both confirmed to never contain the
// httpOnly, cross-origin __client session cookie).

/** Derives the FAPI base URL from the publishable key (pk_live_BASE64$ or pk_test_BASE64$). */
function computeFapiUrl(): string {
  try {
    const key = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY ?? '';
    const b64 = key.replace(/^pk_(live|test)_/, '');
    const decoded = atob(b64).replace(/\$$/, '');
    return `https://${decoded}`;
  } catch {
    return '';
  }
}
const FAPI_ORIGIN = computeFapiUrl();

if (isCapacitor && FAPI_ORIGIN) {
  const _fetch = window.fetch.bind(window);
  (window as any).fetch = async function clerkFapiInterceptor(
    input: RequestInfo | URL,
    init?: RequestInit,
  ) {
    const url = input instanceof Request ? input.url : String(input);
    const response = await _fetch(input as RequestInfo, init);

    const isFapiCall = url.startsWith(FAPI_ORIGIN) && !url.includes('/npm/@clerk');
    if (isFapiCall) {
      try {
        const clone = response.clone();
        const data = await clone.json().catch(() => null);
        if (data) {
          const path = url.replace(FAPI_ORIGIN, '').split('?')[0];
          const clientUat: number | undefined =
            data?.client_uat ?? data?.response?.updated_at;
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
  console.log('[Goalsy:fapi] interceptor installed, FAPI_ORIGIN:', FAPI_ORIGIN);
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
      <Route path="/"                    component={HomeRedirect} />
      <Route path="/welcome"             component={() => <GuestOnly component={WelcomeScreen} />} />
      <Route path="/signin"              component={() => <GuestOnly component={SignInScreen} />} />
      <Route path="/create-account"      component={() => <GuestOnly component={CreateAccountScreen} />} />
      <Route path="/financial-connection" component={() => <AuthGate component={FinancialConnectionScreen} />} />
      <Route path="/ai-home"             component={() => <AuthGate component={AIHomeScreen} />} />
      <Route path="/today"               component={() => <AuthGate component={TodayScreen} />} />
      <Route path="/financial-health"    component={() => <AuthGate component={FinancialHealthScreen} />} />
      <Route path="/calendar"            component={() => <AuthGate component={CalendarScreen} />} />
      <Route path="/goals"               component={() => <AuthGate component={GoalsOverviewScreen} />} />
      <Route path="/goals/:id"           component={() => <AuthGate component={GoalDetailScreen} />} />
      <Route path="/profile"             component={() => <AuthGate component={ProfileScreen} />} />
      <Route path="/score"               component={() => <AuthGate component={ScoreScreen} />} />
      <Route component={NotFound} />
    </Switch>
  );
}

// ── ApiClientBootstrap ────────────────────────────────────────────────────────
//
// Runs inside ClerkLoaded — wires the Clerk session token into every API
// request and keeps the auth clock alive while the app is in the foreground.

function ApiClientBootstrap() {
  const { getToken } = useAuth();

  // Wire Clerk token → API client.
  useEffect(() => { initApiClient(getToken); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Foreground/background transitions.
  // • Returning to foreground: refresh the token so the next API call doesn't
  //   401 after the JS runtime was suspended during sleep.  Native AppDelegate
  //   handles WKHTTPCookieStore persistence — no JS cookie work needed here.
  useEffect(() => {
    const handleVisibilityChange = async () => {
      if (!document.hidden) {
        try { await getToken({ skipCache: true }); } catch { /* expired — auth guard handles */ }
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [getToken]);

  // Keepalive: refresh the token every 10 minutes while in the foreground so
  // Clerk's inactivity clock doesn't expire a long-running session.
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
      {/* Show SplashScreen while Clerk resolves auth state. */}
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
  useEffect(() => {
    document.documentElement.classList.add('dark');
  }, []);

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
