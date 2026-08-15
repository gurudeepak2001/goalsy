/**
 * Drop-in replacement for Clerk's clerkMiddleware that verifies Clerk JWTs
 * using JWKS directly — no CLERK_SECRET_KEY required.
 *
 * Clerk JWTs are RS256-signed.  The public keys are published at:
 *   https://<fapi_host>/.well-known/jwks.json
 * where <fapi_host> is derived from the publishable key.
 *
 * We use `jose` (RFC-compliant JWT library) to fetch the JWKS and verify the
 * token signature + standard claims (exp, nbf).  The userId is read from the
 * `sub` claim and stored on res.locals for downstream middlewares.
 */

import { createRemoteJWKSet, jwtVerify, type JWTPayload } from "jose";
import type { RequestHandler } from "express";
import { logger } from "../lib/logger";

// ---------------------------------------------------------------------------
// Derive the FAPI host from the Clerk publishable key.
// Format: pk_test_<base64url(hostname + '$')>  or  pk_live_<...>
// ---------------------------------------------------------------------------
function fapiHostFromPublishableKey(pk: string): string {
  const b64 = pk.replace(/^pk_(test|live)_/, "");
  try {
    const decoded = Buffer.from(b64, "base64").toString("utf8").replace(/\$$/, "");
    return decoded;
  } catch {
    throw new Error(`Cannot decode FAPI host from publishable key: ${pk.slice(0, 20)}…`);
  }
}

// Build the JWKS URI and a cached remote JWKS set (jose caches internally).
const PK = process.env.VITE_CLERK_PUBLISHABLE_KEY ?? process.env.CLERK_PUBLISHABLE_KEY ?? "";
const FAPI_HOST = PK ? fapiHostFromPublishableKey(PK) : "";
const JWKS_URL = FAPI_HOST ? `https://${FAPI_HOST}/.well-known/jwks.json` : "";
const EXPECTED_ISSUER = FAPI_HOST ? `https://${FAPI_HOST}` : "";

console.log("[verifyClerkJwt] FAPI host:", FAPI_HOST || "(none — PK missing)");
console.log("[verifyClerkJwt] JWKS URL:", JWKS_URL || "(none)");

// `createRemoteJWKSet` fetches and caches the JWKS automatically.
const remoteJwks = JWKS_URL ? createRemoteJWKSet(new URL(JWKS_URL)) : null;

// Type augmentation so downstream middlewares can read the verified payload.
declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Locals {
      clerkPayload?: JWTPayload & { sub: string };
      userId?: string;
    }
  }
}

/**
 * Express middleware that:
 * 1. Extracts the Bearer token from the Authorization header.
 * 2. Verifies it against Clerk's JWKS (signature + exp + iss).
 * 3. Stores the verified payload on res.locals.clerkPayload and
 *    res.locals.userId so requireAuth and route handlers can use it.
 *
 * Unauthenticated requests are allowed through — requireAuth enforces the gate.
 */
export const verifyClerkJwt: RequestHandler = async (req, res, next) => {
  if (!remoteJwks) {
    logger.warn("[verifyClerkJwt] No JWKS configured — skipping JWT verification");
    return next();
  }

  const authHeader = req.headers["authorization"];
  if (!authHeader?.startsWith("Bearer ")) {
    return next(); // no token — let requireAuth reject if the route needs auth
  }

  const token = authHeader.slice(7);

  try {
    const { payload } = await jwtVerify(token, remoteJwks, {
      issuer: EXPECTED_ISSUER,
    });

    if (!payload.sub) {
      logger.warn("[verifyClerkJwt] JWT has no sub claim");
      return next();
    }

    res.locals.clerkPayload = payload as JWTPayload & { sub: string };
    res.locals.userId = payload.sub;
  } catch (err) {
    // Log but don't reject here — let requireAuth handle protected routes.
    logger.warn({ err }, "[verifyClerkJwt] JWT verification failed");
  }

  next();
};
