import { Router } from "express";
import { eq, and, inArray, gte } from "drizzle-orm";
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
  db.select({ token: pushTokens.token, bundleId: pushTokens.bundleId })
    .from(pushTokens)
    .where(eq(pushTokens.userId, userId))
    .then((rows) => {
      if (rows.length > 0) {
        sendPushToMany(
          rows.map((r) => ({ token: r.token, bundleId: r.bundleId })),
          { title, body, data: { targetScreen } },
        ).catch(() => {});
      }
    })
    .catch(() => {});
}

/** Return the set of preference types the user has explicitly disabled.
 *  Missing rows → default enabled. */
async function disabledPrefs(
  userId: string,
  types: string[],
): Promise<Set<string>> {
  const rows = await db
    .select()
    .from(notificationPreferences)
    .where(
      and(
        eq(notificationPreferences.userId, userId),
        inArray(notificationPreferences.type, types),
      ),
    );
  return new Set(rows.filter((r) => !r.enabled).map((r) => r.type));
}

// ── GET /api/notifications ─────────────────────────────────────────────────────
// Returns all non-dismissed notifications and auto-generates four kinds:
//   1. Behind-goal alerts              (pref: goal_reminders)
//   2. 7-day deadline warnings         (pref: goal_updates)
//   3. Weekly confirmation nudge       (pref: weekly_summary)
//   4. Day-before contribution payment (pref: payment_reminders)
router.get("/notifications", requireAuth, async (req, res) => {
  const userId = res.locals.userId as string;
  try {
    const disabled = await disabledPrefs(userId, [
      "goal_reminders",
      "goal_updates",
      "weekly_summary",
      "payment_reminders",
    ]);

    // ── Load active goals (shared by all four generators) ──────────────────
    const userGoals = await db
      .select()
      .from(goals)
      .where(and(eq(goals.userId, userId), eq(goals.status, "active")));

    if (userGoals.length > 0) {
      // Fetch all undismissed notifications at once for dedup checks
      const existingNotifs = await db
        .select({ type: notifications.type, targetId: notifications.targetId })
        .from(notifications)
        .where(
          and(
            eq(notifications.userId, userId),
            eq(notifications.isDismissed, false),
          ),
        );

      // O(1) dedup: "type::targetId"
      const notifKeys = new Set(
        existingNotifs.map((n) => `${n.type}::${n.targetId ?? ""}`),
      );
      const hasNotif = (type: string, targetId: string) =>
        notifKeys.has(`${type}::${targetId}`);

      // ── 1. Behind-goal alerts ──────────────────────────────────────────────
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

      // ── 2. 7-day deadline warnings ─────────────────────────────────────────
      if (!disabled.has("goal_updates")) {
        const todayStr = new Date().toISOString().split("T")[0]!;
        const in7DaysStr = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
          .toISOString()
          .split("T")[0]!;

        for (const goal of userGoals) {
          if (!goal.targetDate) continue;
          if (goal.targetDate < todayStr || goal.targetDate > in7DaysStr)
            continue;
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

      // ── 3. Weekly confirmation nudge ───────────────────────────────────────
      if (!disabled.has("weekly_summary")) {
        const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

        const eligibleGoals = userGoals.filter(
          (g) => new Date(g.createdAt) < sevenDaysAgo,
        );

        if (eligibleGoals.length > 0) {
          const eligibleIds = eligibleGoals.map((g) => g.id);

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

          const lastConfirmed = new Map<string, Date>();
          for (const entry of recentEntries) {
            const existing = lastConfirmed.get(entry.goalId);
            if (!existing || entry.confirmedAt > existing) {
              lastConfirmed.set(entry.goalId, entry.confirmedAt);
            }
          }

          const staleGoals = eligibleGoals.filter((g) => {
            const last = lastConfirmed.get(g.id);
            if (!last) return true;
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

      // ── 4. Day-before contribution payment reminder ────────────────────────
      // Supports two frequencies:
      //
      // MONTHLY (paymentFrequency = "monthly"):
      //   Payment due day = day-of-month goal was created (capped at 28).
      //   Reminder fires the day before. Dedup: one notif per goal per
      //   calendar month.
      //
      // WEEKLY (paymentFrequency = "weekly"):
      //   Payment due day-of-week = day-of-week goal was created (0=Sun…6=Sat).
      //   Reminder fires the day before each week. Dedup: one notif per goal
      //   per calendar week (Mon–Sun ISO week).
      if (!disabled.has("payment_reminders")) {
        const now = new Date();
        const todayDow = now.getDay(); // 0=Sun…6=Sat
        const tomorrowDate = new Date(now);
        tomorrowDate.setDate(now.getDate() + 1);
        const tomorrowDow = tomorrowDate.getDay();
        const tomorrowDayOfMonth = tomorrowDate.getDate();

        // ── Monthly dedup: already sent this calendar month ──
        const monthStart = new Date(
          Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1),
        );
        const sentThisMonth = await db
          .select({ targetId: notifications.targetId })
          .from(notifications)
          .where(
            and(
              eq(notifications.userId, userId),
              eq(notifications.type, "goal_payment"),
              gte(notifications.createdAt, monthStart),
            ),
          );
        const alreadySentMonthIds = new Set(
          sentThisMonth.map((r) => r.targetId ?? ""),
        );

        // ── Weekly dedup: already sent this ISO week (Mon–Sun) ──
        const daysSinceMonday = (todayDow + 6) % 7; // Mon=0…Sun=6
        const weekStart = new Date(now);
        weekStart.setDate(now.getDate() - daysSinceMonday);
        weekStart.setHours(0, 0, 0, 0);
        const sentThisWeek = await db
          .select({ targetId: notifications.targetId })
          .from(notifications)
          .where(
            and(
              eq(notifications.userId, userId),
              eq(notifications.type, "goal_payment"),
              gte(notifications.createdAt, weekStart),
            ),
          );
        const alreadySentWeekIds = new Set(
          sentThisWeek.map((r) => r.targetId ?? ""),
        );

        for (const goal of userGoals) {
          if (goal.monthlyContribution <= 0) continue;

          const isWeekly = (goal as { paymentFrequency?: string }).paymentFrequency === "weekly";

          if (isWeekly) {
            // Weekly: fire the day before the goal's payment day-of-week
            if (alreadySentWeekIds.has(goal.id)) continue;
            const paymentDow = new Date(goal.createdAt).getDay(); // 0=Sun…6=Sat
            if (tomorrowDow !== paymentDow) continue;

            const weeklyAmt = Math.round(goal.monthlyContribution * 12 / 52);
            const title = `${goal.name} weekly contribution due tomorrow`;
            const body = `Your ${fmt(weeklyAmt)} weekly contribution is due tomorrow. Tap to review and confirm your progress.`;

            await db.insert(notifications).values({
              userId,
              type: "goal_payment",
              title,
              body,
              targetScreen: "/goals/" + goal.id,
              targetId: goal.id,
            });
            pushToUser(userId, title, body, `/goals/${goal.id}`);
          } else {
            // Monthly: fire the day before the goal's payment day-of-month
            if (alreadySentMonthIds.has(goal.id)) continue;
            const paymentDueDay = Math.min(new Date(goal.createdAt).getDate(), 28);
            if (tomorrowDayOfMonth !== paymentDueDay) continue;

            const title = `${goal.name} contribution due tomorrow`;
            const body = `Your ${fmt(goal.monthlyContribution)} monthly contribution is due tomorrow. Tap to review your goal and confirm progress.`;

            await db.insert(notifications).values({
              userId,
              type: "goal_payment",
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
