---
name: Clerk FAPI native proxy architecture
description: How Clerk FAPI calls work from the Capacitor iOS WKWebView — confirmed root causes and fixes for the proxy loop and CORS non-issue.
---

## The architecture (confirmed 2026-08-14)

**No `proxyUrl` needed for Capacitor.** `clerk.goalsy-finance-ui.replit.app` already
responds with `Access-Control-Allow-Origin: capacitor://localhost` — confirmed by
curling through external DNS (1.1.1.1). No CORS shim is required.

**Why the proxy loop happened:** Inside the Replit production container, `clerk.goalsy-finance-ui.replit.app` resolves to `172.24.0.5` (Replit's own internal proxy, TLS cert "Replit internal proxy leaf"). Requests from our API server to that hostname looped and hung — no response ever came back. This caused every `/v1/client` and `/v1/environment` request to hang with no `←` log line.

**Session storage without proxyUrl:** Clerk uses httpOnly cookies on `clerk.goalsy-finance-ui.replit.app` instead of localStorage. WKHTTPCookieStore is wiped on force-kill — cookies must be saved/restored natively.

## Native cookie persistence (AppDelegate.swift)

`applicationDidEnterBackground`: reads cookies from the LIVE WebView (`bridgeVC.webView.configuration.websiteDataStore.httpCookieStore`) filtered to domains containing "clerk" or ".accounts.dev". Serialises to UserDefaults (key: `cm_clerk_cookies_v2`). Uses a background task so async `getAllCookies()` completes before iOS suspends.

`application(_:didFinishLaunchingWithOptions:)`: deserialises and injects cookies into `WKWebsiteDataStore.default().httpCookieStore` BEFORE WebView loads. Session cookies without an expiry get a 30-day synthetic expiry.

**Why the live WKWebView, not shared store:** `WKWebsiteDataStore.default()` is the same underlying store when Capacitor uses the default data store — but reading from `bridgeVC.webView` is more reliable. Falls back to the default store if the bridge VC isn't reachable yet.

## Key publishable key facts

- Dev key (`pk_test_...`) decodes to `bursting-hedgehog-64.clerk.accounts.dev` (Clerk's managed subdomain)
- Live key (`pk_live_...`) decodes to `clerk.goalsy-finance-ui.replit.app` (Replit custom domain → Clerk FAPI)
- `/npm/@clerk/clerk-js@*` CDN lives on `frontend-api.clerk.dev` only — the instance FAPI domain does NOT serve npm routes
- `fapiUrlFromPublishableKey()` in the old proxy middleware: decode base64url body, strip trailing `$`, prepend `https://`

## What NOT to do

- Do NOT add `Clerk-Proxy-Url` header when proxying — triggers Clerk's registered-proxy-URL feature, requires dashboard registration, returns 400 for Replit-managed instances (Replit doesn't expose this config).
- Do NOT use the API server as a proxy target for `/v1/*` when the target is `clerk.goalsy-finance-ui.replit.app` — internal DNS loop.
- Do NOT read cookies via Swift/AppDelegate before the WebView loads — WKHTTPCookieStore always returns 0 cookies at that point for cross-origin FAPI cookies (ITP). Read them on background instead.

**Why:**
These three mistakes were each tried and confirmed to fail. The correct flow is:
iOS device → Clerk FAPI direct (no proxy) → cookies set by Clerk → saved by AppDelegate on background → restored by AppDelegate on next launch.
