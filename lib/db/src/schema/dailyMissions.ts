import { pgTable, text, uuid, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

// status: pending | completed | skipped
// category: savings | investment | debt | review | action
export const dailyMissions = pgTable("daily_missions", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: text("user_id").notNull(),
  // YYYY-MM-DD — one mission per user per day
  missionDate: text("mission_date").notNull(),
  title: text("title").notNull(),
  description: text("description"),
  category: text("category"),
  // pending | completed | skipped
  status: text("status").notNull().default("pending"),
  skipReason: text("skip_reason"),
  completedAt: timestamp("completed_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertDailyMissionSchema = createInsertSchema(dailyMissions).omit({
  id: true,
  createdAt: true,
});
export type InsertDailyMission = z.infer<typeof insertDailyMissionSchema>;
export type DailyMission = typeof dailyMissions.$inferSelect;
