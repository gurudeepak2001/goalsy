// ── Goalsy App entry point ────────────────────────────────────────────────────
// FIRST executable line — confirms JS execution reached this module.
console.log('[Goalsy] App.tsx module loading');

import { useEffect, useRef, useState, type ComponentType } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ClerkProvider, ClerkLoading, ClerkLoaded, Show, useAuth } from '@clerk/react';
import { Preferences } from '@capacitor/preferences';
import ErrorBoundary from '@/components/ErrorBoundary';
import { initApiClient } from '@/lib/apiClient';
import { useToast } from '@/hooks/use-toast';
// NOTE: We intentionally do NOT use @clerk/react/internal's publishableKeyFromHost.
// That function is a private Clerk SDK API and returns the dev key for .replit.app
// domains (it treats them as development environments). Instead we derive the live
// key ourselves using the canonical Clerk formula:
//   pk_live_  +  base64url( "clerk.<host>$" )
function deriveLivePublishableKey(host: string): string {
  const raw = `clerk.${host}$`;
  // btoa is available in both browsers and WKWebView
  const b64 = btoa(raw);
  // base64url: replace URL-unsafe chars, strip padding
  return 'pk_live_' + b64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
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

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Never auto-retry failed queries — a 401 storm would hammer the API.
      // Explicit user action (pull-to-refresh, navigation) triggers refetches.
      retry: false,
      staleTime: 60_000,
      refetchOnWindowFocus: false,
    },
  },
});
const basePath = import.meta.env.BASE_URL.replace(/\/$/, '');

// ── Runtime detection ─────────────────────────────────────────────────────────
const isCapacitor = !!(window as any).Capacitor;
console.log('[Goalsy] isCapacitor:', isCapacitor);

// ── Production-native detection ───────────────────────────────────────────────
// When cap:build bakes in VITE_API_BASE_URL (always the deployed production
// server), this build targets the production Clerk instance (live keys, swapped
// in at publish time). The dev-instance (pk_test) machinery — dev_browser JWT
// persistence, fetch interceptor — does not apply and must be gated off.
const nativeApiBase = isCapacitor ? (import.meta.env.VITE_API_BASE_URL ?? '') : '';
const nativeApiHost = (() => {
  try { return nativeApiBase ? new URL(nativeApiBase).hostname : ''; } catch { return ''; }
})();
console.log('[Goalsy] nativeApiHost:', nativeApiHost || '(none — web preview)');

// ── Clerk publishable key & proxy URL ────────────────────────────────────────
// Wrapped in try/catch so a derivation failure renders a visible error screen
// rather than crashing the module (which would bypass the ErrorBoundary and
// leave a permanent blank white screen with no recovery path).
let clerkPubKey = '';
let _clerkInitError: string | null = null;
try {
  clerkPubKey = isCapacitor
    ? (nativeApiHost
        // Derive the live key directly — never use a pk_test fallback here.
        ? deriveLivePublishableKey(nativeApiHost)
        : (import.meta.env.VITE_CLERK_PUBLISHABLE_KEY ?? ''))
    // Web preview: use the baked-in key (pk_test for dev, pk_live for prod)
    : (import.meta.env.VITE_CLERK_PUBLISHABLE_KEY ?? '');
  if (!clerkPubKey) {
    _clerkInitError = 'Missing Clerk publishable key — set VITE_CLERK_PUBLISHABLE_KEY in your .env file.';
  }
} catch (e) {
  _clerkInitError = `Clerk key derivation failed: ${e instanceof Error ? e.message : String(e)}`;
  console.error('[Goalsy] clerkPubKey error:', _clerkInitError);
}

// No proxyUrl for Capacitor. We previously routed through /api/__clerk to work
// around a presumed CORS restriction on Clerk's FAPI, but confirmed (2026-08-14)
// that clerk.goalsy-finance-ui.replit.app already responds with:
//   Access-Control-Allow-Origin: capacitor://localhost
// so no CORS shim is needed. The server-side proxy was causing /v1/* requests
// to hang because inside the Replit container that hostname resolves to Replit's
// own internal proxy (172.24.0.5), not Clerk's infrastructure. Clerk JS now
// calls the FAPI directly from WKWebView, which resolves the hostname correctly.
// VITE_CLERK_PROXY_URL can still be set for local web-preview testing if needed.
const clerkProxyUrl = import.meta.env.VITE_CLERK_PROXY_URL as string | undefined;

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
const DEBUG_PREF_KEY = 'cm_debug_restore';
let cachedDbJwt: string | null = null;
let hadSavedToken = false;   // a token existed in Preferences at launch
let restoreDone = false;     // restoreDbJwtIntoUrl() has run

// The __clerk_db_jwt is a dev-browser device token — it is NOT a session JWT.
// Clerk dev instances generate these as short base64 strings (~31 chars), so
// the minimum is intentionally low. We only discard truly empty/whitespace
// values that would be useless to pass to Clerk.
const MIN_JWT_LENGTH = 8;

// ── Persistent, console-free diagnostics ─────────────────────────────────────
// Every entry is written to Preferences immediately, so it survives force-kill
// and can be read later without Web Inspector (5-tap the Welcome header).
let debugEntries: Array<Record<string, unknown>> = [];
function debugRecord(entry: Record<string, unknown>): void {
  try {
    debugEntries.push({ t: new Date().toISOString(), ...entry });
    if (debugEntries.length > 25) debugEntries = debugEntries.slice(-25);
    Preferences.set({ key: DEBUG_PREF_KEY, value: JSON.stringify(debugEntries, null, 1) }).catch(() => {});
  } catch { /* never crash */ }
}

async function preloadDbJwt(): Promise<void> {
  // Production native builds use the live Clerk instance — the dev_browser JWT
  // is a dev-instance-only concept. Gate off entirely for production builds.
  if (!isCapacitor || nativeApiHost) return;
  try {
    const { value } = await Preferences.get({ key: DB_JWT_PREF_KEY });
    if (value && value.length >= MIN_JWT_LENGTH) {
      cachedDbJwt = value;
      hadSavedToken = true;
      console.log('[Goalsy:jwt] preloaded __clerk_db_jwt (len:', value.length, ')');
      debugRecord({ step: 'preload', found: true, tokenLen: value.length });
    } else if (value) {
      // Too short to be a real JWT — discard so we don't poison Clerk's session.
      Preferences.remove({ key: DB_JWT_PREF_KEY }).catch(() => {});
      console.log('[Goalsy:jwt] discarded corrupt stored JWT (len:', value.length, ')');
      debugRecord({ step: 'preload', found: true, discarded: true, tokenLen: value.length });
    } else {
      console.log('[Goalsy:jwt] no saved __clerk_db_jwt — first launch');
      debugRecord({ step: 'preload', found: false });
    }
  } catch (err) {
    console.log('[Goalsy:jwt] preload skipped:', err);
    debugRecord({ step: 'preload', error: String(err) });
  }
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
      debugRecord({ step: 'restore', skipped: 'no saved token' });
      return;
    }
    const url = new URL(window.location.href);
    if (!url.searchParams.get('__clerk_db_jwt')) {
      url.searchParams.set('__clerk_db_jwt', cachedDbJwt);
      window.history.replaceState(null, '', url.toString());
    }
    restoreDone = true;
    console.log('[Goalsy:jwt] restored __clerk_db_jwt into URL for Clerk pickup');
    debugRecord({ step: 'restore', ok: true, tokenLen: cachedDbJwt.length });
  } catch (err) {
    restoreDone = true;
    debugRecord({ step: 'restore', error: String(err) });
  }
}

function persistDbJwt(token: string, source: string): void {
  try {
    if (!token || token === cachedDbJwt) return;
    // Never persist a value too short to be a real JWT — a truncated or bogus
    // URL param would overwrite the good saved token and sign the user out
    // on next launch.
    if (token.length < MIN_JWT_LENGTH) return;
    // Clobber guard: until the preload+restore sequence has settled we cannot
    // know whether a saved token exists — refuse ALL writes so a freshly minted
    // (session-less) token can never overwrite an unread saved one.
    if (!restoreDone) {
      debugRecord({ step: 'persist-refused', source, reason: 'restore not settled — refusing write' });
      return;
    }
    cachedDbJwt = token;
    Preferences.set({ key: DB_JWT_PREF_KEY, value: token }).catch(() => {});
    console.log('[Goalsy:jwt] persisted __clerk_db_jwt (len:', token.length, ', source:', source, ')');
    debugRecord({ step: 'persist', source, tokenLen: token.length });
  } catch { /* never crash the fetch call */ }
}

// ── Remote config fetch ───────────────────────────────────────────────────────
// In production native builds the server holds the correct pk_live_ publishable
// key in CLERK_PUBLISHABLE_KEY.  Fetch it at boot so Clerk JS initialises with
// the exact key the server validates against — no hostname derivation guesswork.
async function fetchRemoteClerkKey(): Promise<void> {
  if (!isCapacitor || !nativeApiBase) return;
  const controller = new AbortController();
  const tid = setTimeout(() => controller.abort(), 5000);
  try {
    const r = await fetch(`${nativeApiBase}/api/config`, {
      signal: controller.signal,
      headers: { 'Accept': 'application/json' },
    });
    const json = await r.json() as { clerkPublishableKey?: string };
    if (json.clerkPublishableKey) {
      clerkPubKey = json.clerkPublishableKey;
      console.log('[Goalsy] clerkPubKey from server:', clerkPubKey.slice(0, 20), '…');
      debugRecord({ step: 'config-fetch', keyPrefix: clerkPubKey.slice(0, 15) });
    }
  } catch (e) {
    // Network failure — fall back to the derived key from deriveLivePublishableKey.
    console.log('[Goalsy] config fetch failed, using derived key. Error:', String(e));
    debugRecord({ step: 'config-fetch', error: String(e) });
  } finally {
    clearTimeout(tid);
  }
}

// Preload then restore, at module evaluation — Preferences.get is a fast native
// bridge call (~ms) while Clerk's CDN bundle takes hundreds of ms to load, so
// the URL is decorated well before clerk-js reads window.location.
const _preloadPromise: Promise<void> = preloadDbJwt().then(restoreDbJwtIntoUrl);

// Boot gate: ClerkProvider must not mount until the JWT restore and the remote
// config fetch have both settled — never wait more than 4s total (the config
// fetch has its own 5s abort but we cap the whole gate to protect against any
// other stuck async at startup).
const bootReady: Promise<void> = Promise.race([
  Promise.all([_preloadPromise, fetchRemoteClerkKey(), restoreClerkLocalStorage()]).then(() => {}),
  new Promise<void>((resolve) => setTimeout(() => {
    if (!restoreDone) debugRecord({ step: 'boot-gate', timedOut: true });
    resolve();
  }, 4000)),
]).catch(() => {});

// ── FAPI base URL (dev-only fetch-interceptor path) ───────────────────────────
// For production native builds (nativeApiHost set) the fetch interceptor is
// gated OFF — FAPI_ORIGIN is irrelevant there.  On dev/web it is derived from
// VITE_CLERK_PUBLISHABLE_KEY so the interceptor knows which Clerk FAPI to watch.
function computeFapiUrl(): string {
  try {
    const key = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY ?? '';
    const b64 = key.replace(/^pk_(live|test)_/, '');
    return `https://${atob(b64).replace(/\$$/, '')}`;
  } catch { return ''; }
}
const FAPI_ORIGIN = computeFapiUrl();

// clerkJSUrl — explicit clerk.browser.js location for Capacitor native builds.
//
// Problem: @clerk/react@6.12.2 calls getClerkJsEntryChunk() at runtime, which
// fetches https://<fapi>/npm/@clerk/clerk-js@6.12.2/dist/clerk.browser.js.
// The FAPI does not host that exact patch version — it 404s. Only the @6 semver
// range redirect (→ 6.29.0) returns 200 with access-control-allow-origin: *.
//
// Fix: supply the @6 URL explicitly so WKWebView can load it successfully.
// Must be declared AFTER FAPI_ORIGIN (TDZ guard).
const clerkJSUrl: string | undefined =
  isCapacitor && nativeApiHost && FAPI_ORIGIN
    ? `${FAPI_ORIGIN}/npm/@clerk/clerk-js@6/dist/clerk.browser.js`
    : undefined;

// Log the initial clerkPubKey so native Xcode output confirms pk_live_ or pk_test_.
console.log('[Goalsy] clerkPubKey (initial):', clerkPubKey.slice(0, 20), '…');
console.log('[Goalsy] FAPI_ORIGIN (dev-only interceptor):', FAPI_ORIGIN);

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

        try {
          const data = await response.clone().json().catch(() => null);
          if (data) {
            const path = (input instanceof Request ? input.url : String(input))
              .replace(FAPI_ORIGIN, '').split('?')[0];
            // Different FAPI endpoints return different shapes:
            //   /v1/client, /v1/environment  → { response: { id, sessions, ... } }
            //   /v1/client/sessions/*/tokens → { jwt: '...' }  (not a client object)
            //   /v1/client/sessions/*/touch  → { response: { id } }
            const isClientShape = data?.response?.id !== undefined && Array.isArray(data?.response?.sessions);
            const isTokenShape  = typeof data?.jwt === 'string';
            if (isClientShape) {
              const clientId = data.response.id;
              const sessions = (data.response.sessions ?? []).length;
              console.log(`[Goalsy:fapi] ${path}`,
                '→ client_id:', clientId,
                '| sessions:', sessions,
                '| last_active:', data.response.last_active_session_id ?? 'none');
              if (path === '/v1/client' || path === '/v1/environment' || path === '/v1/dev_browser') {
                debugRecord({ step: 'fapi', path, status: response.status,
                  clientId, sessions,
                  hadJwtInUrl: originalUrl.includes('__clerk_db_jwt') });
              }
            } else if (isTokenShape) {
              console.log(`[Goalsy:fapi] ${path}`, '→ jwt (len:', data.jwt.length, ')');
            } else {
              console.log(`[Goalsy:fapi] ${path}`, '→ status:', response.status,
                '| keys:', Object.keys(data).join(','));
            }
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

// ── Clerk localStorage persistence (Capacitor only) ──────────────────────────
// Snapshot any Clerk-written localStorage keys to Capacitor Preferences when
// the app moves to the background.  This is a safety net alongside the native
// WKHTTPCookieStore snapshot in AppDelegate.swift — Clerk may store non-cookie
// state (e.g. client envelope cache) in localStorage that would be lost if iOS
// purges the WKWebView's storage for an inactive app.
//
// On cold start, restoreClerkLocalStorage() runs inside bootReady so the keys
// are back in localStorage before ClerkProvider mounts and makes its first FAPI
// call.
const CLERK_LS_PREF_KEY = 'cm_clerk_localstorage';

const CLERK_LS_KEY_PREFIXES = ['__clerk', 'clerk.'];
function ApiClientBootstrap() {
  const { getToken, isSignedIn } = useAuth();
  const { toast } = useToast();

  // Track whether Clerk considered the user signed-in at the last foreground
  // check.  Used to distinguish "session expired while idle" (was signed-in →
  // now null) from "user is simply on the welcome/sign-in screen" (never had a
  // session in this mount).  A ref avoids closing over a stale boolean inside
  // the visibilitychange handler.
  const wasSignedIn = useRef(!!isSignedIn);
  useEffect(() => { wasSignedIn.current = !!isSignedIn; }, [isSignedIn]);

  // Re-register on every getToken identity change — a new reference is issued
  // after sign-in, so the empty-deps version captured the pre-sign-in closure
  // (returns null forever). This keeps the API client live post-sign-in.
  useEffect(() => { initApiClient(getToken); }, [getToken]);

  // Refresh session token on foreground restore (prevents 401 after suspension).
  // When getToken returns null AND the user was previously signed-in, the Clerk
  // session expired while the app was idle (e.g. 7+ days of inactivity).  Show
  // a clear message so the user understands why AuthGate is redirecting them to
  // /welcome — without this they see a silent navigation with no explanation.
  // On background: snapshot Clerk localStorage to Preferences (safety net for
  // any non-cookie state Clerk may write; the primary backup for httpOnly
  // session cookies is the native WKHTTPCookieStore → UserDefaults mechanism
  // in AppDelegate.swift).
  useEffect(() => {
    const handleVisibilityChange = async () => {
      if (!document.hidden) {
        try {
          const token = await getToken({ skipCache: true });
          if (token === null && wasSignedIn.current) {
            // Session expired while the app was idle — inform the user before
            // AuthGate redirects to /welcome.  Clear the flag so the toast fires
            // only once per sign-out transition.
            wasSignedIn.current = false;
            toast({
              title: 'Session expired',
              description: 'Please sign in again to continue.',
              duration: 6000,
            });
          }
        } catch {
          // Network error or Clerk not yet initialised — AuthGate handles auth state.
        }
      } else {
        // App going to background — persist Clerk localStorage keys to Preferences
        // (safety net for any non-cookie state Clerk may write; the primary
        // backup for httpOnly session cookies is in AppDelegate.swift).
        saveClerkLocalStorage().catch(() => {});
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [getToken, toast]);

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

// ── ClerkTimeoutScreen ────────────────────────────────────────────────────────
// Shown when Clerk hasn't initialised within CLERK_INIT_TIMEOUT_MS. Prevents
// the user being stranded on a dark screen if the proxy is unreachable.

const CLERK_INIT_TIMEOUT_MS = 15_000;

function ClerkTimeoutScreen() {
  return (
    <div
      style={{
        minHeight: '100dvh', backgroundColor: '#05070A',
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        padding: '2rem', gap: '1.5rem', textAlign: 'center',
      }}
    >
      <div style={{
        width: 64, height: 64, backgroundColor: '#1F2937',
        border: '1px solid rgba(255,255,255,0.1)', borderRadius: 16,
        display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 32,
      }}>⚠️</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <h2 style={{ color: '#fff', fontWeight: 700, fontSize: 20, margin: 0 }}>Connection Timeout</h2>
        <p style={{ color: '#808BA4', fontSize: 14, lineHeight: 1.6, margin: 0 }}>
          Unable to reach the authentication server.{'\n'}
          Check your internet connection and try again.
        </p>
      </div>
      <button
        type="button"
        onClick={() => window.location.reload()}
        style={{
          background: '#2563EB', color: '#fff', fontWeight: 700,
          fontSize: 14, padding: '12px 32px', borderRadius: 16, border: 'none',
          cursor: 'pointer',
        }}
      >
        Retry
      </button>
    </div>
  );
}

// ── ClerkProviderWithRoutes ───────────────────────────────────────────────────

function ClerkProviderWithRoutes() {
  const [, setLocation] = useLocation();
  const [clerkTimedOut, setClerkTimedOut] = useState(false);

  // If Clerk hasn't fired ClerkLoaded in CLERK_INIT_TIMEOUT_MS, surface a retry
  // screen instead of leaving the user on an infinite dark placeholder.
  useEffect(() => {
    const t = setTimeout(() => setClerkTimedOut(true), CLERK_INIT_TIMEOUT_MS);
    return () => clearTimeout(t);
  }, []);

  return (
    <ClerkProvider
      publishableKey={clerkPubKey}
      proxyUrl={clerkProxyUrl}
      // __internal_clerkJSUrl / __internal_clerkUIUrl are read by @clerk/shared's
      // clerkJSScriptUrl() / clerkUIScriptUrl() before constructing the versioned
      // fetch URLs. Without overrides, Clerk requests clerk-js@6.12.2 and
      // ui@1.25.2 which 404 on the FAPI (only semver-range redirects exist, e.g.
      // @6 → 6.29.0 and @1 → 1.30.2). ClerkProvider spreads all extra props into
      // IsomorphicClerkOptions so these reach loadClerkJSScript correctly even
      // though they are not in the public TypeScript type.
      {...(clerkJSUrl ? {
        __internal_clerkJSUrl: clerkJSUrl,
        __internal_clerkUIUrl: `${FAPI_ORIGIN}/npm/@clerk/ui@1/dist/ui.browser.js`,
      } as any : {})}
      routerPush={(to) => setLocation(to)}
      routerReplace={(to) => setLocation(to, { replace: true })}
      // Explicit post-auth redirect URLs so native navigation is independent of
      // Clerk dashboard config.  signInFallbackRedirectUrl / signUpFallbackRedirectUrl
      // are used only when no redirect_url param is present in the URL.
      signInFallbackRedirectUrl="/ai-home"
      signUpFallbackRedirectUrl="/financial-connection"
      afterSignOutUrl="/welcome"
    >
      {/* Static dark placeholder while Clerk initialises — do NOT use
          SplashScreen here because its 2.5s redirect timer fires before
          ClerkLoaded mounts the Router, leaving /welcome unmatched → blank. */}
      <ClerkLoading>
        {clerkTimedOut ? <ClerkTimeoutScreen /> : <div style={{ minHeight: '100dvh', backgroundColor: '#05070A' }} />}
      </ClerkLoading>
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

  // Key derivation failed at module level — show a legible error instead of
  // a blank screen (the module-level throw would bypass ErrorBoundary).
  if (_clerkInitError) {
    return (
      <div style={{
        minHeight: '100dvh', backgroundColor: '#05070A',
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        padding: '2rem', gap: '1.5rem', textAlign: 'center',
      }}>
        <div style={{
          width: 64, height: 64, backgroundColor: '#1F2937',
          border: '1px solid rgba(255,255,255,0.1)', borderRadius: 16,
          display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 32,
        }}>⚠️</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <h2 style={{ color: '#fff', fontWeight: 700, fontSize: 20, margin: 0 }}>Configuration Error</h2>
          <p style={{ color: '#808BA4', fontSize: 14, lineHeight: 1.6, margin: 0 }}>{_clerkInitError}</p>
        </div>
      </div>
    );
  }

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

async function saveClerkLocalStorage(): Promise<void> {
  if (!isCapacitor) return;
  try {
    const clerkEntries: Record<string, string> = {};
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && isClerkLsKey(key)) {
        const val = localStorage.getItem(key);
        if (val !== null) clerkEntries[key] = val;
      }
    }
    if (Object.keys(clerkEntries).length === 0) return;
    await Preferences.set({ key: CLERK_LS_PREF_KEY, value: JSON.stringify(clerkEntries) });
    debugRecord({ step: 'ls-save', keys: Object.keys(clerkEntries) });
  } catch { /* never crash on background save */ }
}

async function restoreClerkLocalStorage(): Promise<void> {
  if (!isCapacitor) return;
  try {
    const { value } = await Preferences.get({ key: CLERK_LS_PREF_KEY });
    if (!value) {
      debugRecord({ step: 'ls-restore', found: false });
      return;
    }
    const entries = JSON.parse(value) as Record<string, string>;
    const keys = Object.keys(entries);
    for (const key of keys) {
      if (isClerkLsKey(key)) localStorage.setItem(key, entries[key]);
    }
    debugRecord({ step: 'ls-restore', found: true, keys });
    console.log('[Goalsy:ls] restored', keys.length, 'Clerk localStorage key(s)');
  } catch (err) {
    debugRecord({ step: 'ls-restore', error: String(err) });
  }
}

function isClerkLsKey(key: string): boolean {
  return CLERK_LS_KEY_PREFIXES.some((p) => key.startsWith(p));
}
