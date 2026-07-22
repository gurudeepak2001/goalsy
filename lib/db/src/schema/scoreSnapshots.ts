import { pgTable, text, integer, uuid, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const scoreSnapshots = pgTable("score_snapshots", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: text("user_id").notNull(),
  // 0–1000
  score: integer("score").notNull(),
  // building | steady | strong | ready
  tier: text("tier").notNull(),
  // Serialised JSON breakdown for the drivers section
  driversJson: text("drivers_json"),
  computedAt: timestamp("computed_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertScoreSnapshotSchema = createInsertSchema(scoreSnapshots).omit({
  id: true,
  computedAt: true,
});
export type InsertScoreSnapshot = z.infer<typeof insertScoreSnapshotSchema>;
export type ScoreSnapshot = typeof scoreSnapshots.$inferSelect;
