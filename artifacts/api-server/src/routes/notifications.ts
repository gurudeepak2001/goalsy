import { Router } from "express";
import { eq, and, inArray } from "drizzle-orm";
import {
  db,
  notifications,
  goals,
  goalProgressEntries,
  notificationPreferences,
  pushTokens,
} from "@workspace/db";
import { requireAuth } from "../middlewares/requireAuth";
import { checkGoalBehind } from "../lib/checkGoalBehind";
import { sendPushToMany } from "../lib/sendPush";

const router = Router();

// ── Helpers ────────────────────────────────────────────────────────────────────

const fmt = (n: number) =>
  n >= 1000 ? `$${Math.round(n / 1000)}k` : `$${Math.round(n)}`;

/** Fire-and-forget push to all stored devices for a user. */
function pushToUser(
  userId: string,
  title: string,
  body: string,
  targetScreen: string,
) {
  db.select({ token: pushTokens.token })
    .from(pushTokens)
    .where(eq(pushTokens.userId, userId))
    .then((rows) => {
      const tokens = rows.map((r) => r.token);
      if (tokens.length > 0) {
        sendPushToMany(tokens, { title, body, data: { targetScreen } }).catch(
          () => {},
        );
      }
    })
    .catch(() => {});
}

/** Look up which preference types are explicitly disabled for a user.
 *  Missing rows → default enabled. */
async function disabledPrefs(userId: string, types: string[]): Promise<Set<string>> {
  const rows = await db
    .select()
    .from(notificationPreferences)
    .where(
      and(
        eq(notificationPreferences.userId, userId),
        inArray(notificationPreferences.type, types),
      ),
    );
  return new Set(
    rows.filter((r) => !r.enabled).map((r) => r.type),
  );
}

// ── GET /api/notifications ─────────────────────────────────────────────────────
// Returns all non-dismissed notifications and auto-generates three kinds:
//   1. Behind-goal alerts        (pref: goal_reminders)
//   2. 7-day deadline warnings   (pref: goal_updates)
//   3. Weekly confirmation nudge (pref: weekly_summary)
router.get("/notifications", requireAuth, async (req, res) => {
  const userId = res.locals.userId as string;
  try {
    const disabled = await disabledPrefs(userId, [
      "goal_reminders",
      "goal_updates",
      "weekly_summary",
    ]);

    // ── Load active goals (shared by all three generators) ─────────────────
    const userGoals = await db
      .select()
      .from(goals)
      .where(and(eq(goals.userId, userId), eq(goals.status, "active")));

    if (userGoals.length > 0) {
      // ── Fetch all undismissed notifications for this user at once ─────────
      const existingNotifs = await db
        .select({ type: notifications.type, targetId: notifications.targetId })
        .from(notifications)
        .where(
          and(
            eq(notifications.userId, userId),
            eq(notifications.isDismissed, false),
          ),
        );

      // Build lookup sets keyed by "type::targetId" for O(1) dedup checks
      const notifKeys = new Set(
        existingNotifs.map((n) => `${n.type}::${n.targetId ?? ""}`),
      );
      const hasNotif = (type: string, targetId: string) =>
        notifKeys.has(`${type}::${targetId}`);

      // ── 1. Behind-goal alerts ────────────────────────────────────────────
      if (!disabled.has("goal_reminders")) {
        for (const goal of userGoals) {
          const { behind, expectedByNow, contributionShortfall } =
            checkGoalBehind(goal);
          if (behind && !hasNotif("goal", goal.id)) {
            let body: string;
            if (contributionShortfall > 0) {
              body = `You're averaging ${fmt(contributionShortfall)}/mo less than your planned ${fmt(goal.monthlyContribution)}/mo. Try topping up to stay on pace.`;
            } else {
              const shortfall = expectedByNow - goal.currentAmount;
              body = `You're ${fmt(shortfall)} behind the expected pace. Consider increasing contributions to get back on track.`;
            }
            const title = `${goal.name} is falling behind`;
            await db.insert(notifications).values({
              userId,
              type: "goal",
              title,
              body,
              targetScreen: "/goals/" + goal.id,
              targetId: goal.id,
            });
            pushToUser(userId, title, body, `/goals/${goal.id}`);
          }
        }
      }

      // ── 2. 7-day deadline warnings ──────────────────────────────────────
      if (!disabled.has("goal_updates")) {
        const todayStr = new Date().toISOString().split("T")[0]!;
        // "7 days from now" — compare as YYYY-MM-DD strings (lexicographic = chronological)
        const in7DaysStr = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
          .toISOString()
          .split("T")[0]!;

        for (const goal of userGoals) {
          if (!goal.targetDate) continue;
          // Only fire when the date is between today and 7 days away
          if (goal.targetDate < todayStr || goal.targetDate > in7DaysStr)
            continue;
          // Skip if already notified (undismissed deadline warning for this goal)
          if (hasNotif("goal_deadline", goal.id)) continue;

          const daysLeft = Math.max(
            0,
            Math.round(
              (new Date(goal.targetDate).getTime() - Date.now()) /
                (1000 * 60 * 60 * 24),
            ),
          );
          const remaining = Math.max(0, goal.targetAmount - goal.currentAmount);
          const progress = Math.min(
            100,
            Math.round((goal.currentAmount / goal.targetAmount) * 100),
          );

          const title =
            daysLeft === 0
              ? `${goal.name} target date is today`
              : `${goal.name} target date is in ${daysLeft} day${daysLeft === 1 ? "" : "s"}`;

          const body =
            remaining === 0
              ? `You've hit your ${fmt(goal.targetAmount)} target — nice work! 🎉`
              : `You're ${progress}% there with ${fmt(remaining)} still to go. Make your final push count.`;

          await db.insert(notifications).values({
            userId,
            type: "goal_deadline",
            title,
            body,
            targetScreen: "/goals/" + goal.id,
            targetId: goal.id,
          });
          pushToUser(userId, title, body, `/goals/${goal.id}`);
        }
      }

      // ── 3. Weekly confirmation nudge ────────────────────────────────────
      // Fires for goals that:
      //   a) were created more than 7 days ago (there's a past week to confirm)
      //   b) have no progress entry in the last 7 days
      //   c) have no existing undismissed weekly_confirm notification
      if (!disabled.has("weekly_summary")) {
        const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
        const sevenDaysAgoStr = sevenDaysAgo.toISOString().split("T")[0]!;

        // Goals old enough to have a past week
        const eligibleGoals = userGoals.filter(
          (g) => new Date(g.createdAt) < sevenDaysAgo,
        );

        if (eligibleGoals.length > 0) {
          const eligibleIds = eligibleGoals.map((g) => g.id);

          // Most recent progress entry per goal (confirmedAt > 7 days ago means up-to-date)
          const recentEntries = await db
            .select({
              goalId: goalProgressEntries.goalId,
              confirmedAt: goalProgressEntries.confirmedAt,
            })
            .from(goalProgressEntries)
            .where(
              and(
                eq(goalProgressEntries.userId, userId),
                inArray(goalProgressEntries.goalId, eligibleIds),
              ),
            );

          // Map goalId → most recent confirmedAt
          const lastConfirmed = new Map<string, Date>();
          for (const entry of recentEntries) {
            const existing = lastConfirmed.get(entry.goalId);
            if (!existing || entry.confirmedAt > existing) {
              lastConfirmed.set(entry.goalId, entry.confirmedAt);
            }
          }

          // Goals needing a nudge: last confirmation was >7 days ago (or never confirmed)
          const staleGoals = eligibleGoals.filter((g) => {
            const last = lastConfirmed.get(g.id);
            if (!last) return true; // never confirmed
            return last < sevenDaysAgo;
          });

          for (const goal of staleGoals) {
            if (hasNotif("weekly_confirm", goal.id)) continue;

            const lastDate = lastConfirmed.get(goal.id);
            const daysSince = lastDate
              ? Math.round(
                  (Date.now() - lastDate.getTime()) / (1000 * 60 * 60 * 24),
                )
              : null;

            const title = `Log your progress on ${goal.name}`;
            const body = lastDate
              ? `It's been ${daysSince} day${daysSince === 1 ? "" : "s"} since your last check-in. Tap to confirm how much you've saved this week.`
              : `You haven't logged any progress yet. Tap to confirm your first week and keep your roadmap up to date.`;

            await db.insert(notifications).values({
              userId,
              type: "weekly_confirm",
              title,
              body,
              targetScreen: "/goals/" + goal.id,
              targetId: goal.id,
            });
            pushToUser(userId, title, body, `/goals/${goal.id}`);
          }
        }
      }
    }

    // ── Return all non-dismissed notifications (newest first) ──────────────
    const rows = await db
      .select()
      .from(notifications)
      .where(
        and(
          eq(notifications.userId, userId),
          eq(notifications.isDismissed, false),
        ),
      )
      .orderBy(notifications.createdAt);
    res.json(rows.reverse());
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
    if (!notification) {
      res.status(404).json({ message: "Notification not found" });
      return;
    }
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
    if (!notification) {
      res.status(404).json({ message: "Notification not found" });
      return;
    }
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
      .where(
        and(
          eq(notifications.userId, userId),
          eq(notifications.isDismissed, false),
        ),
      );
    res.status(204).send();
  } catch {
    res.status(500).json({ message: "Failed to clear notifications" });
  }
});

export default router;
