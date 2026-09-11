import { randomUUID } from "node:crypto";
import type { Server } from "node:http";
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import request from "supertest";
import { and, eq } from "drizzle-orm";

vi.mock("../middlewares/verifyClerkJwt.js", () => ({
  verifyClerkJwt: (req: any, res: any, next: any) => {
    const token = String(req.headers.authorization ?? "").replace(/^Bearer /, "");
    if (!token.startsWith("test-emergency-")) {
      res.status(401).json({ message: "Unauthorized" });
      return;
    }
    res.locals.userId = token;
    next();
  },
}));

import app from "../app.js";
import { db, financialProfiles, goals } from "@workspace/db";

const userId = `test-emergency-${randomUUID()}`;
const auth = { Authorization: `Bearer ${userId}` };

describe("financial profile emergency fund setup", () => {
  let server: Server;

  beforeAll(() => {
    server = app.listen(0);
  });

  afterEach(async () => {
    await db.delete(goals).where(eq(goals.userId, userId));
    await db.delete(financialProfiles).where(eq(financialProfiles.userId, userId));
  });

  afterAll(() => {
    server.close();
  });

  it("creates one emergency fund with the supplied starting amount and the default three-month target", async () => {
    const response = await request(server)
      .put("/api/financial-profile")
      .set(auth)
      .send({ monthlyExpenses: 4_500, emergencyFundAmount: 2_000 });

    expect(response.status).toBe(200);
    expect(response.body.emergencyFundAmount).toBe(2_000);
    expect(response.body.emergencyFundMonths).toBe(3);

    const funds = await db.select().from(goals).where(and(
      eq(goals.userId, userId),
      eq(goals.type, "emergency_fund"),
    ));
    expect(funds).toHaveLength(1);
    expect(funds[0]).toMatchObject({
      name: "Emergency Fund",
      targetAmount: 13_500,
      currentAmount: 2_000,
      openingAmount: 2_000,
    });
  });

  it("updates only the target when the duration changes, preserving saved goal progress", async () => {
    await request(server)
      .put("/api/financial-profile")
      .set(auth)
      .send({ monthlyExpenses: 4_000, emergencyFundAmount: 1_000 });
    await db.update(goals)
      .set({ currentAmount: 3_250, openingAmount: 1_000 })
      .where(and(eq(goals.userId, userId), eq(goals.type, "emergency_fund")));

    const response = await request(server)
      .put("/api/financial-profile")
      .set(auth)
      .send({ monthlyExpenses: 5_000, emergencyFundAmount: 9_999, emergencyFundMonths: 6 });

    expect(response.status).toBe(200);
    expect(response.body.emergencyFundMonths).toBe(6);
    const [fund] = await db.select().from(goals).where(and(
      eq(goals.userId, userId),
      eq(goals.type, "emergency_fund"),
    ));
    expect(fund).toMatchObject({
      targetAmount: 30_000,
      currentAmount: 3_250,
      openingAmount: 1_000,
    });
  });

  it("rejects an emergency fund duration outside the supported whole-month range", async () => {
    const response = await request(server)
      .put("/api/financial-profile")
      .set(auth)
      .send({ monthlyExpenses: 4_000, emergencyFundMonths: 0 });

    expect(response.status).toBe(400);
  });

  it("rejects an opening balance above the supported database amount before saving", async () => {
    const response = await request(server)
      .put("/api/financial-profile")
      .set(auth)
      .send({ monthlyExpenses: 4_000, emergencyFundAmount: 2_147_483_648 });

    expect(response.status).toBe(400);
    expect(response.body.message).toMatch(/emergency fund opening balance/i);
    const [profile] = await db
      .select()
      .from(financialProfiles)
      .where(eq(financialProfiles.userId, userId));
    const funds = await db.select().from(goals).where(and(
      eq(goals.userId, userId),
      eq(goals.type, "emergency_fund"),
    ));
    expect(profile).toBeUndefined();
    expect(funds).toHaveLength(0);
  });

  it("rejects a target above the supported amount before saving the profile", async () => {
    const response = await request(server)
      .put("/api/financial-profile")
      .set(auth)
      .send({ monthlyExpenses: 1_000_000_000, emergencyFundAmount: 0, emergencyFundMonths: 3 });

    expect(response.status).toBe(400);
    expect(response.body.message).toMatch(/reduce monthly expenses or the selected duration/i);
    const [profile] = await db
      .select()
      .from(financialProfiles)
      .where(eq(financialProfiles.userId, userId));
    const funds = await db.select().from(goals).where(and(
      eq(goals.userId, userId),
      eq(goals.type, "emergency_fund"),
    ));
    expect(profile).toBeUndefined();
    expect(funds).toHaveLength(0);
  });

  it("serializes simultaneous first saves into one emergency fund", async () => {
    const [first, second] = await Promise.all([
      request(server).put("/api/financial-profile").set(auth).send({ monthlyExpenses: 4_000, emergencyFundAmount: 500 }),
      request(server).put("/api/financial-profile").set(auth).send({ monthlyExpenses: 4_000, emergencyFundAmount: 500 }),
    ]);
    expect(first.status).toBe(200);
    expect(second.status).toBe(200);

    const funds = await db.select().from(goals).where(and(
      eq(goals.userId, userId),
      eq(goals.type, "emergency_fund"),
    ));
    expect(funds).toHaveLength(1);
  });
});