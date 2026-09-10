import { Router } from "express";
import { and, eq, inArray, sql } from "drizzle-orm";
import { db, plaidAccounts, plaidCreditLiabilities, plaidItems } from "@workspace/db";
import { ExchangePlaidPublicTokenBody } from "@workspace/api-zod";
import { requireAuth } from "../middlewares/requireAuth";
import { decryptPlaidToken, encryptPlaidToken } from "../lib/tokenEncryption";
import {
  createPlaidLinkToken,
  exchangePlaidPublicToken,
  getPlaidAccounts,
  getPlaidInstitution,
  getPlaidItem,
  getPlaidLiabilities,
  removePlaidItem,
  type PlaidAccountData,
  type PlaidCreditLiabilityData,
  type PlaidLiabilitiesData,
} from "../lib/plaidClient";

const router = Router();

function accountValues(account: PlaidAccountData, itemId: string, userId: string) {
  return {
    itemId,
    userId,
    plaidAccountId: account.account_id,
    name: account.name,
    officialName: account.official_name,
    mask: account.mask,
    type: account.type,
    subtype: account.subtype,
    currentBalance: account.balances.current,
    availableBalance: account.balances.available,
    creditLimit: account.balances.limit ?? null,
    currencyCode: account.balances.iso_currency_code,
    updatedAt: new Date(),
  };
}

async function upsertOwnedAccount(
  tx: Pick<typeof db, "insert">,
  account: PlaidAccountData,
  itemId: string,
  userId: string,
) {
  const values = accountValues(account, itemId, userId);
  const updated = await tx.insert(plaidAccounts).values(values)
    .onConflictDoUpdate({
      target: plaidAccounts.plaidAccountId,
      set: {
        name: values.name,
        officialName: values.officialName,
        mask: values.mask,
        type: values.type,
        subtype: values.subtype,
        currentBalance: values.currentBalance,
        availableBalance: values.availableBalance,
        creditLimit: values.creditLimit,
        currencyCode: values.currencyCode,
        updatedAt: values.updatedAt,
      },
      setWhere: and(
        eq(plaidAccounts.userId, userId),
        eq(plaidAccounts.itemId, itemId),
      ),
    })
    .returning({ id: plaidAccounts.id });

  if (updated.length !== 1) {
    throw new Error("Plaid account ownership conflict");
  }
  return updated[0];
}

async function upsertOwnedCreditLiability(
  tx: Pick<typeof db, "insert" | "select">,
  liability: PlaidCreditLiabilityData,
  userId: string,
) {
  const [account] = await tx.select({ id: plaidAccounts.id })
    .from(plaidAccounts)
    .where(and(
      eq(plaidAccounts.plaidAccountId, liability.account_id),
      eq(plaidAccounts.userId, userId),
    ));
  if (!account) throw new Error("Plaid liability account ownership conflict");

  const apr = liability.aprs.find((entry) => entry.apr_type === "purchase_apr")
    ?? liability.aprs[0]
    ?? null;
  const values = {
    accountId: account.id,
    userId,
    minimumPaymentAmount: liability.minimum_payment_amount,
    aprPercentage: apr?.apr_percentage ?? null,
    aprType: apr?.apr_type ?? null,
    nextPaymentDueDate: liability.next_payment_due_date,
    updatedAt: new Date(),
  };
  const updated = await tx.insert(plaidCreditLiabilities).values(values)
    .onConflictDoUpdate({
      target: plaidCreditLiabilities.accountId,
      set: {
        minimumPaymentAmount: values.minimumPaymentAmount,
        aprPercentage: values.aprPercentage,
        aprType: values.aprType,
        nextPaymentDueDate: values.nextPaymentDueDate,
        updatedAt: values.updatedAt,
      },
      setWhere: eq(plaidCreditLiabilities.userId, userId),
    })
    .returning({ id: plaidCreditLiabilities.id });
  if (updated.length !== 1) throw new Error("Plaid liability ownership conflict");
}

async function applyOwnedLiabilitiesSnapshot(
  tx: Pick<typeof db, "delete" | "insert" | "select">,
  response: PlaidLiabilitiesData,
  itemId: string,
  userId: string,
) {
  const accountIdsByPlaidId = new Map<string, string>();
  for (const account of response.accounts) {
    const stored = await upsertOwnedAccount(tx, account, itemId, userId);
    accountIdsByPlaidId.set(account.account_id, stored.id);
  }
  const liabilities = response.liabilities.credit ?? [];
  for (const liability of liabilities) {
    await upsertOwnedCreditLiability(tx, liability, userId);
  }

  const liabilityPlaidIds = new Set(liabilities.map((liability) => liability.account_id));
  const accountsWithoutLiability = response.accounts
    .filter((account) => account.type === "credit" && !liabilityPlaidIds.has(account.account_id))
    .map((account) => accountIdsByPlaidId.get(account.account_id))
    .filter((accountId): accountId is string => accountId !== undefined);
  if (accountsWithoutLiability.length > 0) {
    await tx.delete(plaidCreditLiabilities).where(and(
      eq(plaidCreditLiabilities.userId, userId),
      inArray(plaidCreditLiabilities.accountId, accountsWithoutLiability),
    ));
  }
}

async function getPlaidAccountSnapshot(
  accessToken: string,
  onLiabilitiesUnavailable: (error: unknown) => void,
): Promise<PlaidLiabilitiesData> {
  const accountResponse = await getPlaidAccounts(accessToken);
  try {
    const liabilityResponse = await getPlaidLiabilities(accessToken);
    return {
      accounts: accountResponse.accounts,
      liabilities: liabilityResponse.liabilities,
    };
  } catch (error) {
    onLiabilitiesUnavailable(error);
    return {
      accounts: accountResponse.accounts,
      liabilities: { credit: null },
    };
  }
}

router.post("/plaid/link-token", requireAuth, async (req, res): Promise<void> => {
  try {
    const linkToken = await createPlaidLinkToken(res.locals.userId as string);
    res.json({ linkToken });
  } catch (error) {
    req.log.error({ error }, "Failed to create Plaid Link token");
    res.status(502).json({ message: "Unable to start secure account connection" });
  }
});

router.post("/plaid/items/exchange", requireAuth, async (req, res): Promise<void> => {
  const parsedBody = ExchangePlaidPublicTokenBody.safeParse(req.body);
  if (!parsedBody.success) {
    res.status(400).json({ message: "A valid publicToken is required" });
    return;
  }
  const { publicToken } = parsedBody.data;
  const userId = res.locals.userId as string;
  try {
    const exchanged = await exchangePlaidPublicToken(publicToken);
    const itemResponse = await getPlaidItem(exchanged.access_token);
    const institutionId = itemResponse.item.institution_id;
    const institutionName = institutionId
      ? (await getPlaidInstitution(institutionId)).institution.name
      : null;
    const accountResponse = await getPlaidAccountSnapshot(
      exchanged.access_token,
      (error) => req.log.warn({ error }, "Plaid liabilities unavailable during item exchange"),
    );

    const connection = await db.transaction(async (tx) => {
      // Serialize exchanges for the same Plaid item. The unique constraint alone
      // cannot prevent a check-then-upsert race between two authenticated users.
      await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${exchanged.item_id}))`);

      const [existingItem] = await tx.select({
        userId: plaidItems.userId,
      }).from(plaidItems).where(eq(plaidItems.plaidItemId, exchanged.item_id));
      if (existingItem && existingItem.userId !== userId) {
        throw new Error("This Plaid item is already linked to another user");
      }

      const [item] = await tx.insert(plaidItems).values({
        userId,
        plaidItemId: exchanged.item_id,
        encryptedAccessToken: encryptPlaidToken(exchanged.access_token),
        institutionId,
        institutionName,
      }).onConflictDoUpdate({
        target: plaidItems.plaidItemId,
        set: {
          encryptedAccessToken: encryptPlaidToken(exchanged.access_token),
          institutionId,
          institutionName,
          status: "active",
          updatedAt: new Date(),
        },
      }).returning();

      await applyOwnedLiabilitiesSnapshot(tx, accountResponse, item.id, userId);
      return item;
    });

    res.json({
      connection: {
        id: connection.id,
        institutionName: connection.institutionName,
        status: connection.status,
        accountCount: accountResponse.accounts.length,
      },
    });
  } catch (error) {
    req.log.error({ error }, "Failed to exchange Plaid public token");
    res.status(502).json({ message: "Unable to connect this institution" });
  }
});

router.get("/plaid/connection", requireAuth, async (_req, res): Promise<void> => {
  const userId = res.locals.userId as string;
  const items = await db.select({
    id: plaidItems.id,
    institutionName: plaidItems.institutionName,
    status: plaidItems.status,
  }).from(plaidItems).where(eq(plaidItems.userId, userId));
  res.json({ connections: items });
});

router.get("/plaid/accounts", requireAuth, async (req, res): Promise<void> => {
  const userId = res.locals.userId as string;
  try {
    const items = await db.select().from(plaidItems).where(eq(plaidItems.userId, userId));
    for (const item of items) {
      const refreshed = await getPlaidAccountSnapshot(
        decryptPlaidToken(item.encryptedAccessToken),
        (error) => req.log.warn(
          { error, itemId: item.id },
          "Plaid liabilities unavailable during account refresh",
        ),
      );
      await db.transaction((tx) => applyOwnedLiabilitiesSnapshot(tx, refreshed, item.id, userId));
    }
    const accounts = await db.select({
      id: plaidAccounts.id,
      itemId: plaidAccounts.itemId,
      name: plaidAccounts.name,
      officialName: plaidAccounts.officialName,
      mask: plaidAccounts.mask,
      type: plaidAccounts.type,
      subtype: plaidAccounts.subtype,
      currentBalance: plaidAccounts.currentBalance,
      availableBalance: plaidAccounts.availableBalance,
      creditLimit: plaidAccounts.creditLimit,
      currencyCode: plaidAccounts.currencyCode,
      minimumPaymentAmount: plaidCreditLiabilities.minimumPaymentAmount,
      aprPercentage: plaidCreditLiabilities.aprPercentage,
      aprType: plaidCreditLiabilities.aprType,
      nextPaymentDueDate: plaidCreditLiabilities.nextPaymentDueDate,
    })
      .from(plaidAccounts)
      .innerJoin(
        plaidItems,
        and(
          eq(plaidAccounts.itemId, plaidItems.id),
          eq(plaidItems.userId, userId),
        ),
      )
      .leftJoin(
        plaidCreditLiabilities,
        and(
          eq(plaidCreditLiabilities.accountId, plaidAccounts.id),
          eq(plaidCreditLiabilities.userId, userId),
        ),
      )
      .where(eq(plaidAccounts.userId, userId));
    res.json({ accounts });
  } catch (error) {
    req.log.error({ error }, "Failed to refresh Plaid accounts");
    res.status(502).json({ message: "Unable to refresh connected accounts" });
  }
});

router.delete("/plaid/items/:id", requireAuth, async (req, res): Promise<void> => {
  const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const userId = res.locals.userId as string;
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id)) {
    res.status(404).json({ message: "Connection not found" });
    return;
  }
  const [item] = await db.select().from(plaidItems)
    .where(and(eq(plaidItems.id, id), eq(plaidItems.userId, userId)));
  if (!item) {
    res.status(404).json({ message: "Connection not found" });
    return;
  }
  try {
    await removePlaidItem(decryptPlaidToken(item.encryptedAccessToken));
    await db.delete(plaidItems).where(and(eq(plaidItems.id, id), eq(plaidItems.userId, userId)));
    res.status(204).send();
  } catch (error) {
    req.log.error({ error }, "Failed to remove Plaid connection");
    res.status(502).json({ message: "Unable to disconnect this institution" });
  }
});

export default router;