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
 * against them. We must skip any key that decodes to one of these.
 */
function isReplitProxyHost(host: string): boolean {
  return host.endsWith(".replit.app") || host.endsWith(".replit.dev");
}

/**
 * Finds the first publishable key whose decoded host is a real Clerk FAPI
 * instance (not a Replit proxy). Tries every candidate env var in order.
 * Throws at startup if none is usable — fail fast rather than silently 401.
 */
function resolveJwksUri(): string {
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
  throw new Error(
    "[auth] No valid Clerk FAPI host found. Both VITE_CLERK_PUBLISHABLE_KEY and " +
      "CLERK_PUBLISHABLE_KEY decode to Replit proxy domains. " +
      "Set one of them to the real Clerk publishable key for this instance.",
  );
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
