/**
 * Integration smoke test: JWKS auth middleware wiring for GET /api/goals
 *
 * Purpose: catch a broken verifyClerkJwt setup before it reaches production.
 *
 * How the mock works:
 *   - verifyClerkJwt is mocked to avoid real JWKS network calls in tests.
 *   - When a "Bearer …" Authorization header is present the mock sets userId,
 *     simulating what the real middleware does after verifying a JWT.
 *   - When no header is present it returns 401, matching production behaviour.
 */

import { describe, it, expect, vi, beforeAll, afterAll } from "vitest";
import request from "supertest";
import type { Server } from "http";

// ── Mock verifyClerkJwt ──────────────────────────────────────────────────────
// Must be registered before app.ts is imported (vi.mock is hoisted).
vi.mock("../middlewares/verifyClerkJwt.js", () => ({
  verifyClerkJwt: (req: any, res: any, next: any) => {
    const auth = (req.headers.authorization as string) ?? "";
    if (auth.startsWith("Bearer ") && auth.length > 7) {
      res.locals.userId = "usr_test123";
      next();
    } else {
      res.status(401).json({ message: "Unauthorized" });
    }
  },
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
vi.mock("drizzle-orm", () => ({
  eq: vi.fn(),
  and: vi.fn(),
  desc: vi.fn(),
}));

// ── Import the app AFTER mocks are registered ────────────────────────────────
import app from "../app.js";

// ── Tests ────────────────────────────────────────────────────────────────────
describe("GET /api/goals — JWKS auth middleware wiring", () => {
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
    // 200 = goals found (or empty list). Must NOT be 401 or 403.
    expect(res.status).not.toBe(401);
    expect(res.status).not.toBe(403);
    expect(Array.isArray(res.body)).toBe(true);
  });
});
