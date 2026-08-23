import { Router } from "express";
import { eq, and, desc } from "drizzle-orm";
import { db, goals, goalProgressEntries } from "@workspace/db";
import { requireAuth } from "../middlewares/requireAuth";

const router = Router();

type GoalRow = typeof goals.$inferSelect;
type ProgressRow = typeof goalProgressEntries.$inferSelect;

type LedgerRow = {
  entry: ProgressRow;
  weeklyDeposit: number;
  confirmedAmount: number;
};

/**
 * Old clients wrote multiple cumulative snapshots for a week. The latest one is
 * the effective value; retaining older rows preserves their audit trail.
 */
function getEffectiveProgressEntries(entries: ProgressRow[]) {
  const latestByWeek = new Map<number, ProgressRow>();
  for (const entry of entries) {
    if (!latestByWeek.has(entry.weekIndex)) latestByWeek.set(entry.weekIndex, entry);
  }
  return [...latestByWeek.values()].sort((a, b) => a.weekIndex - b.weekIndex);
}

/**
 * Builds a single-deposit-per-week ledger. Legacy cumulative rows are converted
 * to differences without overwriting the original values until a user saves.
 */
function buildProgressLedger(goal: GoalRow, entries: ProgressRow[]) {
  const hasLegacySnapshots = entries.some((entry) => entry.weeklyDeposit === null);
  const inferredOpeningAmount =
    entries.length === 0 && goal.openingAmount === 0 && goal.currentAmount > 0
      ? goal.currentAmount
      : goal.openingAmount;
  // Historical snapshots had already replaced currentAmount, so a zero baseline
  // preserves every historical total when they are converted to deposits.
  const openingAmount = hasLegacySnapshots ? 0 : inferredOpeningAmount;

  let runningTotal = openingAmount;
  const rows: LedgerRow[] = entries.map((entry) => {
    const weeklyDeposit =
      entry.weeklyDeposit ?? entry.confirmedAmount - runningTotal;
    runningTotal += weeklyDeposit;
    return { entry, weeklyDeposit, confirmedAmount: runningTotal };
  });

  return { openingAmount, currentAmount: runningTotal, rows };
}

function serializeLedgerRows(rows: LedgerRow[]) {
  return rows.map(({ entry, weeklyDeposit, confirmedAmount }) => ({
    ...entry,
    weeklyDeposit,
    confirmedAmount,
  }));
}

// GET /api/goals
router.get("/goals", requireAuth, async (req, res) => {
  const userId = res.locals.userId as string;
  try {
    const rows = await db
      .select()
      .from(goals)
      .where(eq(goals.userId, userId))
      .orderBy(goals.priority, goals.createdAt);
    res.json(rows);
  } catch {
    res.status(500).json({ message: "Failed to fetch goals" });
  }
});

// POST /api/goals
router.post("/goals", requireAuth, async (req, res) => {
  const userId = res.locals.userId as string;
  const {
    name, type, targetAmount, currentAmount, monthlyContribution, paymentFrequency, targetDate, status, priority,
  } = req.body as {
    name: string;
    type: string;
    targetAmount: number;
    currentAmount?: number;
    monthlyContribution?: number;
    paymentFrequency?: string;
    targetDate?: string | null;
    status?: string;
    priority?: number;
  };

  if (!name || !type || targetAmount == null) {
    res.status(400).json({ message: "name, type, and targetAmount are required" });
    return;
  }

  try {
    const [goal] = await db
      .insert(goals)
      .values({
        userId,
        name,
        type,
        targetAmount,
        currentAmount: currentAmount ?? 0,
        openingAmount: currentAmount ?? 0,
        monthlyContribution: monthlyContribution ?? 0,
        paymentFrequency: paymentFrequency ?? "monthly",
        targetDate: targetDate ?? null,
        status: status ?? "active",
        priority: priority ?? 1,
      })
      .returning();
    res.status(201).json(goal);
  } catch {
    res.status(500).json({ message: "Failed to create goal" });
  }
});

// GET /api/goals/:id
router.get("/goals/:id", requireAuth, async (req, res) => {
  const userId = res.locals.userId as string;
  const id = req.params.id as string;
  try {
    const [goal] = await db
      .select()
      .from(goals)
      .where(and(eq(goals.id, id), eq(goals.userId, userId)));
    if (!goal) { res.status(404).json({ message: "Goal not found" }); return; }
    res.json(goal);
  } catch {
    res.status(500).json({ message: "Failed to fetch goal" });
  }
});

// PUT /api/goals/:id
router.put("/goals/:id", requireAuth, async (req, res) => {
  const userId = res.locals.userId as string;
  const id = req.params.id as string;
  const {
    name, type, targetAmount, currentAmount, monthlyContribution, paymentFrequency, targetDate, status, priority,
  } = req.body as Partial<{
    name: string;
    type: string;
    targetAmount: number;
    currentAmount: number;
    monthlyContribution: number;
    paymentFrequency: string;
    targetDate: string | null;
    status: string;
    priority: number;
  }>;

  try {
    if (currentAmount !== undefined) {
      const existingProgress = await db
        .select({ id: goalProgressEntries.id })
        .from(goalProgressEntries)
        .where(and(eq(goalProgressEntries.goalId, id), eq(goalProgressEntries.userId, userId)))
        .limit(1);
      if (existingProgress.length) {
        res.status(409).json({ message: "Update weekly deposits instead of manually changing a goal with progress history" });
        return;
      }
    }

    const [goal] = await db
      .update(goals)
      .set({
        ...(name !== undefined && { name }),
        ...(type !== undefined && { type }),
        ...(targetAmount !== undefined && { targetAmount }),
        ...(currentAmount !== undefined && { currentAmount }),
        ...(currentAmount !== undefined && { openingAmount: currentAmount }),
        ...(monthlyContribution !== undefined && { monthlyContribution }),
        ...(paymentFrequency !== undefined && { paymentFrequency }),
        ...(targetDate !== undefined && { targetDate }),
        ...(status !== undefined && { status }),
        ...(priority !== undefined && { priority }),
        updatedAt: new Date(),
      })
      .where(and(eq(goals.id, id), eq(goals.userId, userId)))
      .returning();
    if (!goal) { res.status(404).json({ message: "Goal not found" }); return; }
    res.json(goal);
  } catch {
    res.status(500).json({ message: "Failed to update goal" });
  }
});

// DELETE /api/goals/:id
router.delete("/goals/:id", requireAuth, async (req, res) => {
  const userId = res.locals.userId as string;
  const id = req.params.id as string;
  try {
    const deleted = await db
      .delete(goals)
      .where(and(eq(goals.id, id), eq(goals.userId, userId)))
      .returning();
    if (!deleted.length) { res.status(404).json({ message: "Goal not found" }); return; }
    res.status(204).send();
  } catch {
    res.status(500).json({ message: "Failed to delete goal" });
  }
});

// GET /api/goals/:id/progress
router.get("/goals/:id/progress", requireAuth, async (req, res) => {
  const userId = res.locals.userId as string;
  const id = req.params.id as string;
  try {
    // Verify the goal belongs to this user
    const [goal] = await db
      .select()
      .from(goals)
      .where(and(eq(goals.id, id), eq(goals.userId, userId)));
    if (!goal) { res.status(404).json({ message: "Goal not found" }); return; }

    const entries = await db
      .select()
      .from(goalProgressEntries)
      .where(
        and(
          eq(goalProgressEntries.goalId, id),
          eq(goalProgressEntries.userId, userId),
        ),
      )
      .orderBy(desc(goalProgressEntries.confirmedAt), desc(goalProgressEntries.id));
    const ledger = buildProgressLedger(goal, getEffectiveProgressEntries(entries));
    res.json(serializeLedgerRows(ledger.rows));
  } catch {
    res.status(500).json({ message: "Failed to fetch progress entries" });
  }
});

// POST /api/goals/:id/progress
router.post("/goals/:id/progress", requireAuth, async (req, res) => {
  const userId = res.locals.userId as string;
  const id = req.params.id as string;
  const { weekIndex, weeklyDeposit } = req.body as {
    weekIndex: number;
    weeklyDeposit: number;
  };

  if (!Number.isInteger(weekIndex) || weekIndex < 0 || !Number.isInteger(weeklyDeposit) || weeklyDeposit < 0) {
    res.status(400).json({ message: "weekIndex and weeklyDeposit must be non-negative whole numbers" });
    return;
  }

  try {
    const result = await db.transaction(async (tx) => {
      const [goal] = await tx
        .select()
        .from(goals)
        .where(and(eq(goals.id, id), eq(goals.userId, userId)));
      if (!goal) return null;

      const savedEntries = await tx
        .select()
        .from(goalProgressEntries)
        .where(and(eq(goalProgressEntries.goalId, id), eq(goalProgressEntries.userId, userId)))
        .orderBy(desc(goalProgressEntries.confirmedAt), desc(goalProgressEntries.id));
      const effectiveEntries = getEffectiveProgressEntries(savedEntries);
      const existingEntry = effectiveEntries.find((entry) => entry.weekIndex === weekIndex);

      let nextEntries: ProgressRow[];
      let selectedEntryId: string;
      if (existingEntry) {
        await tx
          .update(goalProgressEntries)
          .set({ weeklyDeposit })
          .where(eq(goalProgressEntries.id, existingEntry.id));
        nextEntries = effectiveEntries.map((entry) =>
          entry.id === existingEntry.id ? { ...entry, weeklyDeposit } : entry,
        );
        selectedEntryId = existingEntry.id;
      } else {
        const [entry] = await tx
          .insert(goalProgressEntries)
          .values({
            goalId: id,
            userId,
            weekIndex,
            weeklyDeposit,
            confirmedAmount: 0,
          })
          .returning();
        nextEntries = [...effectiveEntries, entry].sort((a, b) => a.weekIndex - b.weekIndex);
        selectedEntryId = entry.id;
      }

      const ledger = buildProgressLedger(goal, nextEntries);
      await Promise.all(
        ledger.rows.map(({ entry, weeklyDeposit: amount, confirmedAmount }) =>
          tx
            .update(goalProgressEntries)
            .set({ weeklyDeposit: amount, confirmedAmount })
            .where(eq(goalProgressEntries.id, entry.id)),
        ),
      );
      await tx
        .update(goals)
        .set({
          openingAmount: ledger.openingAmount,
          currentAmount: ledger.currentAmount,
          updatedAt: new Date(),
        })
        .where(and(eq(goals.id, id), eq(goals.userId, userId)));

      const selectedRow = ledger.rows.find(({ entry }) => entry.id === selectedEntryId);
      return selectedRow ? serializeLedgerRows([selectedRow])[0] : null;
    });
    if (!result) { res.status(404).json({ message: "Goal not found" }); return; }
    res.status(201).json(result);
  } catch {
    res.status(500).json({ message: "Failed to log progress" });
  }
});

export default router;
