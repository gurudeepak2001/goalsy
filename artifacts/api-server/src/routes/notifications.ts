import { Router } from "express";
import { eq, and } from "drizzle-orm";
import { db, notifications, goals, notificationPreferences, pushTokens } from "@workspace/db";
import { requireAuth } from "../middlewares/requireAuth";
import { checkGoalBehind } from "../lib/checkGoalBehind";
import { sendPushToMany } from "../lib/sendPush";

const router = Router();

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

          // ── Push notification (fire-and-forget) ─────────────────────────
          // Runs in background; any error is caught inside sendPushToMany so
          // it never blocks the GET response.
          db.select({ token: pushTokens.token })
            .from(pushTokens)
            .where(eq(pushTokens.userId, userId))
            .then((rows) => {
              const tokens = rows.map((r) => r.token);
              if (tokens.length > 0) {
                sendPushToMany(tokens, {
                  title: `${goal.name} is falling behind`,
                  body,
                  data: { targetScreen: `/goals/${goal.id}` },
                }).catch(() => {/* already logged inside sendPushToMany */});
              }
            })
            .catch(() => {/* db error — skip push silently */});
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
