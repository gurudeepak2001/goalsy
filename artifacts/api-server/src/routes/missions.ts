import { Router } from "express";
import { eq, and } from "drizzle-orm";
import { db, dailyMissions } from "@workspace/db";
import { requireAuth } from "../middlewares/requireAuth";

const router = Router();

// Mission templates rotated daily (index by day-of-year mod length)
const MISSION_TEMPLATES = [
  { title: "Review your largest expense category", description: "Open your spending breakdown and identify one category where you can reduce by 10% this month.", category: "review" },
  { title: "Top up your highest-priority goal", description: "Make a manual contribution to your top goal — even $25 compounds meaningfully over time.", category: "savings" },
  { title: "Check your credit utilisation", description: "Log in to any account and confirm your combined credit utilisation is below 30%.", category: "debt" },
  { title: "Schedule next month's bill payments", description: "Set up autopay or calendar reminders for every bill due in the next 30 days.", category: "action" },
  { title: "Review your emergency fund progress", description: "Confirm your emergency fund covers at least one month of expenses. If not, set a weekly auto-transfer.", category: "savings" },
  { title: "Evaluate one subscription", description: "Pick one recurring subscription and decide: is it adding value? Cancel or keep with intention.", category: "review" },
  { title: "Move idle cash to high-yield savings", description: "Any cash sitting in a current account earning under 1% APY should be moved to a high-yield account.", category: "investment" },
  { title: "Check your debt payoff timeline", description: "Review your highest-interest debt. Can you make one extra payment this month to shorten the payoff date?", category: "debt" },
  { title: "Update your net worth snapshot", description: "Add up your assets and liabilities and record today's net worth figure in your financial profile.", category: "review" },
  { title: "Set a 30-day savings challenge", description: "Commit to saving a specific amount every day for the next 30 days. Start today with Day 1.", category: "savings" },
  { title: "Review your investment allocation", description: "Check your current portfolio allocation matches your risk tolerance. Rebalance if it's drifted more than 5%.", category: "investment" },
  { title: "Negotiate one bill", description: "Call or chat with your internet, phone, or insurance provider. Ask for a loyalty discount or a competitor match.", category: "action" },
  { title: "Read one financial article", description: "Spend 10 minutes reading about a financial concept relevant to your goals — compounding, tax efficiency, or asset allocation.", category: "review" },
  { title: "Automate a savings transfer", description: "Set up an automatic weekly transfer from your checking to your savings account for any amount that feels manageable.", category: "savings" },
];

function todayDateString(): string {
  return new Date().toISOString().split("T")[0];
}

function getMissionTemplateForDate(dateStr: string) {
  // Use the day-of-year to pick a template so each calendar day has the same mission globally
  const d = new Date(dateStr);
  const start = new Date(d.getFullYear(), 0, 0);
  const diff = d.getTime() - start.getTime();
  const dayOfYear = Math.floor(diff / (1000 * 60 * 60 * 24));
  return MISSION_TEMPLATES[dayOfYear % MISSION_TEMPLATES.length];
}

// GET /api/missions/today
router.get("/missions/today", requireAuth, async (req, res) => {
  const userId = res.locals.userId as string;
  const today = todayDateString();

  try {
    // Look for an existing mission for today
    let [mission] = await db
      .select()
      .from(dailyMissions)
      .where(and(eq(dailyMissions.userId, userId), eq(dailyMissions.missionDate, today)));

    if (!mission) {
      // Generate today's mission from the template rotation
      const template = getMissionTemplateForDate(today);
      [mission] = await db
        .insert(dailyMissions)
        .values({
          userId,
          missionDate: today,
          title: template.title,
          description: template.description,
          category: template.category,
          status: "pending",
        })
        .returning();
    }

    res.json(mission);
  } catch {
    res.status(500).json({ message: "Failed to fetch today's mission" });
  }
});

// POST /api/missions/:id/complete
router.post("/missions/:id/complete", requireAuth, async (req, res) => {
  const userId = res.locals.userId as string;
  try {
    const [mission] = await db
      .update(dailyMissions)
      .set({ status: "completed", completedAt: new Date() })
      .where(and(eq(dailyMissions.id, req.params.id), eq(dailyMissions.userId, userId)))
      .returning();
    if (!mission) { res.status(404).json({ message: "Mission not found" }); return; }
    res.json(mission);
  } catch {
    res.status(500).json({ message: "Failed to complete mission" });
  }
});

// POST /api/missions/:id/skip
router.post("/missions/:id/skip", requireAuth, async (req, res) => {
  const userId = res.locals.userId as string;
  const { reason } = req.body as { reason: string };
  if (!reason) { res.status(400).json({ message: "reason is required" }); return; }

  try {
    const [mission] = await db
      .update(dailyMissions)
      .set({ status: "skipped", skipReason: reason })
      .where(and(eq(dailyMissions.id, req.params.id), eq(dailyMissions.userId, userId)))
      .returning();
    if (!mission) { res.status(404).json({ message: "Mission not found" }); return; }
    res.json(mission);
  } catch {
    res.status(500).json({ message: "Failed to skip mission" });
  }
});

export default router;
