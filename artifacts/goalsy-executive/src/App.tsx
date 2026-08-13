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

// ── Capacitor Preferences mirror for Clerk localStorage ──────────────────────
//
// WKWebView localStorage is purgeable OS data — iOS can silently wipe it under
// memory pressure, clearing Clerk's __clerk_db_jwt device token and forcing a
// full sign-out on next cold start. Capacitor Preferences is backed by iOS
// UserDefaults (never purged by the OS), so we mirror all __clerk_* keys there.
//
// saveClerkToPreferences() is called:
//   (a) when the app goes to the background (visibilitychange hidden=true)
//   (b) every 10 minutes via the keepalive interval
//
// restoreClerkFromPreferences() runs once on cold start, BEFORE ClerkProvider
// mounts, so Clerk finds the device token already in localStorage and can call
// FAPI to restore the session without requiring re-authentication.

// Prefix scheme:
//   cm_ls_  — mirrors a localStorage key into Preferences (restored on cold start)
//   cm_dbg_ — diagnostic metadata written by save/restore (never written back to localStorage)
const LS_PREFIX  = 'cm_ls_';
const DBG_PREFIX = 'cm_dbg_';

/** Snapshot of all localStorage keys, so we can see what Clerk actually stores. */
function lsKeys(): string[] {
  const keys: string[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i);
    if (k) keys.push(k);
  }
  return keys;
}

async function saveClerkToPreferences(): Promise<void> {
  if (!isCapacitor) return;
  try {
    const keys = lsKeys();
    const cookies = document.cookie;
    console.log('[Goalsy:save] ALL localStorage keys:', keys);
    console.log('[Goalsy:save] document.cookie:', cookies || '(empty)');

    // Mirror every localStorage key — we don't filter by prefix here because
    // we don't yet know which key holds the session token.
    for (const key of keys) {
      const value = localStorage.getItem(key);
      if (value != null) {
        await Preferences.set({ key: `${LS_PREFIX}${key}`, value });
        console.log('[Goalsy:save] saved:', key, '(', value.length, 'chars)');
      }
    }

    // Also save cookies — Clerk may store the session token as a cookie
    // rather than in localStorage.
    await Preferences.set({ key: `${LS_PREFIX}__cookies__`, value: cookies });

    // Write a diagnostic record so dumpAndSave can report it on the NEXT launch.
    await Preferences.set({
      key: `${DBG_PREFIX}last_save`,
      value: JSON.stringify({ time: new Date().toISOString(), lsKeys: keys, cookies: cookies.slice(0, 300) }),
    });

    console.log('[Goalsy:save] done —', keys.length, 'ls keys + cookies saved');
  } catch (err) {
    console.error('[Goalsy:save] Preferences.set FAILED:', err);
  }
}

async function restoreClerkFromPreferences(): Promise<void> {
  console.log('[Goalsy:restore] called. isCapacitor:', isCapacitor);
  if (!isCapacitor) return;

  const lsBefore = lsKeys();
  const cookiesBefore = document.cookie;

  // Write a cold-start diagnostic record IMMEDIATELY to Preferences so that
  // even if Clerk hangs and ApiClientBootstrap never mounts, dumpAndSave will
  // find this record and report what happened during this cold start.
  try {
    await Preferences.set({
      key: `${DBG_PREFIX}cold_start`,
      value: JSON.stringify({ time: new Date().toISOString(), lsBefore, cookiesBefore: cookiesBefore.slice(0, 300) }),
    });
  } catch { /* if even this fails, the bridge is fully broken */ }

  try {
    const { keys: prefKeys } = await Preferences.keys();
    console.log('[Goalsy:restore] Preferences keys found:', prefKeys);

    // Restore every ls-mirror key back to localStorage.
    const mirrorKeys = prefKeys.filter(k => k.startsWith(LS_PREFIX) && k !== `${LS_PREFIX}__cookies__`);
    console.log('[Goalsy:restore] localStorage mirrors to restore:', mirrorKeys.length);
    for (const pk of mirrorKeys) {
      const lsKey = pk.slice(LS_PREFIX.length);
      const { value } = await Preferences.get({ key: pk });
      if (value != null) {
        localStorage.setItem(lsKey, value);
        console.log('[Goalsy:restore] restored to localStorage:', lsKey);
      }
    }

    // Note: cookies saved from the previous session are logged here for
    // inspection — we can't write them back via document.cookie in WKWebView
    // reliably, but seeing them tells us whether the session token IS a cookie.
    const { value: savedCookies } = await Preferences.get({ key: `${LS_PREFIX}__cookies__` });
    console.log('[Goalsy:restore] cookies from last session:', savedCookies || '(none saved)');

    // ── Inject __client_uat cookie ──────────────────────────────────────────
    // This is the key session-restoration step. Clerk reads document.cookie
    // for __client_uat and passes it as ?__clerk_uat= to FAPI, which then
    // finds and returns the existing session — even in a cross-origin context.
    const { value: savedUat } = await Preferences.get({ key: 'cm_clerk_uat' }).catch(() => ({ value: null }));
    if (savedUat) {
      document.cookie = `__client_uat=${savedUat}; path=/; max-age=2592000`;
      console.log('[Goalsy:restore] injected __client_uat into document.cookie:', savedUat);
    } else {
      console.log('[Goalsy:restore] no __client_uat in Preferences yet (first launch after install)');
    }

    const lsAfter = lsKeys();
    await Preferences.set({
      key: `${DBG_PREFIX}restore_result`,
      value: JSON.stringify({ time: new Date().toISOString(), restored: mirrorKeys.length, lsAfter, uatInjected: !!savedUat }),
    });

    console.log('[Goalsy:restore] done, restored', mirrorKeys.length, 'ls keys, __client_uat injected:', !!savedUat);
  } catch (err) {
    console.error('[Goalsy:restore] Preferences FAILED:', err);
    await Preferences.set({ key: `${DBG_PREFIX}restore_error`, value: String(err) }).catch(() => {});
  }
}

/** Dumps localStorage, cookies, and all Preferences state to the console.
 *  Reads persistent diagnostic records from previous cold start so this
 *  information is available even when Web Inspector wasn't connected at boot. */
async function dumpAndSave(label: string): Promise<void> {
  const keys = lsKeys();
  console.log(`[Goalsy:${label}] isCapacitor:`, isCapacitor);
  console.log(`[Goalsy:${label}] ALL localStorage keys (${keys.length}):`, keys);
  console.log(`[Goalsy:${label}] document.cookie:`, document.cookie || '(empty)');

  // window.Clerk.client shows exactly what Clerk has in memory —
  // updatedAt here equals the __client_uat value we need to persist.
  const clerkClient = (window as any).Clerk?.client as {
    id?: string; updatedAt?: number; lastActiveSessionId?: string | null;
    sessions?: Array<{ id: string; status: string }>;
  } | undefined;
  if (clerkClient) {
    console.log(`[Goalsy:${label}] window.Clerk.client:`, JSON.stringify({
      id: clerkClient.id,
      updatedAt: clerkClient.updatedAt,
      lastActiveSessionId: clerkClient.lastActiveSessionId,
      sessions: clerkClient.sessions?.map(s => ({ id: s.id, status: s.status })),
    }));
    // Save updatedAt directly as a belt-and-suspenders backup for the interceptor.
    if (typeof clerkClient.updatedAt === 'number' && clerkClient.updatedAt > 0) {
      document.cookie = `__client_uat=${clerkClient.updatedAt}; path=/; max-age=2592000`;
      await Preferences.set({ key: 'cm_clerk_uat', value: String(clerkClient.updatedAt) }).catch(() => {});
      console.log(`[Goalsy:${label}] saved window.Clerk.client.updatedAt as __client_uat:`, clerkClient.updatedAt);
    }
  } else {
    console.log(`[Goalsy:${label}] window.Clerk.client: not available yet`);
  }

  if (isCapacitor) {
    try {
      const { keys: prefKeys } = await Preferences.keys();
      console.log(`[Goalsy:${label}] Preferences keys (${prefKeys.length}):`, prefKeys);

      // Read the persistent diagnostic records written during the last cold start
      // and last save — these tell us what happened even if Web Inspector wasn't
      // connected at the time.
      for (const dbgKey of [`${DBG_PREFIX}cold_start`, `${DBG_PREFIX}restore_result`, `${DBG_PREFIX}restore_error`, `${DBG_PREFIX}last_save`, 'cm_clerk_uat']) {
        if (prefKeys.includes(dbgKey)) {
          const { value } = await Preferences.get({ key: dbgKey });
          console.log(`[Goalsy:${label}] [PERSISTENT] ${dbgKey}:`, value);
        }
      }

      // Also log all current ls-mirror values (first 80 chars each).
      for (const k of prefKeys.filter(k => k.startsWith(LS_PREFIX))) {
        const { value } = await Preferences.get({ key: k });
        console.log(`[Goalsy:${label}] Pref["${k}"] =`, value?.substring(0, 80) ?? 'null');
      }
    } catch (err) {
      console.error(`[Goalsy:${label}] Preferences READ failed:`, err);
    }
  }

  await saveClerkToPreferences();
}

// Resolve the Clerk publishable key.
// In a normal browser the hostname matches the Clerk domain and publishableKeyFromHost
// derives the key automatically. Inside a Capacitor WebView the hostname is always
// "localhost" regardless of the real Clerk domain — publishableKeyFromHost then
// constructs a key whose embedded frontend API resolves to "clerk.localhost", which
// doesn't exist, causing Clerk's JS bundle load to fail and the app to show a blank
// screen. We detect the Capacitor runtime via window.Capacitor (always set on both
// Android and iOS) and bypass the hostname derivation entirely, using the key baked
// into the bundle at Vite build time.
const isCapacitor = !!(window as any).Capacitor;
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

// ── FAPI fetch interceptor ────────────────────────────────────────────────────
//
// Root cause of session sign-out after force-kill:
//   Clerk normally persists the session via a __client_uat cookie set by FAPI.
//   In this Capacitor/WKWebView context the app runs on `localhost` while FAPI
//   is cross-origin. WKWebView enforces SameSite restrictions, so the cookie is
//   never sent back to FAPI on cold start — Clerk sees no existing session.
//
// Fix:
//   1. Wrap window.fetch BEFORE Clerk loads its CDN script (ClerkProvider is
//      what triggers the dynamic script load, so this module-level interceptor
//      is always installed first).
//   2. Intercept every FAPI JSON response to extract the `client_uat` timestamp
//      and the full client/session data for diagnostics.
//   3. Persist `client_uat` to Capacitor Preferences (backed by UserDefaults —
//      never purged by iOS).
//   4. On cold start restoreClerkFromPreferences() injects it back as
//      document.cookie on localhost. Clerk reads document.cookie for
//      __client_uat and passes it as ?__clerk_uat=VALUE to FAPI, which then
//      restores the session without re-authentication.

/** Derives the FAPI base URL (e.g. https://happy-app-0.clerk.accounts.dev)
 *  from the publishable key (pk_live_BASE64$ or pk_test_BASE64$). */
function computeFapiUrl(): string {
  try {
    const key = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY ?? '';
    const b64 = key.replace(/^pk_(live|test)_/, '');
    const decoded = atob(b64).replace(/\$$/, ''); // strip trailing $
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

    // Only intercept actual FAPI API calls, not the clerk-js CDN bundle.
    const isFapiCall = url.startsWith(FAPI_ORIGIN) && !url.includes('/npm/@clerk');
    if (isFapiCall) {
      try {
        const clone = response.clone();
        const data = await clone.json().catch(() => null);
        if (data) {
          const path = url.replace(FAPI_ORIGIN, '').split('?')[0];
          // client_uat can be at the top level or derived from client.updatedAt
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

          if (typeof clientUat === 'number' && clientUat > 0) {
            // Inject immediately so Clerk can read it for this session too
            document.cookie = `__client_uat=${clientUat}; path=/; max-age=2592000`;
            // Persist so restoreClerkFromPreferences() can inject it on next cold start
            Preferences.set({ key: 'cm_clerk_uat', value: String(clientUat) }).catch(() => {});
            console.log('[Goalsy:fapi] persisted __client_uat:', clientUat);
          }
        }
      } catch { /* non-fatal — never break the original fetch */ }
    }

    return response;
  };
  console.log('[Goalsy:fapi] fetch interceptor installed, FAPI_ORIGIN:', FAPI_ORIGIN);
}

// Screens that require a signed-in user. Signed-out visitors are redirected to /welcome.
function AuthGate({ component: Component }: { component: ComponentType }) {
  return (
    <>
      <Show when="signed-in">
        <Component />
      </Show>
      <Show when="signed-out">
        <Redirect to="/welcome" />
      </Show>
    </>
  );
}

// Auth screens (welcome/sign-in/create-account) redirect a signed-in user straight into the app.
function GuestOnly({ component: Component }: { component: ComponentType }) {
  return (
    <>
      <Show when="signed-out">
        <Component />
      </Show>
      <Show when="signed-in">
        <Redirect to="/ai-home" />
      </Show>
    </>
  );
}

function HomeRedirect() {
  return (
    <>
      <Show when="signed-in">
        <Redirect to="/ai-home" />
      </Show>
      <Show when="signed-out">
        <SplashScreen />
      </Show>
    </>
  );
}

function Router() {
  return (
    <Switch>
      <Route path="/" component={HomeRedirect} />
      <Route path="/welcome" component={() => <GuestOnly component={WelcomeScreen} />} />
      <Route path="/signin" component={() => <GuestOnly component={SignInScreen} />} />
      <Route path="/create-account" component={() => <GuestOnly component={CreateAccountScreen} />} />
      <Route path="/financial-connection" component={() => <AuthGate component={FinancialConnectionScreen} />} />
      <Route path="/ai-home" component={() => <AuthGate component={AIHomeScreen} />} />
      <Route path="/today" component={() => <AuthGate component={TodayScreen} />} />
      <Route path="/financial-health" component={() => <AuthGate component={FinancialHealthScreen} />} />
      <Route path="/calendar" component={() => <AuthGate component={CalendarScreen} />} />
      <Route path="/goals" component={() => <AuthGate component={GoalsOverviewScreen} />} />
      <Route path="/goals/:id" component={() => <AuthGate component={GoalDetailScreen} />} />
      <Route path="/profile" component={() => <AuthGate component={ProfileScreen} />} />
      <Route path="/score" component={() => <AuthGate component={ScoreScreen} />} />
      <Route component={NotFound} />
    </Switch>
  );
}

/** Runs once inside ClerkLoaded — wires the Clerk session token to every API request. */
function ApiClientBootstrap() {
  const { getToken } = useAuth();
  useEffect(() => { initApiClient(getToken); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Handle foreground/background transitions:
  //   • Going to background (hidden=true)  → save Clerk localStorage to Preferences
  //     so it survives if iOS kills the process while backgrounded.
  //   • Coming to foreground (hidden=false) → force-refresh the token so the next
  //     API call doesn't 401 after the JS runtime was suspended during sleep.
  useEffect(() => {
    const handleVisibilityChange = async () => {
      if (document.hidden) {
        // App is going to background — snapshot now before iOS can kill the process
        await saveClerkToPreferences();
      } else {
        // App is returning to foreground — refresh the token in case it lapsed,
        // then re-dump localStorage so Web Inspector shows current state on demand
        // (background + reopen = instant triggered dump without needing app restart).
        try { await getToken({ skipCache: true }); } catch { /* expired — auth guard handles */ }
        await dumpAndSave('foreground');
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [getToken]);

  // Keepalive: every 10 minutes while in the foreground — refreshes the token
  // (resets Clerk's inactivity clock) and re-saves to Preferences so the mirror
  // stays current even when the user stays in the app without backgrounding it.
  useEffect(() => {
    const interval = setInterval(async () => {
      if (!document.hidden) {
        try { await getToken({ skipCache: true }); } catch { /* ignore */ }
        await saveClerkToPreferences();
      }
    }, 10 * 60 * 1000);
    return () => clearInterval(interval);
  }, [getToken]);

  // Initial save + full diagnostic dump.
  // Delayed 30 s — long enough for the user to see the Welcome/Goals screen,
  // force-kill, reopen, reattach Safari Web Inspector to the new WebView, and
  // still catch the output. The foreground trigger (visibilitychange) gives an
  // on-demand alternative: background the app and reopen to fire it immediately.
  useEffect(() => {
    const t = setTimeout(() => { dumpAndSave('clerk-loaded/startup'); }, 30_000);
    return () => clearTimeout(t);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return null;
}

function ClerkProviderWithRoutes() {
  const [, setLocation] = useLocation();

  return (
    <ClerkProvider
      publishableKey={clerkPubKey}
      proxyUrl={clerkProxyUrl}
      routerPush={(to) => setLocation(to)}
      routerReplace={(to) => setLocation(to, { replace: true })}
    >
      {/* Show SplashScreen while Clerk resolves auth state so the preview
          never displays a blank page. Once loaded, Show/signed-in/signed-out
          take over as normal. */}
      <ClerkLoading>
        <SplashScreen />
      </ClerkLoading>
      <ClerkLoaded>
        <ApiClientBootstrap />
        <Router />
      </ClerkLoaded>
    </ClerkProvider>
  );
}

function App() {
  // On Capacitor, restore Clerk's __clerk_* keys from UserDefaults-backed
  // Preferences into localStorage BEFORE ClerkProvider mounts. This ensures
  // Clerk finds its device token on cold start even if iOS purged WKWebView
  // storage. On web (non-Capacitor) skip immediately — no gate needed.
  const [storageReady, setStorageReady] = useState(!isCapacitor);

  useEffect(() => {
    document.documentElement.classList.add('dark');
    if (!isCapacitor) return;
    restoreClerkFromPreferences().finally(() => setStorageReady(true));
  }, []);

  // Show the splash screen for the < 50 ms it takes to read from Preferences.
  // This is indistinguishable from the normal Clerk loading splash.
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
