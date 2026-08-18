import { pgTable, text, integer, uuid, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

// category: Food | Entertainment | Travel | Rent/Housing | Subscriptions | Shopping | Utilities | Other
// frequency: monthly | weekly
// amount: whole-dollar integer (always the per-period amount the user entered)
// expenseDate: ISO YYYY-MM-DD — used for month-based filtering (day is always "01")
export const expenses = pgTable("expenses", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: text("user_id").notNull(),
  category: text("category").notNull(),
  amount: integer("amount").notNull(),
  frequency: text("frequency").notNull().default("monthly"),
  expenseDate: text("expense_date").notNull(), // YYYY-MM-DD
  note: text("note"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertExpenseSchema = createInsertSchema(expenses).omit({
  id: true,
  createdAt: true,
});
export type InsertExpense = z.infer<typeof insertExpenseSchema>;
export type Expense = typeof expenses.$inferSelect;
