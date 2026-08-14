---
name: Clerk session restore on Capacitor iOS
description: How Clerk dev-instance sessions survive force-kill on Capacitor; why fetch injection fails and URL-param restore works; production vs dev instance separation
---

## Dev-instance native builds (not the deployed production build)
On a Clerk **development instance** in a Capacitor WKWebView, the session credential is the `__clerk_db_jwt` dev-browser token — it lives only in clerk-js memory (plus a first-party cookie that iOS purges for localhost origins). To survive force-kill: persist it (Capacitor Preferences) whenever it appears in outgoing FAPI URLs or `Clerk-Db-Jwt` response headers, and on cold start write it back into the page URL as `?__clerk_db_jwt=<token>` via `history.replaceState` **before clerk-js initializes**.

**Why:** clerk-js `devBrowser.setup()` sources the token in order: (1) page URL search param, (2) its own cookie storage, (3) mint fresh via `POST /v1/dev_browser`. The URL is the only surface we can reliably reach first. Fetch-level injection into `/v1/client` does NOT work — it never updates Clerk's internal token.

**How to apply:** keep any fetch interceptor purely passive (observe/persist only). Guard persistence so a saved token can't be overwritten until the URL restore has run.

## Production native builds (cap:build with VITE_API_BASE_URL set)
When `cap:build` bakes in the deployed production URL (`goalsy-finance-ui.replit.app`), the device MUST authenticate against the **production Clerk instance** (live keys, swapped in at publish time). Dev (`pk_test`) tokens are always rejected by the production API — empirically confirmed (valid dev token → prod API 401).

**How to apply:**
- Compute `nativeApiHost` from `new URL(VITE_API_BASE_URL).hostname`
- Use `publishableKeyFromHost(nativeApiHost)` with **NO fallback arg** — the helper short-circuits to any `pk_test` fallback, silently keeping the dev instance
- Set `clerkProxyUrl = https://<nativeApiHost>/api/__clerk`
- Gate ALL dev-browser JWT machinery (`preloadDbJwt`, `restoreDbJwtIntoUrl`, fetch interceptor) with `if (!isCapacitor || nativeApiHost) return` — it is dev-instance-only and poisons production Clerk requests

## Dev server goes to sleep overnight
The Replit dev domain (`.replit.dev`) goes to sleep when no one has the editor open. Any native build pointing at the dev domain stops working overnight. Always point `cap:build` at the deployed production URL so the device always has an always-on server.

## Length-guard both directions
A bogus short value (e.g. 31-char dev_browser token Clerk emits) can appear as `__clerk_db_jwt` and get stored, overwriting a good token on next load. Guard BOTH preload and persist with `MIN_JWT_LENGTH = 100`.

## Stale getToken capture
Never gate `initApiClient` behind an `initialised` flag — the first mount happens pre-sign-in and that closure returns null forever. Use a module-level `currentGetToken` pointer updated on every `[getToken]` identity change. Add `getToken` to `ApiClientBootstrap` effect deps.

## QueryClient must have retry limits
Bare `new QueryClient()` causes infinite retry storms on 401s. Always set `retry: false, staleTime: 60_000, refetchOnWindowFocus: false` in `defaultOptions.queries`.

## `sessions: 0` in FAPI logs is misleading
Only `/v1/client` responses carry a `sessions` array; `/touch` and `/tokens` return other shapes, so the interceptor log prints 0 for those regardless of real state.

## Native iOS cookie backup (AppDelegate.swift)
Without a proxy URL, Clerk stores session state in httpOnly cookies (not localStorage). WKHTTPCookieStore *should* auto-persist across force-kill, but iOS gives no flush guarantee on SIGKILL. The fix: in `applicationDidEnterBackground`, read all Clerk-related cookies from `WKHTTPCookieStore` using a `UIBackgroundTask` assertion (so the async read completes before the process suspends), serialize via `NSKeyedArchiver`, save to `UserDefaults` with `synchronize()`. On cold start in `didFinishLaunchingWithOptions`, deserialize and inject back via `WKHTTPCookieStore.setCookie()` before Capacitor loads the WebView. `setCookie` is idempotent — if WKHTTPCookieStore already has the cookie (happy path), it's a no-op.

**Why:** iOS SIGKILL may interrupt async cookie disk-write; `UserDefaults.synchronize()` guarantees the data hits disk before the app suspends.

**How to apply:** keep `isClerkCookie()` filter broad (domain contains "clerk" OR name prefixes `__client`/`__session`/`__clerk`/`__client_uat`). The localStorage JS backup (`saveClerkLocalStorage`) is a separate safety net for any non-cookie state; do not remove it.
