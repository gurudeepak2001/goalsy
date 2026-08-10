import { Router } from "express";
import { eq, and } from "drizzle-orm";
import { db, notifications, goals, notificationPreferences } from "@workspace/db";
import { requireAuth } from "../middlewares/requireAuth";

const router = Router();

/**
 * Compute whether a goal is "behind schedule".
 * A goal is behind when it has a targetDate AND currentAmount < 90% of the
 * linearly-expected amount based on elapsed time since creation.
 * Returns { behind: boolean, expectedByNow: number }.
 */
function checkGoalBehind(goal: {
  targetAmount: number;
  currentAmount: number;
  targetDate: string | null;
  createdAt: Date;
}): { behind: boolean; expectedByNow: number } {
  if (!goal.targetDate) return { behind: false, expectedByNow: 0 };

  const created = new Date(goal.createdAt).getTime();
  const target = new Date(goal.targetDate).getTime();
  const now = Date.now();

  const total = target - created;
  if (total <= 0) return { behind: false, expectedByNow: goal.targetAmount };

  const elapsed = Math.max(0, now - created);
  const fraction = Math.min(1, elapsed / total);
  const expectedByNow = goal.targetAmount * fraction;

  const behind = goal.currentAmount < expectedByNow * 0.9;
  return { behind, expectedByNow };
}

// GET /api/notifications — non-dismissed notifications for current user.
// Also generates goal-reminder notifications for behind goals when the
// goal_reminders preference is enabled.
router.get("/notifications", requireAuth, async (req, res) => {
  const userId = res.locals.userId as string;
  try {
    // ── 1. Check goal_reminders preference ───────────────────────────────────
    const prefRows = await db
      .select()
      .from(notificationPreferences)
      .where(
        and(
          eq(notificationPreferences.userId, userId),
          eq(notificationPreferences.type, "goal_reminders"),
        ),
      );
    const goalRemindersEnabled = prefRows.length === 0 || prefRows[0].enabled;

    if (goalRemindersEnabled) {
      // ── 2. Fetch active goals ───────────────────────────────────────────────
      const userGoals = await db
        .select()
        .from(goals)
        .where(and(eq(goals.userId, userId), eq(goals.status, "active")));

      // ── 3. Fetch existing non-dismissed goal-reminder notifications ─────────
      const existingReminders = await db
        .select({ targetId: notifications.targetId })
        .from(notifications)
        .where(
          and(
            eq(notifications.userId, userId),
            eq(notifications.type, "goal"),
            eq(notifications.isDismissed, false),
          ),
        );
      const remindedGoalIds = new Set(existingReminders.map((r) => r.targetId));

      // ── 4. Insert notifications for newly-behind goals ──────────────────────
      for (const goal of userGoals) {
        const { behind, expectedByNow } = checkGoalBehind(goal);
        if (behind && !remindedGoalIds.has(goal.id)) {
          const shortfall = expectedByNow - goal.currentAmount;
          const fmt = (n: number) =>
            n >= 1000 ? `$${Math.round(n / 1000)}k` : `$${Math.round(n)}`;
          await db.insert(notifications).values({
            userId,
            type: "goal",
            title: `${goal.name} is falling behind`,
            body: `You're ${fmt(shortfall)} behind the expected pace. Consider increasing contributions to get back on track.`,
            targetScreen: "/goals/" + goal.id,
            targetId: goal.id,
          });
        }
      }
    }

    // ── 5. Return all non-dismissed notifications ──────────────────────────
    const rows = await db
      .select()
      .from(notifications)
      .where(and(eq(notifications.userId, userId), eq(notifications.isDismissed, false)))
      .orderBy(notifications.createdAt);
    res.json(rows.reverse()); // newest first
  } catch {
    res.status(500).json({ message: "Failed to fetch notifications" });
  }
});

// POST /api/notifications/:id/read
router.post("/notifications/:id/read", requireAuth, async (req, res) => {
  const userId = res.locals.userId as string;
  try {
    const [notification] = await db
      .update(notifications)
      .set({ isRead: true })
      .where(and(eq(notifications.id, req.params.id), eq(notifications.userId, userId)))
      .returning();
    if (!notification) { res.status(404).json({ message: "Notification not found" }); return; }
    res.json(notification);
  } catch {
    res.status(500).json({ message: "Failed to mark notification as read" });
  }
});

// POST /api/notifications/:id/dismiss
router.post("/notifications/:id/dismiss", requireAuth, async (req, res) => {
  const userId = res.locals.userId as string;
  try {
    const [notification] = await db
      .update(notifications)
      .set({ isDismissed: true, isRead: true })
      .where(and(eq(notifications.id, req.params.id), eq(notifications.userId, userId)))
      .returning();
    if (!notification) { res.status(404).json({ message: "Notification not found" }); return; }
    res.json(notification);
  } catch {
    res.status(500).json({ message: "Failed to dismiss notification" });
  }
});

// DELETE /api/notifications — dismiss all
router.delete("/notifications", requireAuth, async (req, res) => {
  const userId = res.locals.userId as string;
  try {
    await db
      .update(notifications)
      .set({ isDismissed: true, isRead: true })
      .where(and(eq(notifications.userId, userId), eq(notifications.isDismissed, false)));
    res.status(204).send();
  } catch {
    res.status(500).json({ message: "Failed to clear notifications" });
  }
});

export default router;
