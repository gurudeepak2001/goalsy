import { pgTable, text, uuid, timestamp, uniqueIndex } from "drizzle-orm/pg-core";

/**
 * Device push tokens for APNs (iOS) and FCM (Android).
 * One row per user+token pair; upserted on every registration so rotated tokens
 * replace stale ones automatically.
 */
export const pushTokens = pgTable(
  "push_tokens",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: text("user_id").notNull(),
    /** Raw APNs device token (hex string) or FCM registration token */
    token: text("token").notNull(),
    /** 'ios' | 'android' */
    platform: text("platform").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex("push_tokens_user_token_idx").on(t.userId, t.token)],
);

export type PushToken = typeof pushTokens.$inferSelect;
