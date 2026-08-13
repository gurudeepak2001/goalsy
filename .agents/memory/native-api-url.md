---
name: Native API URL for cap:build
description: VITE_API_BASE_URL must point at the deployed API URL, not the Replit dev domain.
---

# cap:build must use the deployed API URL

## The rule
`VITE_API_BASE_URL` in `cap:build` (in `artifacts/goalsy-executive/package.json`) must be the stable deployed URL — **never** the Replit `.replit.dev` / `.kirk.replit.dev` dev domain.

**Why:** The dev domain sleeps when the workspace is idle. TestFlight testers hit it cold and get "Load failed" (iOS WebKit network error, not an HTTP error) because `fetch()` never gets a response. The error surfaces in `FinancialConnectionScreen` as "Could not save profile — Load failed".

**Current correct value:** `https://goalsy-finance-ui.replit.app`

**How to apply:** After any `cap:build` script change, a full `cap:build` → Xcode Clean Build Folder (Cmd+Shift+K) → Archive → TestFlight upload is required — `VITE_API_BASE_URL` is baked into the Vite bundle at build time.

**Diagnosis tip:** "Load failed" with no HTTP status = network-level failure (server unreachable), not a 4xx/5xx from the server. Check the baked URL first before looking at server logs.
