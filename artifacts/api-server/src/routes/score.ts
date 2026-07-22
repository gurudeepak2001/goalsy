import { Router } from "express";
import { eq, desc } from "drizzle-orm";
import { db, financialProfiles, goals, dailyMissions, scoreSnapshots } from "@workspace/db";
import { requireAuth } from "../middlewares/requireAuth";
import { getScoreTier } from "../lib/scoreEngine";

const router = Router();

// GET /api/score — compute and return current score
router.get("/score", requireAuth, async (req, res) => {
  const userId = res.locals.userId as string;
  try {
    const [fp] = await db.select().from(financialProfiles).where(eq(financialProfiles.userId, userId));
    const userGoals = await db.select().from(goals).where(eq(goals.userId, userId));

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const recentMissions = await db
      .select()
      .from(dailyMissions)
      .where(eq(dailyMissions.userId, userId));

    const { score, drivers } = computeScore(fp ?? null, userGoals, recentMissions);
    const tier = getScoreTier(score);
    const now = new Date();

    // Persist snapshot (fire-and-forget, don't block the response)
    db.insert(scoreSnapshots)
      .values({ userId, score, tier, driversJson: JSON.stringify(drivers) })
      .catch(() => {});

    res.json({ score, tier, drivers, computedAt: now.toISOString() });
  } catch {
    res.status(500).json({ message: "Failed to compute score" });
  }
});

// GET /api/score/history
router.get("/score/history", requireAuth, async (req, res) => {
  const userId = res.locals.userId as string;
  try {
    const snapshots = await db
      .select()
      .from(scoreSnapshots)
      .where(eq(scoreSnapshots.userId, userId))
      .orderBy(desc(scoreSnapshots.computedAt))
      .limit(90); // last 90 data points
    res.json(snapshots);
  } catch {
    res.status(500).json({ message: "Failed to fetch score history" });
  }
});

// ── Score computation engine ─────────────────────────────────────────────────
// Weighted formula (max 1000 points):
//   Savings rate     250 pts — higher is better, capped at 40%
//   Goal momentum    250 pts — active goals with contributions
//   Expense ratio    200 pts — monthly expenses / (annual income / 12)
//   Net worth        150 pts — positive and growing
//   Mission streak   150 pts — completed missions in last 30 days

type FP = { annualIncome: number | null; monthlyExpenses: number | null; netWorth: number | null; savingsRate: number | null } | null;
type GoalRow = { status: string; targetAmount: number; currentAmount: number; monthlyContribution: number };
type MissionRow = { status: string };

function computeScore(fp: FP, userGoals: GoalRow[], missions: MissionRow[]) {
  // Savings rate (0–250)
  const savingsRate = fp?.savingsRate ?? 0;
  const savingsPts = Math.min(250, Math.round((savingsRate / 40) * 250));

  // Goal momentum (0–250)
  const activeGoals = userGoals.filter((g) => g.status === "active");
  const goalsWithContribution = activeGoals.filter((g) => g.monthlyContribution > 0);
  const goalPts =
    activeGoals.length === 0
      ? 0
      : Math.min(250, Math.round((goalsWithContribution.length / Math.max(1, activeGoals.length)) * 250));

  // Expense ratio (0–200)
  const monthlyIncome = fp?.annualIncome ? fp.annualIncome / 12 : 0;
  const monthlyExpenses = fp?.monthlyExpenses ?? 0;
  let expensePts = 100; // default mid-point when no data
  if (monthlyIncome > 0) {
    const ratio = monthlyExpenses / monthlyIncome;
    // Under 50% expenses → full points; over 90% → 0
    expensePts = Math.max(0, Math.min(200, Math.round((1 - Math.max(0, (ratio - 0.5) / 0.4)) * 200)));
  }

  // Net worth (0–150)
  const netWorth = fp?.netWorth ?? 0;
  const nwPts = netWorth <= 0 ? 0 : Math.min(150, Math.round((Math.log10(netWorth + 1) / 6) * 150));

  // Mission completions in last 30 days (0–150)
  const completedMissions = missions.filter((m) => m.status === "completed").length;
  const missionPts = Math.min(150, completedMissions * 5);

  const score = savingsPts + goalPts + expensePts + nwPts + missionPts;

  const drivers = [
    { label: "Savings Rate", value: savingsPts, maxValue: 250, trend: savingsRate >= 20 ? "up" : savingsRate >= 10 ? "neutral" : "down" },
    { label: "Goal Momentum", value: goalPts, maxValue: 250, trend: goalPts >= 200 ? "up" : goalPts >= 100 ? "neutral" : "down" },
    { label: "Expense Ratio", value: expensePts, maxValue: 200, trend: expensePts >= 150 ? "up" : expensePts >= 80 ? "neutral" : "down" },
    { label: "Net Worth", value: nwPts, maxValue: 150, trend: netWorth > 0 ? "up" : "down" },
    { label: "Daily Missions", value: missionPts, maxValue: 150, trend: completedMissions >= 20 ? "up" : completedMissions >= 10 ? "neutral" : "down" },
  ];

  return { score, drivers };
}

export default router;
