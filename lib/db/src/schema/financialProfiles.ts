import { pgTable, text, integer, real, uuid, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

// Risk tolerance options: conservative | moderate | aggressive
// Primary goal type: home_purchase | retirement | education | emergency_fund | investment | other
export const financialProfiles = pgTable("financial_profiles", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: text("user_id").notNull().unique(),
  // Dollar amounts stored as whole integers
  annualIncome: integer("annual_income"),
  monthlyExpenses: integer("monthly_expenses"),
  netWorth: integer("net_worth"),
  // 0–100 percentage
  savingsRate: real("savings_rate"),
  riskTolerance: text("risk_tolerance"), // conservative | moderate | aggressive
  primaryGoalType: text("primary_goal_type"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertFinancialProfileSchema = createInsertSchema(financialProfiles).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertFinancialProfile = z.infer<typeof insertFinancialProfileSchema>;
export type FinancialProfile = typeof financialProfiles.$inferSelect;
