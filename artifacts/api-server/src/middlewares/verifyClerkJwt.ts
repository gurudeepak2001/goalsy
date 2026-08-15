import { createRemoteJWKSet, jwtVerify } from "jose";
import type { RequestHandler } from "express";

/**
 * Derives the Clerk FAPI host from a publishable key.
 * pk_test_<base64>$ → base64-decode → "<host>$" → strip trailing "$"
 */
function fapiHostFromPublishableKey(pk: string): string {
  const encoded = pk.replace(/^pk_(test|live)_/, "");
  const decoded = Buffer.from(encoded, "base64").toString("utf8");
  return decoded.replace(/[$]+$/, "");
}

/**
 * Returns true when the host is a Replit-managed Clerk proxy
 * (e.g. clerk.goalsy-finance-ui.replit.app). These proxies do NOT expose a
 * JWKS endpoint, so JWTs signed by the real Clerk instance can't be verified
 * against them.
 */
function isReplitProxyHost(host: string): boolean {
  return host.endsWith(".replit.app") || host.endsWith(".replit.dev");
}

/**
 * Resolves the Clerk JWKS URI using the following priority order:
 *
 *  1. CLERK_FAPI_HOST env var — explicit override, always wins.
 *  2. VITE_CLERK_PUBLISHABLE_KEY — the frontend key; decodes to the real
 *     Clerk instance in dev but may be unavailable in the deployed runtime.
 *  3. CLERK_PUBLISHABLE_KEY — Replit overrides this with a proxy domain in
 *     production, so it is skipped when it decodes to a *.replit.app host.
 *  4. Hardcoded fallback — the known Clerk FAPI host for this project,
 *     used only if all env vars are missing or decode to proxy domains.
 */
function resolveJwksUri(): string {
  // 1. Explicit override
  const explicitHost = process.env.CLERK_FAPI_HOST;
  if (explicitHost) {
    return `https://${explicitHost}/.well-known/jwks.json`;
  }

  // 2 & 3. Derive from publishable keys, skip Replit proxy hosts
  const candidates = [
    process.env.VITE_CLERK_PUBLISHABLE_KEY,
    process.env.CLERK_PUBLISHABLE_KEY,
  ];
  for (const pk of candidates) {
    if (!pk) continue;
    const host = fapiHostFromPublishableKey(pk);
    if (!isReplitProxyHost(host)) {
      return `https://${host}/.well-known/jwks.json`;
    }
  }

  // 4. Known fallback for this project — prevents a startup crash when Replit
  //    overrides both keys with proxy domains in the deployed environment.
  const FALLBACK = "bursting-hedgehog-64.clerk.accounts.dev";
  console.log("[auth] WARNING: falling back to hardcoded FAPI host. Set CLERK_FAPI_HOST to remove this warning.");
  return `https://${FALLBACK}/.well-known/jwks.json`;
}

const JWKS_URI = resolveJwksUri();

// Cache the remote JWKS set (re-fetches automatically when keys rotate)
const JWKS = createRemoteJWKSet(new URL(JWKS_URI));
console.log("[auth] JWKS URI:", JWKS_URI);

/**
 * Verifies the Clerk session JWT from the Authorization header using the
 * public JWKS endpoint — no CLERK_SECRET_KEY required.
 * Sets res.locals.userId on success, calls next(). Returns 401 otherwise.
 */
export const verifyClerkJwt: RequestHandler = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) {
    console.log("[auth] 401 — no Bearer header on", req.method, req.url);
    res.status(401).json({ message: "Unauthorized" });
    return;
  }

  const token = authHeader.slice(7);
  try {
    const { payload } = await jwtVerify(token, JWKS, {
      // Clerk session JWTs set azp to the origin; skip strict audience check
      // since Capacitor apps use capacitor://localhost as origin.
      clockTolerance: 60,
    });
    const userId = payload.sub;
    if (!userId) {
      console.log("[auth] 401 — JWT verified but no sub claim");
      res.status(401).json({ message: "Unauthorized" });
      return;
    }
    res.locals.userId = userId;
    next();
  } catch (err) {
    console.log("[auth] 401 — JWT verification failed:", (err as Error).message);
    res.status(401).json({ message: "Unauthorized" });
  }
};
