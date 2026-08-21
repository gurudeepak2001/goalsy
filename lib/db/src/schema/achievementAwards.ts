import { pgTable, text, timestamp, uniqueIndex, uuid } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const achievementAwards = pgTable(
  "achievement_awards",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: text("user_id").notNull(),
    achievementId: text("achievement_id").notNull(),
    earnedAt: timestamp("earned_at", { withTimezone: true }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("achievement_awards_user_achievement_idx").on(table.userId, table.achievementId),
  ],
);

export const insertAchievementAwardSchema = createInsertSchema(achievementAwards).omit({
  id: true,
  createdAt: true,
});
export type InsertAchievementAward = z.infer<typeof insertAchievementAwardSchema>;
export type AchievementAward = typeof achievementAwards.$inferSelect;