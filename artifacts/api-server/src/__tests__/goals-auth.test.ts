/**
 * Integration smoke test: Clerk auth middleware wiring for GET /api/goals
 *
 * Purpose: catch a broken clerkMiddleware setup before it reaches production.
 * The bug this guards against: clerkMiddleware() called without `publishableKey`
 * silently returns 401 for every request because Clerk falls back to
 * publishableKeyFromHost(), which fails under the Replit proxy.
 *
 * How the mock works:
 *   - clerkMiddleware factory throws immediately if publishableKey is absent,
 *     making app initialisation fail loudly instead of silently.
 *   - When a "Bearer …" Authorization header is present the mock sets a userId,
 *     simulating what a correctly-configured Clerk middleware would do after
 *     verifying a real JWT.
 *   - getAuth() reads that userId so requireAuth can pass the request through.
 */

import { describe, it, expect, vi, beforeAll, afterAll } from "vitest";
import request from "supertest";
import type { Server } from "http";

// ── Mock @clerk/express ──────────────────────────────────────────────────────
// Must be registered before app.ts is imported (vi.mock is hoisted).
vi.mock("@clerk/express", () => ({
  clerkMiddleware:
    (opts: Record<string, unknown> = {}) => {
      // ⚠ This assertion catches the original bug:
      //   if publishableKey is absent, Clerk falls back to deriving it from
      //   the host header, which silently 401s every request in the Replit env.
      if (!opts.publishableKey) {
        throw new Error(
          "clerkMiddleware called without publishableKey. " +
            "Pass publishableKey explicitly so Clerk does not fall back to " +
            "publishableKeyFromHost(), which silently rejects every JWT.",
        );
      }
      // Simulate JWT verification: attach a userId when a Bearer token is present.
      return (req: any, _res: any, next: any) => {
        const auth = (req.headers.authorization as string) ?? "";
        req.__clerkUserId =
          auth.startsWith("Bearer ") && auth.length > 7 ? "usr_test123" : null;
        next();
      };
    },
  getAuth: (req: any) => ({ userId: req.__clerkUserId ?? null }),
}));

// ── Mock @workspace/db ───────────────────────────────────────────────────────
// Return an empty goals list so the test never needs a real database.
vi.mock("@workspace/db", () => {
  const makeChain = (): any => ({
    select: () => makeChain(),
    from: () => makeChain(),
    where: () => makeChain(),
    orderBy: () => Promise.resolve([]),
  });
  return {
    db: { select: () => makeChain() },
    goals: {},
    goalProgressEntries: {},
  };
});

// ── Mock drizzle-orm query helpers ───────────────────────────────────────────
// The real helpers expect column objects from the schema; our db mock ignores
// the where/orderBy arguments anyway, so stubs are enough.
vi.mock("drizzle-orm", () => ({
  eq: vi.fn(),
  and: vi.fn(),
  desc: vi.fn(),
}));

// ── Import the app AFTER mocks are registered ────────────────────────────────
import app from "../app.js";

// ── Tests ────────────────────────────────────────────────────────────────────
describe("GET /api/goals — Clerk auth middleware wiring", () => {
  let server: Server;

  beforeAll(() => {
    server = app.listen(0); // ephemeral port
  });

  afterAll(() => {
    server.close();
  });

  it("returns 401 when no Authorization header is present", async () => {
    const res = await request(server).get("/api/goals");
    expect(res.status).toBe(401);
  });

  it("returns 200 (not 401/403) when a Bearer token is present", async () => {
    const res = await request(server)
      .get("/api/goals")
      .set("Authorization", "Bearer any-signed-jwt");

    // Any successful response means auth was accepted — the middleware is wired.
    // 200 = goals found (or empty list), 404 = route mismatch (unlikely).
    // Either way it must NOT be 401 or 403.
    expect(res.status).not.toBe(401);
    expect(res.status).not.toBe(403);
    expect(Array.isArray(res.body)).toBe(true);
  });
});
