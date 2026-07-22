/**
 * Seed script — inserts realistic sample data for a given userId.
 * Usage:  USER_ID=<clerk_user_id> tsx lib/db/src/seed.ts
 *
 * If USER_ID is not provided it looks for the first user_profiles row and
 * seeds that user instead (handy for re-seeding during development).
 */

import { db } from "./index.ts";
import {
  userProfiles,
  financialProfiles,
  goals,
  bills,
  briefings,
  notifications,
  notificationPreferences,
  dailyMissions,
} from "./schema/index.ts";
import { eq, or } from "drizzle-orm";

// ── Resolve user ID ───────────────────────────────────────────────────────────
let userId = process.env.USER_ID ?? "";

if (!userId) {
  const rows = await db.select({ userId: userProfiles.userId }).from(userProfiles).limit(1);
  if (!rows.length) {
    console.error(
      "❌  No USER_ID env var and no rows in user_profiles. " +
      "Log in to the app first, then re-run the seed."
    );
    process.exit(1);
  }
  userId = rows[0].userId;
  console.log(`ℹ️  USER_ID not set — seeding for existing user: ${userId}`);
}

console.log(`🌱  Seeding sample data for userId: ${userId}`);

// ── 1. User profile ───────────────────────────────────────────────────────────
await db
  .insert(userProfiles)
  .values({
    userId,
    displayName: "Alex Carter",
    onboardingComplete: true,
  })
  .onConflictDoUpdate({
    target: userProfiles.userId,
    set: { displayName: "Alex Carter", onboardingComplete: true },
  });
console.log("✅  user_profiles");

// ── 2. Financial profile ──────────────────────────────────────────────────────
await db
  .insert(financialProfiles)
  .values({
    userId,
    annualIncome: 145000,
    monthlyExpenses: 4800,
    netWorth: 312000,
    savingsRate: 22,
    riskTolerance: "moderate",
    primaryGoalType: "retirement",
  })
  .onConflictDoUpdate({
    target: financialProfiles.userId,
    set: {
      annualIncome: 145000,
      monthlyExpenses: 4800,
      netWorth: 312000,
      savingsRate: 22,
      riskTolerance: "moderate",
      primaryGoalType: "retirement",
    },
  });
console.log("✅  financial_profiles");

// ── 3. Goals ──────────────────────────────────────────────────────────────────
// Clear existing goals for this user and re-insert
await db.delete(goals).where(eq(goals.userId, userId));
await db.insert(goals).values([
  {
    userId,
    name: "Emergency Fund",
    type: "emergency_fund",
    targetAmount: 30000,
    currentAmount: 18400,
    monthlyContribution: 800,
    targetDate: "2025-06-30",
    status: "active",
    priority: 1,
  },
  {
    userId,
    name: "Retirement — 401(k) Boost",
    type: "retirement",
    targetAmount: 1200000,
    currentAmount: 187000,
    monthlyContribution: 1500,
    targetDate: "2045-01-01",
    status: "active",
    priority: 2,
  },
  {
    userId,
    name: "Down Payment on Home",
    type: "home_purchase",
    targetAmount: 120000,
    currentAmount: 43200,
    monthlyContribution: 1200,
    targetDate: "2027-04-01",
    status: "active",
    priority: 3,
  },
  {
    userId,
    name: "Kids' College Fund",
    type: "education",
    targetAmount: 80000,
    currentAmount: 12500,
    monthlyContribution: 400,
    targetDate: "2033-08-01",
    status: "active",
    priority: 4,
  },
  {
    userId,
    name: "Taxable Investment Portfolio",
    type: "investment",
    targetAmount: 250000,
    currentAmount: 61800,
    monthlyContribution: 600,
    targetDate: "2030-01-01",
    status: "active",
    priority: 5,
  },
]);
console.log("✅  goals (5 inserted)");

// ── 4. Bills ──────────────────────────────────────────────────────────────────
await db.delete(bills).where(eq(bills.userId, userId));
await db.insert(bills).values([
  {
    userId,
    name: "Mortgage",
    amount: 2350,
    dueDate: "2025-08-01",
    account: "Chase Checking ••4821",
    category: "Housing",
    isPaid: false,
  },
  {
    userId,
    name: "Electric Bill",
    amount: 138,
    dueDate: "2025-07-28",
    account: "Chase Checking ••4821",
    category: "Utilities",
    isPaid: false,
  },
  {
    userId,
    name: "Internet",
    amount: 79,
    dueDate: "2025-07-30",
    account: "Chase Checking ••4821",
    category: "Utilities",
    isPaid: false,
  },
  {
    userId,
    name: "Car Insurance",
    amount: 186,
    dueDate: "2025-08-05",
    account: "Chase Checking ••4821",
    category: "Insurance",
    isPaid: false,
  },
  {
    userId,
    name: "Gym Membership",
    amount: 55,
    dueDate: "2025-07-25",
    account: "Amex ••9102",
    category: "Health",
    isPaid: true,
  },
  {
    userId,
    name: "Spotify Family",
    amount: 17,
    dueDate: "2025-07-22",
    account: "Amex ••9102",
    category: "Entertainment",
    isPaid: true,
  },
]);
console.log("✅  bills (6 inserted)");

// ── 5. Briefings ──────────────────────────────────────────────────────────────
await db.delete(briefings).where(eq(briefings.userId, userId));
await db.insert(briefings).values([
  {
    userId,
    title: "Monthly Financial Check-In",
    scheduledDate: "2025-07-22",
    type: "monthly_summary",
    summary:
      "Great progress this month — your savings rate hit 22%, up 2 pts from June. Emergency fund is 61% funded. Consider bumping your monthly contribution by $100 to hit your June 2025 target.",
  },
  {
    userId,
    title: "Market Update: Fed Holds Rates",
    scheduledDate: "2025-07-20",
    type: "market_update",
    summary:
      "The Fed held rates steady at 5.25–5.5%. Your moderate-risk allocation is well-positioned. Bond yields ticked up 8 bps — minor headwind for your fixed-income sleeve.",
  },
  {
    userId,
    title: "Q2 Goal Review",
    scheduledDate: "2025-07-15",
    type: "goal_review",
    summary:
      "Home Down Payment goal grew 14% in Q2, ahead of pace. Retirement 401(k) is on track. Consider reallocating $200/mo from the investment portfolio to the down payment to close it 3 months early.",
  },
]);
console.log("✅  briefings (3 inserted)");

// ── 6. Notifications ──────────────────────────────────────────────────────────
await db.delete(notifications).where(eq(notifications.userId, userId));
await db.insert(notifications).values([
  {
    userId,
    type: "goal",
    title: "Emergency Fund Milestone 🎯",
    body: "You've crossed 60% of your Emergency Fund target. Keep it up!",
    targetScreen: "/goals",
    isRead: false,
    isDismissed: false,
  },
  {
    userId,
    type: "bill",
    title: "Electric Bill Due in 6 Days",
    body: "$138 due July 28. Funds are available in Chase ••4821.",
    targetScreen: "/calendar",
    isRead: false,
    isDismissed: false,
  },
  {
    userId,
    type: "mission",
    title: "Today's Mission Ready",
    body: "Your daily financial mission is waiting. Complete it to earn score points.",
    targetScreen: "/today",
    isRead: true,
    isDismissed: false,
  },
  {
    userId,
    type: "score",
    title: "Score Improved +18 pts",
    body: "Your financial health score jumped to 734 after last week's savings deposit.",
    targetScreen: "/score",
    isRead: false,
    isDismissed: false,
  },
  {
    userId,
    type: "system",
    title: "New Briefing Available",
    body: "Your Monthly Financial Check-In for July is ready to review.",
    targetScreen: "/calendar",
    isRead: false,
    isDismissed: false,
  },
]);
console.log("✅  notifications (5 inserted)");

// ── 7. Notification preferences ───────────────────────────────────────────────
const prefTypes = [
  "mission_reminders",
  "goal_updates",
  "market_alerts",
  "weekly_summary",
  "ai_insights",
];
for (const type of prefTypes) {
  await db
    .insert(notificationPreferences)
    .values({ userId, type, enabled: true })
    .onConflictDoNothing();
}
console.log("✅  notification_preferences (5 upserted)");

// ── Done ──────────────────────────────────────────────────────────────────────
console.log("\n🎉  Seed complete! All sample data is live.");
process.exit(0);
