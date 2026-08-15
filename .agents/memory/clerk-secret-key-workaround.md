---
name: Clerk secret key workaround
description: CLERK_SECRET_KEY is set to invalid placeholder text; JWT auth bypasses it via JWKS.
---

# Clerk secret key — invalid value, permanent workaround in place

## The problem
`CLERK_SECRET_KEY` in Replit secrets starts with "need adi..." — this is placeholder text, not a real Clerk secret key (`sk_test_` / `sk_live_`). The user cannot view or manage Clerk secret keys (insufficient dashboard permissions).

**Why:** Clerk's `clerkMiddleware` from `@clerk/express` uses the secret key internally when authenticating backend API calls to Clerk. With an invalid secret key, JWT verification via the middleware fails → every authenticated API call returns 401.

## The fix (in place)
Replaced `clerkMiddleware` entirely with a custom `verifyClerkJwt` middleware (`artifacts/api-server/src/middlewares/verifyClerkJwt.ts`) that:
- Uses `jose`'s `createRemoteJWKSet` + `jwtVerify` to verify tokens
- Derives the JWKS URL from `VITE_CLERK_PUBLISHABLE_KEY` at startup
- Requires no `CLERK_SECRET_KEY` at all
- Sets `res.locals.userId` from the JWT `sub` claim
- `requireAuth` middleware reads `res.locals.userId` (already set by above)

**How to apply:** Any future API auth work should use `verifyClerkJwt` + `requireAuth` pattern. Do NOT re-introduce `clerkMiddleware` from `@clerk/express` — it will silently break with the invalid secret key. Routes needing Clerk backend calls (clerkClient.users etc.) will also fail until the secret key is fixed.
