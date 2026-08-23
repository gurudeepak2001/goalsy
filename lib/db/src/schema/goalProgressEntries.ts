import { pgTable, uuid, text, integer, timestamp } from "drizzle-orm/pg-core";
import { goals } from "./goals";

export const goalProgressEntries = pgTable("goal_progress_entries", {
  id: uuid("id").primaryKey().defaultRandom(),
  goalId: uuid("goal_id")
    .notNull()
    .references(() => goals.id, { onDelete: "cascade" }),
  userId: text("user_id").notNull(),
  weekIndex: integer("week_index").notNull(),
  // Individual amount deposited in this week. Nullable only for legacy
  // cumulative-snapshot rows that are converted on their next update.
  weeklyDeposit: integer("weekly_deposit"),
  // Derived running total retained for backwards-compatible API consumers.
  confirmedAmount: integer("confirmed_amount").notNull(),
  confirmedAt: timestamp("confirmed_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export type GoalProgressEntry = typeof goalProgressEntries.$inferSelect;
