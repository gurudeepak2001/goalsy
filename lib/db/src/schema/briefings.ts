import { pgTable, text, uuid, timestamp, uniqueIndex } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

// Briefings are regenerated monthly, so view history older than 90 days can no
// longer affect any briefing that remains useful to the user.
export const BRIEFING_VIEW_RETENTION_DAYS = 90;

export const briefings = pgTable("briefings", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: text("user_id").notNull(),
  title: text("title").notNull(),
  // ISO date string YYYY-MM-DD
  scheduledDate: text("scheduled_date").notNull(),
  type: text("type"), // market_update | goal_review | monthly_summary
  summary: text("summary"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertBriefingSchema = createInsertSchema(briefings).omit({
  id: true,
  createdAt: true,
});
export type InsertBriefing = z.infer<typeof insertBriefingSchema>;
export type Briefing = typeof briefings.$inferSelect;

export const briefingViews = pgTable(
  "briefing_views",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: text("user_id").notNull(),
    briefingId: uuid("briefing_id").notNull(),
    contentVersion: text("content_version").notNull(),
    viewedAt: timestamp("viewed_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("briefing_views_user_briefing_idx").on(table.userId, table.briefingId),
  ],
);

export const insertBriefingViewSchema = createInsertSchema(briefingViews).omit({
  id: true,
  viewedAt: true,
});
export type InsertBriefingView = z.infer<typeof insertBriefingViewSchema>;
export type BriefingView = typeof briefingViews.$inferSelect;
