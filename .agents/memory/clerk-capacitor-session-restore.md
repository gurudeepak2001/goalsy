---
name: Clerk session restore on Capacitor iOS
description: How Clerk dev-instance sessions survive force-kill on Capacitor; why fetch injection fails and URL-param restore works
---

## The rule
On a Clerk **development instance** in a Capacitor WKWebView, the session credential is the `__clerk_db_jwt` dev-browser token — it lives only in clerk-js memory (plus a first-party cookie that iOS purges for localhost origins). To survive force-kill: persist it (Capacitor Preferences) whenever it appears in outgoing FAPI URLs or `Clerk-Db-Jwt` response headers, and on cold start write it back into the page URL as `?__clerk_db_jwt=<token>` via `history.replaceState` **before clerk-js initializes**.

**Why:** clerk-js `devBrowser.setup()` sources the token in order: (1) page URL search param, (2) its own cookie storage, (3) mint fresh via `POST /v1/dev_browser`. The URL is the only surface we can reliably reach first. Fetch-level injection into `/v1/client` does NOT work — it never updates Clerk's internal token, Clerk mints a fresh session-less one anyway and decorates all requests itself (`onBeforeRequest`), and the interceptor's save path then clobbers the good saved token with the fresh one. Symptoms of fighting Clerk's layer: `.json()` crashes, AbortErrors (Clerk cancels superseded requests via its own AbortSignal — never retry with the same signal).

**How to apply:** keep any fetch interceptor purely passive (observe/persist only). Guard persistence so a saved token can't be overwritten until the URL restore has run. Verified server-side: same `__clerk_db_jwt` resolves to the same `client_id` on `GET /v1/client`.

## Debugging without Web Inspector
Cold-start logs are uncatchable (WebView process replaced on relaunch; Inspector can't reattach in time). Write diagnostics to Preferences (`cm_debug_restore`) at every step; TEMP 5-tap on Welcome header dumps it via alert. Remove the debug tap + `[Goalsy:*]` logs once the fix is confirmed. Native `AppDelegate.swift` cookie save/restore found 0 Clerk cookies — confirmed dead code, removable after confirmation.
