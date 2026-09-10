import { randomUUID } from "node:crypto";
import type { Server } from "node:http";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import request from "supertest";
import { eq } from "drizzle-orm";

vi.mock("../middlewares/verifyClerkJwt.js", () => ({
  verifyClerkJwt: (req: any, res: any, next: any) => {
    const match = /^Bearer (test-briefing-[a-z0-9-]+)$/.exec(String(req.headers.authorization ?? ""));
    if (!match) {
      res.status(401).json({ message: "Unauthorized" });
      return;
    }
    res.locals.userId = match[1];
    next();
  },
}));

import app from "../app.js";
import {
  bills,
  db,
  expenses,
  goals,
  plaidAccounts,
  plaidItems,
} from "@workspace/db";

const runId = randomUUID().slice(0, 8);
const userA = `test-briefing-${runId}-a`;
const userB = `test-briefing-${runId}-b`;
const auth = (userId: string) => ({ Authorization: `Bearer ${userId}` });

function isoDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

describe("generated financial briefings", () => {
  let server: Server;

  beforeAll(async () => {
    server = app.listen(0);
    const now = new Date();
    const createdAt = new Date(now);
    createdAt.setUTCDate(createdAt.getUTCDate() - 30);
    const targetDate = new Date(now);
    targetDate.setUTCDate(targetDate.getUTCDate() + 30);
    const month = isoDate(now).slice(0, 7);

    await db.insert(goals).values([
      {
        userId: userA,
        name: "Emergency Reserve",
        type: "emergency_fund",
        targetAmount: 1_000,
        currentAmount: 200,
        openingAmount: 50,
        monthlyContribution: 100,
        targetDate: isoDate(targetDate),
        status: "active",
        priority: 1,
        createdAt,
        updatedAt: now,
      },
      {
        userId: userB,
        name: "Other User Secret Goal",
        type: "investment",
        targetAmount: 50_000,
        currentAmount: 40_000,
        openingAmount: 0,
        monthlyContribution: 1_000,
        status: "active",
        priority: 1,
      },
    ]);
    await db.insert(expenses).values([
      { userId: userA, category: "Housing", amount: 300, frequency: "monthly", expenseDate: `${month}-01` },
      { userId: userA, category: "Food", amount: 30, frequency: "weekly", expenseDate: `${month}-01` },
      { userId: userB, category: "Other", amount: 99_999, frequency: "monthly", expenseDate: `${month}-01` },
    ]);
    await db.insert(bills).values([
      { userId: userA, name: "Electric", amount: 120, dueDate: isoDate(targetDate), isPaid: false },
      { userId: userB, name: "Other User Secret Bill", amount: 88_888, dueDate: isoDate(targetDate), isPaid: false },
    ]);
    const [itemA] = await db.insert(plaidItems).values({
      userId: userA,
      plaidItemId: `briefing-item-${runId}-a`,
      encryptedAccessToken: "encrypted-test-token-a",
      institutionName: "Briefing Test Bank",
    }).returning();
    const [itemB] = await db.insert(plaidItems).values({
      userId: userB,
      plaidItemId: `briefing-item-${runId}-b`,
      encryptedAccessToken: "encrypted-test-token-b",
      institutionName: "Other User Bank",
    }).returning();
    await db.insert(plaidAccounts).values([
      {
        itemId: itemA.id,
        userId: userA,
        plaidAccountId: `briefing-account-${runId}-asset`,
        name: "Checking",
        type: "depository",
        currentBalance: 1_000,
        currencyCode: "USD",
      },
      {
        itemId: itemA.id,
        userId: userA,
        plaidAccountId: `briefing-account-${runId}-debt`,
        name: "Credit Card",
        type: "credit",
        currentBalance: 250,
        currencyCode: "USD",
      },
      {
        itemId: itemB.id,
        userId: userB,
        plaidAccountId: `briefing-account-${runId}-other`,
        name: "Other User Secret Account",
        type: "depository",
        currentBalance: 77_777,
        currencyCode: "USD",
      },
    ]);
  });

  afterAll(async () => {
    await db.delete(plaidItems).where(eq(plaidItems.userId, userA));
    await db.delete(plaidItems).where(eq(plaidItems.userId, userB));
    await db.delete(expenses).where(eq(expenses.userId, userA));
    await db.delete(expenses).where(eq(expenses.userId, userB));
    await db.delete(bills).where(eq(bills.userId, userA));
    await db.delete(bills).where(eq(bills.userId, userB));
    await db.delete(goals).where(eq(goals.userId, userA));
    await db.delete(goals).where(eq(goals.userId, userB));
    server.close();
  });

  it("requires authentication", async () => {
    expect((await request(server).get("/api/briefings")).status).toBe(401);
  });

  it("returns future calculations from only the authenticated user's records", async () => {
    const response = await request(server).get("/api/briefings").set(auth(userA));
    expect(response.status).toBe(200);
    expect(response.body).toHaveLength(3);

    const today = isoDate(new Date());
    expect(response.body.every((briefing: any) => briefing.scheduledDate > today)).toBe(true);

    const goalReview = response.body.find((briefing: any) => briefing.type === "goal_review");
    expect(goalReview.title).toBe("Emergency Reserve Goal Review");
    expect(goalReview.summary).toContain("20% funded ($200 of $1,000)");
    expect(goalReview.summary).toContain("added $150");
    expect(goalReview.summary).toContain("Falling behind: Emergency Reserve");

    const monthly = response.body.find((briefing: any) => briefing.type === "monthly_summary");
    expect(monthly.summary).toContain("Entered monthly expenses total $430");
    expect(monthly.summary).toContain("$1,000 in assets and $250 in debt");
    expect(monthly.summary).toContain("total balance of $750");
    expect(monthly.summary).toContain("Unpaid bills total $120");

    const market = response.body.find((briefing: any) => briefing.type === "market_update");
    expect(market.title).toBe("Future Market Update");
    expect(market.summary).toContain("Market performance will be evaluated at briefing time");

    const serialized = JSON.stringify(response.body);
    expect(serialized).not.toMatch(/Q2 Goal Review|Fed Holds Rates|July is ready/);
    expect(serialized).not.toContain("Other User Secret");
    expect(serialized).not.toContain("99,999");
    expect(serialized).not.toContain("88,888");
    expect(serialized).not.toContain("77,777");
  });
});