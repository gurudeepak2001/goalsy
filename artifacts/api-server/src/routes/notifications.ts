import { Router } from "express";
import { eq, and } from "drizzle-orm";
import { db, notifications, goals, notificationPreferences } from "@workspace/db";
import { requireAuth } from "../middlewares/requireAuth";

const router = Router();

const MS_PER_MONTH = 30.44 * 24 * 60 * 60 * 1000;

/**
 * Compute whether a goal is "behind schedule".
 *
 * Two modes:
 *  1. targetDate present: behind when currentAmount < 90% of the linearly-
 *     expected amount based on elapsed time since creation.
 *  2. No targetDate but monthlyContribution > 0: behind when the actual
 *     monthly run-rate (currentAmount ÷ months elapsed) is < 90% of the
 *     planned monthly contribution.
 *
 * Returns { behind, expectedByNow, contributionShortfall }.
 * contributionShortfall is set (> 0) only for mode 2.
 */
function checkGoalBehind(goal: {
  targetAmount: number;
  currentAmount: number;
  monthlyContribution: number;
  targetDate: string | null;
  createdAt: Date;
}): { behind: boolean; expectedByNow: number; contributionShortfall: number } {
  const created = new Date(goal.createdAt).getTime();
  const now = Date.now();

  // ── Mode 1: target-date goal ──────────────────────────────────────────────
  if (goal.targetDate) {
    const target = new Date(goal.targetDate).getTime();
    const total = target - created;
    if (total <= 0) return { behind: false, expectedByNow: goal.targetAmount, contributionShortfall: 0 };

    const elapsed = Math.max(0, now - created);
    const fraction = Math.min(1, elapsed / total);
    const expectedByNow = goal.targetAmount * fraction;

    const behind = goal.currentAmount < expectedByNow * 0.9;
    return { behind, expectedByNow, contributionShortfall: 0 };
  }

  // ── Mode 2: contribution-rate goal (no targetDate) ────────────────────────
  if (goal.monthlyContribution > 0) {
    const elapsedMs = Math.max(0, now - created);
    const monthsElapsed = elapsedMs / MS_PER_MONTH;

    // Need at least a few days of history to avoid false positives right after creation.
    if (monthsElapsed < 0.1) return { behind: false, expectedByNow: 0, contributionShortfall: 0 };

    const actualRate = goal.currentAmount / monthsElapsed;
    const behind = actualRate < goal.monthlyContribution * 0.9;
    const contributionShortfall = Math.max(0, goal.monthlyContribution - actualRate);
    return { behind, expectedByNow: 0, contributionShortfall };
  }

  return { behind: false, expectedByNow: 0, contributionShortfall: 0 };
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
        const { behind, expectedByNow, contributionShortfall } = checkGoalBehind(goal);
        if (behind && !remindedGoalIds.has(goal.id)) {
          const fmt = (n: number) =>
            n >= 1000 ? `$${Math.round(n / 1000)}k` : `$${Math.round(n)}`;

          let body: string;
          if (contributionShortfall > 0) {
            // Contribution-rate goal: explain shortfall in monthly terms
            body = `You're averaging ${fmt(contributionShortfall)}/mo less than your planned ${fmt(goal.monthlyContribution)}/mo. Try topping up to stay on pace.`;
          } else {
            // Target-date goal: explain shortfall vs. expected amount
            const shortfall = expectedByNow - goal.currentAmount;
            body = `You're ${fmt(shortfall)} behind the expected pace. Consider increasing contributions to get back on track.`;
          }

          await db.insert(notifications).values({
            userId,
            type: "goal",
            title: `${goal.name} is falling behind`,
            body,
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
  const id = req.params.id as string;
  try {
    const [notification] = await db
      .update(notifications)
      .set({ isRead: true })
      .where(and(eq(notifications.id, id), eq(notifications.userId, userId)))
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
  const id = req.params.id as string;
  try {
    const [notification] = await db
      .update(notifications)
      .set({ isDismissed: true, isRead: true })
      .where(and(eq(notifications.id, id), eq(notifications.userId, userId)))
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
