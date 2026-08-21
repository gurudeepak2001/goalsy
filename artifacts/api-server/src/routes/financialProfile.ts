import { Router } from "express";
import { eq, sql } from "drizzle-orm";
import { db, financialProfiles } from "@workspace/db";
import { requireAuth } from "../middlewares/requireAuth";

const router = Router();
const SAVINGS_MILESTONE = 100_000;

// GET /api/financial-profile
router.get("/financial-profile", requireAuth, async (req, res): Promise<void> => {
  const userId = res.locals.userId as string;
  try {
    const [profile] = await db
      .select()
      .from(financialProfiles)
      .where(eq(financialProfiles.userId, userId));

    res.json({ profile: profile ?? null });
  } catch (error) {
    req.log.error({ error }, "Failed to fetch financial profile");
    res.status(500).json({ message: "Failed to fetch financial profile" });
  }
});

// PUT /api/financial-profile — upsert
router.put("/financial-profile", requireAuth, async (req, res): Promise<void> => {
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
  const crossesSavingsMilestone = typeof netWorth === "number" && netWorth >= SAVINGS_MILESTONE;

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
        savingsMilestone100kAt: crossesSavingsMilestone ? new Date() : null,
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
          savingsMilestone100kAt: sql`coalesce(
            ${financialProfiles.savingsMilestone100kAt},
            case when excluded.net_worth >= ${SAVINGS_MILESTONE} then now() else null end
          )`,
          updatedAt: new Date(),
        },
      })
      .returning();

    res.json(profile);
  } catch (error) {
    req.log.error({ error }, "Failed to save financial profile");
    res.status(500).json({ message: "Failed to save financial profile" });
  }
});

export default router;
