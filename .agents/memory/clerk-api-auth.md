---
name: Clerk API server auth
description: How the API server verifies Clerk JWTs — JWKS approach, no secret key needed.
---

# Clerk API server JWT verification

## The rule
Use `jose` + `createRemoteJWKSet` to verify Clerk session JWTs in the API server. Do NOT use `@clerk/express` `clerkMiddleware` / `getAuth()` — they require a valid `CLERK_SECRET_KEY` which is an invalid placeholder in this project.

**Why:** `CLERK_SECRET_KEY` in Replit secrets is not a real Clerk secret key. `@clerk/express` silently returns `userId: null` from `getAuth()` when the secret key is wrong, causing every authenticated route to 401. The JWKS approach only needs the public key (derived from `VITE_CLERK_PUBLISHABLE_KEY`), which is always valid.

## Critical: use VITE_CLERK_PUBLISHABLE_KEY, NOT CLERK_PUBLISHABLE_KEY
`CLERK_PUBLISHABLE_KEY` in the **production** deployment decodes to `clerk.goalsy-finance-ui.replit.app` — a Replit Clerk proxy domain. Its JWKS keys are different from the actual Clerk dev instance (`bursting-hedgehog-64.clerk.accounts.dev`) that the iOS app's JWTs are signed by. Using it causes 100% 401s on production despite a valid session.

`VITE_CLERK_PUBLISHABLE_KEY` decodes to `bursting-hedgehog-64.clerk.accounts.dev` — the correct instance.

**Always derive the JWKS URL from `VITE_CLERK_PUBLISHABLE_KEY` first, falling back to `CLERK_PUBLISHABLE_KEY`.**

## How to apply
The middleware lives in `artifacts/api-server/src/middlewares/verifyClerkJwt.ts`. It is re-exported from `requireAuth.ts`. Use `requireAuth` on any route that needs authentication.

JWKS URL derivation (already in `verifyClerkJwt.ts`):
```ts
const pk = process.env.VITE_CLERK_PUBLISHABLE_KEY ?? process.env.CLERK_PUBLISHABLE_KEY ?? "";
const encoded = pk.replace(/^pk_(test|live)_/, "");
const fapiHost = Buffer.from(encoded, "base64").toString("utf8").replace(/[$]+$/, "");
const JWKS_URI = `https://${fapiHost}/.well-known/jwks.json`;
```

Correct JWKS URI: `https://bursting-hedgehog-64.clerk.accounts.dev/.well-known/jwks.json` (1 RSA key, kid: `ins_3GTXv4aXyFHmbqrD`).

The startup log `[auth] JWKS URI: ...` confirms which key is being used at runtime.

## What NOT to do
- Do not restore `clerkMiddleware` from `@clerk/express` — it will silently 401 everything.
- Do not call `getAuth(req)` — it returns null userId without the secret key.
- Do not rely on `CLERK_SECRET_KEY` being valid — treat it as absent.
- Do not derive the JWKS URL from `CLERK_PUBLISHABLE_KEY` alone — it points to the wrong Clerk instance in production.
