import { foreignKey, index, pgTable, real, text, timestamp, unique, uniqueIndex, uuid } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const plaidItems = pgTable("plaid_items", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: text("user_id").notNull(),
  plaidItemId: text("plaid_item_id").notNull(),
  encryptedAccessToken: text("encrypted_access_token").notNull(),
  institutionId: text("institution_id"),
  institutionName: text("institution_name"),
  status: text("status").notNull().default("active"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  uniqueIndex("plaid_items_plaid_item_id_unique").on(table.plaidItemId),
  unique("plaid_items_id_user_id_unique").on(table.id, table.userId),
  index("plaid_items_user_id_idx").on(table.userId),
]);

export const plaidAccounts = pgTable("plaid_accounts", {
  id: uuid("id").primaryKey().defaultRandom(),
  itemId: uuid("item_id").notNull(),
  userId: text("user_id").notNull(),
  plaidAccountId: text("plaid_account_id").notNull(),
  name: text("name").notNull(),
  officialName: text("official_name"),
  mask: text("mask"),
  type: text("type").notNull(),
  subtype: text("subtype"),
  currentBalance: real("current_balance"),
  availableBalance: real("available_balance"),
  currencyCode: text("currency_code"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  foreignKey({
    columns: [table.itemId, table.userId],
    foreignColumns: [plaidItems.id, plaidItems.userId],
    name: "plaid_accounts_item_owner_fk",
  }).onDelete("cascade"),
  uniqueIndex("plaid_accounts_plaid_account_id_unique").on(table.plaidAccountId),
  index("plaid_accounts_user_id_idx").on(table.userId),
  index("plaid_accounts_item_id_idx").on(table.itemId),
]);

export const insertPlaidItemSchema = createInsertSchema(plaidItems).omit({ id: true, createdAt: true, updatedAt: true });
export const insertPlaidAccountSchema = createInsertSchema(plaidAccounts).omit({ id: true, createdAt: true, updatedAt: true });
export type PlaidItem = typeof plaidItems.$inferSelect;
export type PlaidAccount = typeof plaidAccounts.$inferSelect;
export type InsertPlaidItem = z.infer<typeof insertPlaidItemSchema>;
export type InsertPlaidAccount = z.infer<typeof insertPlaidAccountSchema>;