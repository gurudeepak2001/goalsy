import { Router } from "express";
import { eq, and } from "drizzle-orm";
import { db, goals } from "@workspace/db";
import { requireAuth } from "../middlewares/requireAuth";

const router = Router();

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
    name, type, targetAmount, currentAmount, monthlyContribution, targetDate, status, priority,
  } = req.body as {
    name: string;
    type: string;
    targetAmount: number;
    currentAmount?: number;
    monthlyContribution?: number;
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
        monthlyContribution: monthlyContribution ?? 0,
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
  try {
    const [goal] = await db
      .select()
      .from(goals)
      .where(and(eq(goals.id, req.params.id), eq(goals.userId, userId)));
    if (!goal) { res.status(404).json({ message: "Goal not found" }); return; }
    res.json(goal);
  } catch {
    res.status(500).json({ message: "Failed to fetch goal" });
  }
});

// PUT /api/goals/:id
router.put("/goals/:id", requireAuth, async (req, res) => {
  const userId = res.locals.userId as string;
  const {
    name, type, targetAmount, currentAmount, monthlyContribution, targetDate, status, priority,
  } = req.body as Partial<{
    name: string;
    type: string;
    targetAmount: number;
    currentAmount: number;
    monthlyContribution: number;
    targetDate: string | null;
    status: string;
    priority: number;
  }>;

  try {
    const [goal] = await db
      .update(goals)
      .set({
        ...(name !== undefined && { name }),
        ...(type !== undefined && { type }),
        ...(targetAmount !== undefined && { targetAmount }),
        ...(currentAmount !== undefined && { currentAmount }),
        ...(monthlyContribution !== undefined && { monthlyContribution }),
        ...(targetDate !== undefined && { targetDate }),
        ...(status !== undefined && { status }),
        ...(priority !== undefined && { priority }),
        updatedAt: new Date(),
      })
      .where(and(eq(goals.id, req.params.id), eq(goals.userId, userId)))
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
  try {
    const deleted = await db
      .delete(goals)
      .where(and(eq(goals.id, req.params.id), eq(goals.userId, userId)))
      .returning();
    if (!deleted.length) { res.status(404).json({ message: "Goal not found" }); return; }
    res.status(204).send();
  } catch {
    res.status(500).json({ message: "Failed to delete goal" });
  }
});

export default router;
