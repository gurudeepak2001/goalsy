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
    /**
     * The app bundle ID this token was registered under (e.g.
     * 'com.myui.goalsyexecutive' or 'com.enteraxion.goalsy').
     * Used to select the correct APNs signing credentials when
     * delivering pushes.  Null for tokens registered before this
     * column existed — those fall back to the MyUI credential set.
     */
    bundleId: text("bundle_id"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex("push_tokens_user_token_idx").on(t.userId, t.token)],
);

export type PushToken = typeof pushTokens.$inferSelect;
