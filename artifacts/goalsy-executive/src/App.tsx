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

const PREF_PREFIX = 'cm_'; // namespace prefix to avoid collisions

async function saveClerkToPreferences(): Promise<void> {
  if (!isCapacitor) return;
  try {
    // Dump all localStorage keys so Safari Web Inspector shows us what Clerk
    // actually stores — key names confirmed here, not assumed.
    const allKeys: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k) allKeys.push(k);
    }
    console.log('[Goalsy:save] localStorage keys at save time:', allKeys);

    const clerkKeys = allKeys.filter(k => k.startsWith('__clerk'));
    console.log('[Goalsy:save] __clerk* keys found:', clerkKeys);

    for (const key of clerkKeys) {
      const value = localStorage.getItem(key);
      if (value != null) {
        await Preferences.set({ key: `${PREF_PREFIX}${key}`, value });
        console.log('[Goalsy:save] saved to Preferences:', key, '(length:', value.length, ')');
      }
    }
    console.log('[Goalsy:save] done, saved', clerkKeys.length, 'keys');
  } catch (err) {
    console.error('[Goalsy:save] Preferences.set FAILED — native bridge not wired?', err);
  }
}

async function restoreClerkFromPreferences(): Promise<void> {
  // Log before the early return so we always see whether this function ran,
  // regardless of whether the native bridge is wired.
  console.log('[Goalsy:restore] called. isCapacitor:', isCapacitor);
  if (!isCapacitor) return;
  try {
    // Log everything currently in localStorage before we touch it — this tells
    // us whether anything survived the app kill without our help.
    const lsSnapshot: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k) lsSnapshot.push(k);
    }
    console.log('[Goalsy:restore] localStorage on cold start (before restore):', lsSnapshot);

    const { keys: prefKeys } = await Preferences.keys();
    console.log('[Goalsy:restore] Preferences keys found:', prefKeys);

    const clerkPrefKeys = prefKeys.filter(k => k.startsWith(PREF_PREFIX));
    console.log('[Goalsy:restore] clerk mirror keys in Preferences:', clerkPrefKeys);

    for (const prefKey of clerkPrefKeys) {
      const lsKey = prefKey.slice(PREF_PREFIX.length);
      const { value } = await Preferences.get({ key: prefKey });
      if (value != null) {
        localStorage.setItem(lsKey, value);
        console.log('[Goalsy:restore] restored to localStorage:', lsKey);
      }
    }
    console.log('[Goalsy:restore] done, restored', clerkPrefKeys.length, 'keys');
  } catch (err) {
    console.error('[Goalsy:restore] Preferences FAILED — native bridge not wired?', err);
    // Non-fatal — ClerkProvider still mounts and attempts its own restore
  }
}

/** Dumps all localStorage keys AND all Preferences keys to the console, then
 *  mirrors __clerk* to Preferences. label identifies the call-site in the log. */
async function dumpAndSave(label: string): Promise<void> {
  // --- localStorage snapshot ---
  const allKeys: string[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i);
    if (k) allKeys.push(k);
  }
  console.log(`[Goalsy:${label}] isCapacitor:`, isCapacitor);
  console.log(`[Goalsy:${label}] all localStorage keys (${allKeys.length}):`, allKeys);
  console.log(`[Goalsy:${label}] __clerk* subset:`, allKeys.filter(k => k.startsWith('__clerk')));

  // --- Preferences snapshot (tells us whether the native bridge is wired and
  //     whether a previous save actually persisted anything) ---
  if (isCapacitor) {
    try {
      const { keys: prefKeys } = await Preferences.keys();
      console.log(`[Goalsy:${label}] Preferences keys (${prefKeys.length}):`, prefKeys);
      for (const k of prefKeys) {
        const { value } = await Preferences.get({ key: k });
        // Log first 80 chars so tokens are recognisable without filling the console.
        console.log(`[Goalsy:${label}] Preferences["${k}"] =`, value?.substring(0, 80) ?? 'null');
      }
    } catch (err) {
      console.error(`[Goalsy:${label}] Preferences READ failed — native bridge missing?`, err);
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
