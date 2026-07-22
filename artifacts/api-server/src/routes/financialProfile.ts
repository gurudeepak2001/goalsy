import { Router } from "express";
import { eq } from "drizzle-orm";
import { db, financialProfiles } from "@workspace/db";
import { requireAuth } from "../middlewares/requireAuth";

const router = Router();

// GET /api/financial-profile
router.get("/financial-profile", requireAuth, async (req, res) => {
  const userId = res.locals.userId as string;
  try {
    const [profile] = await db
      .select()
      .from(financialProfiles)
      .where(eq(financialProfiles.userId, userId));

    res.json({ profile: profile ?? null });
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch financial profile" });
  }
});

// PUT /api/financial-profile — upsert
router.put("/financial-profile", requireAuth, async (req, res) => {
  const userId = res.locals.userId as string;
  const {
    annualIncome,
    monthlyExpenses,
    netWorth,
    savingsRate,
    riskTolerance,
    primaryGoalType,
  } = req.body as {
    annualIncome?: number | null;
    monthlyExpenses?: number | null;
    netWorth?: number | null;
    savingsRate?: number | null;
    riskTolerance?: string | null;
    primaryGoalType?: string | null;
  };

  try {
    const [profile] = await db
      .insert(financialProfiles)
      .values({
        userId,
        annualIncome,
        monthlyExpenses,
        netWorth,
        savingsRate,
        riskTolerance,
        primaryGoalType,
      })
      .onConflictDoUpdate({
        target: financialProfiles.userId,
        set: {
          ...(annualIncome !== undefined && { annualIncome }),
          ...(monthlyExpenses !== undefined && { monthlyExpenses }),
          ...(netWorth !== undefined && { netWorth }),
          ...(savingsRate !== undefined && { savingsRate }),
          ...(riskTolerance !== undefined && { riskTolerance }),
          ...(primaryGoalType !== undefined && { primaryGoalType }),
          updatedAt: new Date(),
        },
      })
      .returning();

    res.json(profile);
  } catch (err) {
    res.status(500).json({ message: "Failed to save financial profile" });
  }
});

export default router;
