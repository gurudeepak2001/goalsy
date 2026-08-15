import { createRemoteJWKSet, jwtVerify } from "jose";
import type { RequestHandler } from "express";

/**
 * Derives the Clerk FAPI host from the publishable key.
 * pk_test_<base64>$ → base64-decode → "<host>$" → strip trailing "$"
 */
function fapiHostFromPublishableKey(pk: string): string {
  const encoded = pk.replace(/^pk_(test|live)_/, "");
  const decoded = Buffer.from(encoded, "base64").toString("utf8");
  return decoded.replace(/[$]+$/, "");
}

const pk = process.env.CLERK_PUBLISHABLE_KEY ?? "";
const fapiHost = fapiHostFromPublishableKey(pk);
const JWKS_URI = `https://${fapiHost}/.well-known/jwks.json`;

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
    console.warn("[auth] 401 — no Bearer header on", req.method, req.url);
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
      console.warn("[auth] 401 — JWT verified but no sub claim");
      res.status(401).json({ message: "Unauthorized" });
      return;
    }
    res.locals.userId = userId;
    next();
  } catch (err) {
    console.warn("[auth] 401 — JWT verification failed:", (err as Error).message);
    res.status(401).json({ message: "Unauthorized" });
  }
};
