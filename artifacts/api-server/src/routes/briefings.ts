import { createHash } from "node:crypto";
import { Router } from "express";
import { and, eq, lt } from "drizzle-orm";
import {
  BRIEFING_VIEW_RETENTION_DAYS,
  db,
  bills,
  briefingViews,
  expenses,
  goals,
  plaidAccounts,
} from "@workspace/db";
import {
  ListBriefingsResponse,
  MarkBriefingViewedBody,
  MarkBriefingViewedParams,
} from "@workspace/api-zod";
import { requireAuth } from "../middlewares/requireAuth";

const router = Router();

function formatDollars(amount: number): string {
  return amount.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  });
}

function isoDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function addUtcDays(date: Date, days: number): Date {
  const next = new Date(date);
  next.setUTCDate(next.getUTCDate() + days);
  return next;
}

function firstOfNextUtcMonth(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 1));
}

function briefingViewRetentionCutoff(now: Date): Date {
  return addUtcDays(now, -BRIEFING_VIEW_RETENTION_DAYS);
}

function stableBriefingId(userId: string, type: string, monthKey: string): string {
  const hex = createHash("sha256").update(`${userId}:${type}:${monthKey}`).digest("hex").slice(0, 32);
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-4${hex.slice(13, 16)}-a${hex.slice(17, 20)}-${hex.slice(20)}`;
}

function briefingContentVersion(title: string, summary: string): string {
  return createHash("sha256").update(JSON.stringify([title, summary])).digest("hex");
}

function monthlyExpenseAmount(expense: { amount: number; frequency: string }): number {
  return expense.frequency === "weekly" ? Math.round(expense.amount * 52 / 12) : expense.amount;
}

// GET /api/briefings
// These are generated from the authenticated user's current records. Stale seeded
// demo briefings are intentionally not returned.
router.get("/briefings", requireAuth, async (_req, res): Promise<void> => {
  const userId = res.locals.userId as string;
  try {
    const [userGoals, userExpenses, userBills, userAccounts] = await Promise.all([
      db.select().from(goals).where(eq(goals.userId, userId)),
      db.select().from(expenses).where(eq(expenses.userId, userId)),
      db.select().from(bills).where(eq(bills.userId, userId)),
      db.select().from(plaidAccounts).where(and(
        eq(plaidAccounts.userId, userId),
        eq(plaidAccounts.isHidden, false),
      )),
    ]);

    const now = new Date();
    await db
      .delete(briefingViews)
      .where(and(
        eq(briefingViews.userId, userId),
        lt(briefingViews.viewedAt, briefingViewRetentionCutoff(now)),
      ));
    const today = isoDate(now);
    const currentMonth = today.slice(0, 7);
    const activeGoals = userGoals.filter((goal) => goal.status === "active");
    const goalContributions = activeGoals.reduce(
      (total, goal) => total + Math.max(0, goal.currentAmount - goal.openingAmount),
      0,
    );
    const monthlyExpenses = userExpenses
      .filter((expense) => expense.expenseDate.startsWith(currentMonth))
      .reduce((total, expense) => total + monthlyExpenseAmount(expense), 0);
    const unpaidBills = userBills.filter((bill) => !bill.isPaid);
    const unpaidBillTotal = unpaidBills.reduce((total, bill) => total + bill.amount, 0);

    let assets = 0;
    let debt = 0;
    for (const account of userAccounts) {
      const balance = account.currentBalance ?? 0;
      if (account.type === "credit" || account.type === "loan") debt += balance;
      else assets += balance;
    }
    const netBalance = assets - debt;

    const behindGoals = activeGoals.filter((goal) => {
      if (!goal.targetDate || goal.targetAmount <= goal.openingAmount) return false;
      const start = goal.createdAt.getTime();
      const end = new Date(`${goal.targetDate}T00:00:00.000Z`).getTime();
      if (!Number.isFinite(end) || end <= start) return false;
      const elapsed = Math.min(1, Math.max(0, (now.getTime() - start) / (end - start)));
      const expected = goal.openingAmount + (goal.targetAmount - goal.openingAmount) * elapsed;
      return goal.currentAmount < expected * 0.9;
    });

    const goalDate = isoDate(addUtcDays(now, 7));
    const monthlyDate = isoDate(firstOfNextUtcMonth(now));
    const marketDate = isoDate(addUtcDays(now, 14));
    const createdAt = now.toISOString();

    const goalDetails = activeGoals.length
      ? activeGoals.slice(0, 3).map((goal) => {
          const progress = goal.targetAmount > 0
            ? Math.min(100, Math.round((goal.currentAmount / goal.targetAmount) * 100))
            : 0;
          return `${goal.name}: ${progress}% funded (${formatDollars(goal.currentAmount)} of ${formatDollars(goal.targetAmount)})`;
        }).join(". ")
      : "No active goals are saved yet";
    const paceExplanation = behindGoals.length
      ? `Falling behind: ${behindGoals.map((goal) => goal.name).join(", ")} ${behindGoals.length === 1 ? "is" : "are"} below the expected pace for the saved target date.`
      : activeGoals.length
        ? "No active goal is currently more than 10% behind its date-based funding pace."
        : "Add a goal to begin tracking funding pace.";

    const monthlySummary = [
      `You have added ${formatDollars(goalContributions)} to ${activeGoals.length} active ${activeGoals.length === 1 ? "goal" : "goals"}.`,
      `Entered monthly expenses total ${formatDollars(monthlyExpenses)}.`,
      userAccounts.length
        ? `Linked accounts show ${formatDollars(assets)} in assets and ${formatDollars(debt)} in debt, for a total balance of ${formatDollars(netBalance)}.`
        : "No linked account balances are available yet.",
      `Unpaid bills total ${formatDollars(unpaidBillTotal)}.`,
      monthlyExpenses > goalContributions
        ? `Expenses are ${formatDollars(monthlyExpenses - goalContributions)} higher than recorded goal additions this month.`
        : `Recorded goal additions are ${formatDollars(goalContributions - monthlyExpenses)} higher than entered expenses this month.`,
    ].join(" ");

    const marketGoalNames = activeGoals
      .filter((goal) => goal.type === "investment" || goal.type === "retirement")
      .map((goal) => goal.name);
    const marketContext = marketGoalNames.length
      ? `This future briefing will review market conditions against your ${marketGoalNames.join(" and ")} ${marketGoalNames.length === 1 ? "goal" : "goals"}.`
      : `This future briefing will explain market conditions in the context of your ${activeGoals.length} active ${activeGoals.length === 1 ? "goal" : "goals"} and ${formatDollars(netBalance)} linked total balance.`;

    const generatedBriefings = [
      {
        id: stableBriefingId(userId, "goal_review", currentMonth),
        userId,
        title: activeGoals.length === 1 ? `${activeGoals[0].name} Goal Review` : "Goals Progress Review",
        scheduledDate: goalDate,
        type: "goal_review",
        summary: `${goalDetails}. You have added ${formatDollars(goalContributions)} beyond starting balances. ${paceExplanation}`,
        createdAt,
      },
      {
        id: stableBriefingId(userId, "market_update", currentMonth),
        userId,
        title: "Future Market Update",
        scheduledDate: marketDate,
        type: "market_update",
        summary: `${marketContext} Market performance will be evaluated at briefing time; Goalsy is not claiming a result in advance.`,
        createdAt,
      },
      {
        id: stableBriefingId(userId, "monthly_summary", currentMonth),
        userId,
        title: "Monthly Financial Check-In",
        scheduledDate: monthlyDate,
        type: "monthly_summary",
        summary: monthlySummary,
        createdAt,
      },
    ].sort((a, b) => a.scheduledDate.localeCompare(b.scheduledDate));
    const generatedIds = new Set(generatedBriefings.map((briefing) => briefing.id));
    const viewedVersions = await db
      .select()
      .from(briefingViews)
      .where(eq(briefingViews.userId, userId));
    const viewedVersionById = new Map(
      viewedVersions
        .filter((view) => generatedIds.has(view.briefingId))
        .map((view) => [view.briefingId, view.contentVersion]),
    );

    res.json(ListBriefingsResponse.parse(generatedBriefings.map((briefing) => ({
      ...briefing,
      contentVersion: briefingContentVersion(briefing.title, briefing.summary),
      viewedContentVersion: viewedVersionById.get(briefing.id) ?? null,
    }))));
  } catch {
    res.status(500).json({ message: "Failed to generate briefings" });
  }
});

router.put("/briefings/:id/view", requireAuth, async (req, res): Promise<void> => {
  const params = MarkBriefingViewedParams.safeParse(req.params);
  const body = MarkBriefingViewedBody.safeParse(req.body);
  if (!params.success || !body.success) {
    res.status(400).json({ message: "Invalid briefing view" });
    return;
  }

  const userId = res.locals.userId as string;
  const currentMonth = isoDate(new Date()).slice(0, 7);
  const validBriefingIds = new Set(
    ["goal_review", "market_update", "monthly_summary"]
      .map((type) => stableBriefingId(userId, type, currentMonth)),
  );
  if (!validBriefingIds.has(params.data.id)) {
    res.status(404).json({ message: "Briefing not found" });
    return;
  }

  await db
    .insert(briefingViews)
    .values({
      userId,
      briefingId: params.data.id,
      contentVersion: body.data.contentVersion,
    })
    .onConflictDoUpdate({
      target: [briefingViews.userId, briefingViews.briefingId],
      set: {
        contentVersion: body.data.contentVersion,
        viewedAt: new Date(),
      },
    });

  res.sendStatus(204);
});

export default router;