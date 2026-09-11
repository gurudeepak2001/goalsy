import { Router } from "express";
import { and, eq, sql } from "drizzle-orm";
import { db, financialProfiles, goals } from "@workspace/db";
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
    emergencyFundAmount,
    netWorth,
    savingsRate,
    riskTolerance,
    primaryGoalType,
  } = req.body as {
    annualIncome?: number | null;
    monthlyExpenses?: number | null;
    emergencyFundAmount?: number | null;
    netWorth?: number | null;
    savingsRate?: number | null;
    riskTolerance?: string | null;
    primaryGoalType?: string | null;
  };
  const crossesSavingsMilestone = typeof netWorth === "number" && netWorth >= SAVINGS_MILESTONE;
  if (monthlyExpenses != null && (!Number.isInteger(monthlyExpenses) || monthlyExpenses < 0)) {
    res.status(400).json({ message: "Monthly expenses must be a non-negative whole dollar amount" });
    return;
  }
  if (emergencyFundAmount != null && (!Number.isInteger(emergencyFundAmount) || emergencyFundAmount < 0)) {
    res.status(400).json({ message: "Emergency fund amount must be a non-negative whole dollar amount" });
    return;
  }

  try {
    const profile = await db.transaction(async (tx) => {
      // Profile saves can be repeated from multiple devices. Serialize the
      // emergency-goal setup so an initial profile never creates duplicates.
      await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${userId}))`);
      const [savedProfile] = await tx
        .insert(financialProfiles)
        .values({
          userId,
          annualIncome,
          monthlyExpenses,
          emergencyFundAmount,
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
            ...(emergencyFundAmount !== undefined && { emergencyFundAmount }),
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

      if (savedProfile.monthlyExpenses != null && savedProfile.monthlyExpenses > 0) {
        const targetAmount = savedProfile.monthlyExpenses * 3;
        const [existingEmergencyGoal] = await tx
          .select({ id: goals.id })
          .from(goals)
          .where(and(eq(goals.userId, userId), eq(goals.type, "emergency_fund")));

        if (existingEmergencyGoal) {
          await tx.update(goals)
            .set({ targetAmount, updatedAt: new Date() })
            .where(eq(goals.id, existingEmergencyGoal.id));
        } else {
          await tx.insert(goals).values({
            userId,
            name: "Emergency Fund",
            type: "emergency_fund",
            targetAmount,
            currentAmount: savedProfile.emergencyFundAmount ?? 0,
            openingAmount: savedProfile.emergencyFundAmount ?? 0,
            monthlyContribution: 0,
            paymentFrequency: "monthly",
            status: "active",
            priority: 1,
          });
        }
      }
      return savedProfile;
    });

    res.json(profile);
  } catch (error) {
    req.log.error({ error }, "Failed to save financial profile");
    res.status(500).json({ message: "Failed to save financial profile" });
  }
});

export default router;
