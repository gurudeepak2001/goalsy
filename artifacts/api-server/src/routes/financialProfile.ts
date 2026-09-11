import { Router } from "express";
import { and, eq, sql } from "drizzle-orm";
import { db, financialProfiles, goals } from "@workspace/db";
import { UpdateFinancialProfileBody } from "@workspace/api-zod";
import { requireAuth } from "../middlewares/requireAuth";

const router = Router();
const SAVINGS_MILESTONE = 100_000;
const MAX_GOAL_AMOUNT = 2_147_483_647;
const DEFAULT_EMERGENCY_FUND_MONTHS = 3;
const EMERGENCY_FUND_TARGET_LIMIT_MESSAGE = "Emergency fund target must be $2,147,483,647 or less. Reduce monthly expenses or the selected duration.";

class FinancialProfileValidationError extends Error {}

function exceedsEmergencyFundTargetLimit(monthlyExpenses: number | null | undefined, months: number): boolean {
  return monthlyExpenses != null
    && monthlyExpenses > 0
    && monthlyExpenses > Math.floor(MAX_GOAL_AMOUNT / months);
}

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
  const parsedBody = UpdateFinancialProfileBody.safeParse(req.body);
  if (!parsedBody.success) {
    req.log.warn({ errors: parsedBody.error.issues }, "Invalid financial profile update");
    res.status(400).json({ message: "Invalid financial profile update" });
    return;
  }
  const {
    annualIncome,
    monthlyExpenses,
    emergencyFundAmount,
    emergencyFundMonths,
    netWorth,
    savingsRate,
    riskTolerance,
    primaryGoalType,
  } = parsedBody.data;
  const crossesSavingsMilestone = typeof netWorth === "number" && netWorth >= SAVINGS_MILESTONE;
  if (monthlyExpenses != null && (!Number.isInteger(monthlyExpenses) || monthlyExpenses < 0)) {
    res.status(400).json({ message: "Monthly expenses must be a non-negative whole dollar amount" });
    return;
  }
  if (emergencyFundAmount != null && (!Number.isInteger(emergencyFundAmount) || emergencyFundAmount < 0)) {
    res.status(400).json({ message: "Emergency fund amount must be a non-negative whole dollar amount" });
    return;
  }
  if (emergencyFundAmount != null && emergencyFundAmount > MAX_GOAL_AMOUNT) {
    res.status(400).json({ message: "Emergency fund opening balance must be $2,147,483,647 or less." });
    return;
  }
  if (emergencyFundMonths != null && (!Number.isInteger(emergencyFundMonths) || emergencyFundMonths < 1 || emergencyFundMonths > 120)) {
    res.status(400).json({ message: "Emergency fund duration must be between 1 and 120 whole months" });
    return;
  }

  try {
    const [currentProfile] = await db
      .select({
        monthlyExpenses: financialProfiles.monthlyExpenses,
        emergencyFundMonths: financialProfiles.emergencyFundMonths,
      })
      .from(financialProfiles)
      .where(eq(financialProfiles.userId, userId));
    const targetMonthlyExpenses = monthlyExpenses ?? currentProfile?.monthlyExpenses;
    const targetMonths = emergencyFundMonths
      ?? currentProfile?.emergencyFundMonths
      ?? DEFAULT_EMERGENCY_FUND_MONTHS;
    if (exceedsEmergencyFundTargetLimit(targetMonthlyExpenses, targetMonths)) {
      res.status(400).json({ message: EMERGENCY_FUND_TARGET_LIMIT_MESSAGE });
      return;
    }

    const profile = await db.transaction(async (tx) => {
      // Profile saves can be repeated from multiple devices. Serialize the
      // emergency-goal setup so an initial profile never creates duplicates.
      await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${userId}))`);
      const [lockedProfile] = await tx
        .select({
          monthlyExpenses: financialProfiles.monthlyExpenses,
          emergencyFundMonths: financialProfiles.emergencyFundMonths,
        })
        .from(financialProfiles)
        .where(eq(financialProfiles.userId, userId));
      const lockedTargetMonthlyExpenses = monthlyExpenses ?? lockedProfile?.monthlyExpenses;
      const lockedTargetMonths = emergencyFundMonths
        ?? lockedProfile?.emergencyFundMonths
        ?? DEFAULT_EMERGENCY_FUND_MONTHS;
      if (exceedsEmergencyFundTargetLimit(lockedTargetMonthlyExpenses, lockedTargetMonths)) {
        throw new FinancialProfileValidationError(EMERGENCY_FUND_TARGET_LIMIT_MESSAGE);
      }

      const [savedProfile] = await tx
        .insert(financialProfiles)
        .values({
          userId,
          annualIncome,
          monthlyExpenses,
          emergencyFundAmount,
          emergencyFundMonths,
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
            ...(emergencyFundMonths !== undefined && { emergencyFundMonths }),
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
        const targetAmount = savedProfile.monthlyExpenses * savedProfile.emergencyFundMonths;
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
    if (error instanceof FinancialProfileValidationError) {
      res.status(400).json({ message: error.message });
      return;
    }
    req.log.error({ error }, "Failed to save financial profile");
    res.status(500).json({ message: "Failed to save financial profile" });
  }
});

export default router;
