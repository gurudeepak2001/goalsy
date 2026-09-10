import { randomUUID } from "node:crypto";
import type { Server } from "node:http";
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import request from "supertest";
import { eq, like } from "drizzle-orm";

const plaidMocks = vi.hoisted(() => ({
  createLinkToken: vi.fn(),
  exchangePublicToken: vi.fn(),
  getItem: vi.fn(),
  getInstitution: vi.fn(),
  getAccounts: vi.fn(),
  removeItem: vi.fn(),
}));

vi.mock("../middlewares/verifyClerkJwt.js", () => ({
  verifyClerkJwt: (req: any, res: any, next: any) => {
    const authorization = String(req.headers.authorization ?? "");
    const match = /^Bearer (test-plaid-[a-z0-9-]+)$/.exec(authorization);
    if (!match) {
      res.status(401).json({ message: "Unauthorized" });
      return;
    }
    res.locals.userId = match[1];
    next();
  },
}));

vi.mock("../lib/tokenEncryption.js", () => ({
  encryptPlaidToken: (token: string) => `encrypted:${token}`,
  decryptPlaidToken: (value: string) => value.replace(/^encrypted:/, ""),
}));

vi.mock("../lib/plaidClient.js", () => ({
  createPlaidLinkToken: plaidMocks.createLinkToken,
  exchangePlaidPublicToken: plaidMocks.exchangePublicToken,
  getPlaidItem: plaidMocks.getItem,
  getPlaidInstitution: plaidMocks.getInstitution,
  getPlaidAccounts: plaidMocks.getAccounts,
  removePlaidItem: plaidMocks.removeItem,
}));

import app from "../app.js";
import { db, plaidAccounts, plaidItems } from "@workspace/db";

const runId = randomUUID().slice(0, 8);
const userA = `test-plaid-${runId}-a`;
const userB = `test-plaid-${runId}-b`;
const auth = (userId: string) => ({ Authorization: `Bearer ${userId}` });

function plaidAccount(accountId: string, name = "Checking") {
  return {
    account_id: accountId,
    name,
    official_name: `${name} Account`,
    mask: "1234",
    type: "depository",
    subtype: "checking",
    balances: {
      available: 900,
      current: 1_000,
      iso_currency_code: "USD",
    },
  };
}

async function seedItem(owner: string, plaidItemId: string, accessToken: string) {
  const [item] = await db.insert(plaidItems).values({
    userId: owner,
    plaidItemId,
    encryptedAccessToken: `encrypted:${accessToken}`,
    institutionId: "ins_test",
    institutionName: "Test Bank",
  }).returning();
  return item;
}

async function seedAccount(owner: string, itemId: string, plaidAccountId: string) {
  const [account] = await db.insert(plaidAccounts).values({
    itemId,
    userId: owner,
    plaidAccountId,
    name: "Owner Checking",
    mask: "1111",
    type: "depository",
    subtype: "checking",
    currentBalance: 777,
    availableBalance: 700,
    currencyCode: "USD",
  }).returning();
  return account;
}

describe("Plaid API ownership and isolation", () => {
  let server: Server;

  beforeAll(() => {
    server = app.listen(0);
  });

  afterEach(async () => {
    vi.clearAllMocks();
    await db.delete(plaidItems).where(like(plaidItems.userId, `test-plaid-${runId}-%`));
  });

  afterAll(async () => {
    server.close();
    await db.delete(plaidItems).where(like(plaidItems.userId, `test-plaid-${runId}-%`));
  });

  it.each([
    ["post", "/api/plaid/link-token"],
    ["post", "/api/plaid/items/exchange"],
    ["get", "/api/plaid/connection"],
    ["get", "/api/plaid/accounts"],
    ["delete", `/api/plaid/items/${randomUUID()}`],
  ] as const)("rejects unauthenticated %s requests to %s", async (method, path) => {
    const response = await request(server)[method](path);
    expect(response.status).toBe(401);
  });

  it("derives the Link owner from auth and ignores body/query impersonation attempts", async () => {
    plaidMocks.createLinkToken.mockResolvedValue("link-sandbox-token");

    const response = await request(server)
      .post(`/api/plaid/link-token?userId=${encodeURIComponent(userB)}`)
      .set(auth(userA))
      .send({ userId: userB, clientUserId: userB });

    expect(response.status).toBe(200);
    expect(plaidMocks.createLinkToken).toHaveBeenCalledWith(userA);
    expect(JSON.stringify(response.body)).not.toContain(userA);
    expect(JSON.stringify(response.body)).not.toContain(userB);
  });

  it("never returns User A's connections or accounts to User B", async () => {
    const item = await seedItem(userA, `item-${runId}-a`, "access-a");
    await seedAccount(userA, item.id, `account-${runId}-a`);
    plaidMocks.getAccounts.mockResolvedValue({ accounts: [plaidAccount(`account-${runId}-a`, "A Checking")] });

    const [aConnections, bConnections, aAccounts, bAccounts] = await Promise.all([
      request(server).get("/api/plaid/connection").set(auth(userA)),
      request(server).get(`/api/plaid/connection?userId=${encodeURIComponent(userA)}&itemId=${item.id}`).set(auth(userB)),
      request(server).get("/api/plaid/accounts").set(auth(userA)),
      request(server).get(`/api/plaid/accounts?userId=${encodeURIComponent(userA)}&itemId=${item.id}`).set(auth(userB)),
    ]);

    expect(aConnections.status).toBe(200);
    expect(aConnections.body.connections).toHaveLength(1);
    expect(aConnections.body.connections[0].institutionName).toBe("Test Bank");
    expect(bConnections.status).toBe(200);
    expect(bConnections.body.connections).toEqual([]);

    expect(aAccounts.status).toBe(200);
    expect(aAccounts.body.accounts).toHaveLength(1);
    expect(aAccounts.body.accounts[0].name).toBe("A Checking");
    expect(bAccounts.status).toBe(200);
    expect(bAccounts.body.accounts).toEqual([]);
    expect(plaidMocks.getAccounts).toHaveBeenCalledTimes(1);

    const serializedB = JSON.stringify([bConnections.body, bAccounts.body]);
    expect(serializedB).not.toContain(item.id);
    expect(serializedB).not.toContain(`account-${runId}-a`);
    expect(serializedB).not.toContain("access-a");
    expect(JSON.stringify([aConnections.body, aAccounts.body])).not.toContain("access-a");
  });

  it("has a database constraint that rejects an account assigned to a different user than its item", async () => {
    const itemA = await seedItem(userA, `item-${runId}-constraint`, "access-constraint");

    await expect(db.insert(plaidAccounts).values({
      itemId: itemA.id,
      userId: userB,
      plaidAccountId: `account-${runId}-constraint`,
      name: "Cross-owner account",
      type: "depository",
    })).rejects.toThrow();

    expect(await db.select().from(plaidAccounts)
      .where(eq(plaidAccounts.plaidAccountId, `account-${runId}-constraint`))).toEqual([]);
  });

  it("returns 404 and never calls Plaid when User B directly deletes User A's connection", async () => {
    const item = await seedItem(userA, `item-${runId}-delete`, "access-delete-a");

    const response = await request(server)
      .delete(`/api/plaid/items/${item.id}?userId=${encodeURIComponent(userA)}`)
      .set(auth(userB))
      .send({ userId: userA, ownerId: userA });

    expect(response.status).toBe(404);
    expect(response.body).toEqual({ message: "Connection not found" });
    expect(plaidMocks.removeItem).not.toHaveBeenCalled();
    expect(await db.select().from(plaidItems).where(eq(plaidItems.id, item.id))).toHaveLength(1);
  });

  it("treats malformed item IDs as not found without calling Plaid or leaking database errors", async () => {
    const response = await request(server)
      .delete("/api/plaid/items/not-a-valid-uuid")
      .set(auth(userB));

    expect(response.status).toBe(404);
    expect(response.body).toEqual({ message: "Connection not found" });
    expect(plaidMocks.removeItem).not.toHaveBeenCalled();
  });

  it("lets the owner revoke an item and cascade-delete only that owner's accounts", async () => {
    const itemA = await seedItem(userA, `item-${runId}-owner-delete`, "access-owner-delete");
    await seedAccount(userA, itemA.id, `account-${runId}-owner-delete`);
    const itemB = await seedItem(userB, `item-${runId}-keep`, "access-keep");
    await seedAccount(userB, itemB.id, `account-${runId}-keep`);
    plaidMocks.removeItem.mockResolvedValue({ request_id: "request-test" });

    const response = await request(server)
      .delete(`/api/plaid/items/${itemA.id}`)
      .set(auth(userA));

    expect(response.status).toBe(204);
    expect(plaidMocks.removeItem).toHaveBeenCalledWith("access-owner-delete");
    expect(await db.select().from(plaidItems).where(eq(plaidItems.id, itemA.id))).toEqual([]);
    expect(await db.select().from(plaidAccounts).where(eq(plaidAccounts.itemId, itemA.id))).toEqual([]);
    expect(await db.select().from(plaidItems).where(eq(plaidItems.id, itemB.id))).toHaveLength(1);
    expect(await db.select().from(plaidAccounts).where(eq(plaidAccounts.itemId, itemB.id))).toHaveLength(1);
  });

  it("rejects User B replaying User A's Plaid item without changing A's token or accounts", async () => {
    const plaidItemId = `item-${runId}-replay`;
    const itemA = await seedItem(userA, plaidItemId, "access-original-a");
    const accountA = await seedAccount(userA, itemA.id, `account-${runId}-replay`);
    plaidMocks.exchangePublicToken.mockResolvedValue({ item_id: plaidItemId, access_token: "access-attacker-b" });
    plaidMocks.getItem.mockResolvedValue({ item: { item_id: plaidItemId, institution_id: "ins_attacker" } });
    plaidMocks.getInstitution.mockResolvedValue({ institution: { institution_id: "ins_attacker", name: "Attacker Bank" } });
    plaidMocks.getAccounts.mockResolvedValue({ accounts: [plaidAccount(accountA.plaidAccountId, "Attacker Rewrite")] });

    const response = await request(server)
      .post("/api/plaid/items/exchange")
      .set(auth(userB))
      .send({ publicToken: "public-attacker-b" });

    expect(response.status).toBe(502);
    expect(response.body).toEqual({ message: "Unable to connect this institution" });
    const [storedItem] = await db.select().from(plaidItems).where(eq(plaidItems.id, itemA.id));
    const [storedAccount] = await db.select().from(plaidAccounts).where(eq(plaidAccounts.id, accountA.id));
    expect(storedItem.userId).toBe(userA);
    expect(storedItem.encryptedAccessToken).toBe("encrypted:access-original-a");
    expect(storedItem.institutionName).toBe("Test Bank");
    expect(storedAccount.userId).toBe(userA);
    expect(storedAccount.name).toBe("Owner Checking");
    expect(JSON.stringify(response.body)).not.toContain("access-attacker-b");
  });

  it("rolls back a new item when its account ID belongs to another user", async () => {
    const itemA = await seedItem(userA, `item-${runId}-account-owner`, "access-account-owner");
    const sharedAccountId = `account-${runId}-collision`;
    const accountA = await seedAccount(userA, itemA.id, sharedAccountId);
    const itemBPlaidId = `item-${runId}-account-attacker`;
    plaidMocks.exchangePublicToken.mockResolvedValue({ item_id: itemBPlaidId, access_token: "access-account-attacker" });
    plaidMocks.getItem.mockResolvedValue({ item: { item_id: itemBPlaidId, institution_id: null } });
    plaidMocks.getAccounts.mockResolvedValue({ accounts: [plaidAccount(sharedAccountId, "Collision Rewrite")] });

    const response = await request(server)
      .post("/api/plaid/items/exchange")
      .set(auth(userB))
      .send({ publicToken: "public-account-attacker" });

    expect(response.status).toBe(502);
    expect(await db.select().from(plaidItems).where(eq(plaidItems.plaidItemId, itemBPlaidId))).toEqual([]);
    const [storedAccount] = await db.select().from(plaidAccounts).where(eq(plaidAccounts.id, accountA.id));
    expect(storedAccount.userId).toBe(userA);
    expect(storedAccount.itemId).toBe(itemA.id);
    expect(storedAccount.name).toBe("Owner Checking");
  });

  it("rejects a balance refresh that tries to overwrite another user's account ID", async () => {
    const itemA = await seedItem(userA, `item-${runId}-refresh-owner`, "access-refresh-owner");
    const sharedAccountId = `account-${runId}-refresh-collision`;
    const accountA = await seedAccount(userA, itemA.id, sharedAccountId);
    const itemB = await seedItem(userB, `item-${runId}-refresh-attacker`, "access-refresh-attacker");
    plaidMocks.getAccounts.mockImplementation(async (accessToken: string) => {
      if (accessToken === "access-refresh-attacker") {
        return { accounts: [plaidAccount(sharedAccountId, "Refresh Rewrite")] };
      }
      return { accounts: [] };
    });

    const response = await request(server)
      .get(`/api/plaid/accounts?userId=${encodeURIComponent(userA)}&itemId=${itemA.id}`)
      .set(auth(userB));

    expect(response.status).toBe(502);
    const [storedAccount] = await db.select().from(plaidAccounts).where(eq(plaidAccounts.id, accountA.id));
    expect(storedAccount.userId).toBe(userA);
    expect(storedAccount.itemId).toBe(itemA.id);
    expect(storedAccount.name).toBe("Owner Checking");
    expect(await db.select().from(plaidAccounts).where(eq(plaidAccounts.itemId, itemB.id))).toEqual([]);
    expect(JSON.stringify(response.body)).not.toContain("access-refresh-owner");
    expect(JSON.stringify(response.body)).not.toContain("access-refresh-attacker");
  });

  it("serializes simultaneous exchanges so exactly one user can own a Plaid item", async () => {
    const plaidItemId = `item-${runId}-race`;
    const accountId = `account-${runId}-race`;
    plaidMocks.exchangePublicToken.mockImplementation(async (publicToken: string) => ({
      item_id: plaidItemId,
      access_token: `access-${publicToken}`,
    }));
    plaidMocks.getItem.mockResolvedValue({ item: { item_id: plaidItemId, institution_id: "ins_race" } });
    plaidMocks.getInstitution.mockResolvedValue({ institution: { institution_id: "ins_race", name: "Race Bank" } });
    plaidMocks.getAccounts.mockResolvedValue({ accounts: [plaidAccount(accountId, "Race Checking")] });

    const [responseA, responseB] = await Promise.all([
      request(server).post("/api/plaid/items/exchange").set(auth(userA)).send({ publicToken: "public-a" }),
      request(server).post("/api/plaid/items/exchange").set(auth(userB)).send({ publicToken: "public-b" }),
    ]);

    expect([responseA.status, responseB.status].sort()).toEqual([200, 502]);
    const storedItems = await db.select().from(plaidItems).where(eq(plaidItems.plaidItemId, plaidItemId));
    expect(storedItems).toHaveLength(1);
    expect([userA, userB]).toContain(storedItems[0].userId);
    const storedAccounts = await db.select().from(plaidAccounts).where(eq(plaidAccounts.plaidAccountId, accountId));
    expect(storedAccounts).toHaveLength(1);
    expect(storedAccounts[0].userId).toBe(storedItems[0].userId);
    expect(storedAccounts[0].itemId).toBe(storedItems[0].id);
  });
});