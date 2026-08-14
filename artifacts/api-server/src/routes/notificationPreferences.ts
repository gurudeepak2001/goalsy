import { Router } from "express";
import { eq, and } from "drizzle-orm";
import { db, notificationPreferences } from "@workspace/db";
import { requireAuth } from "../middlewares/requireAuth";

const DEFAULT_TYPES = [
  "mission_reminders",
  "goal_updates",
  "goal_reminders",
  "market_alerts",
  "weekly_summary",
  "ai_insights",
];

const router = Router();

// GET /api/notification-preferences
// Returns all 5 preference types, seeding defaults on first call
router.get("/notification-preferences", requireAuth, async (req, res) => {
  const userId = res.locals.userId as string;
  try {
    let prefs = await db
      .select()
      .from(notificationPreferences)
      .where(eq(notificationPreferences.userId, userId));

    // Seed any missing types (handles both first-time users and new types added later)
    const existingTypes = new Set(prefs.map((p) => p.type));
    const missing = DEFAULT_TYPES.filter((t) => !existingTypes.has(t));
    if (missing.length > 0) {
      const inserted = await db
        .insert(notificationPreferences)
        .values(missing.map((type) => ({ userId, type, enabled: true })))
        .onConflictDoNothing()
        .returning();
      prefs = [...prefs, ...inserted];
    }

    // Return in consistent DEFAULT_TYPES order (unknown types appended at end)
    const order = Object.fromEntries(DEFAULT_TYPES.map((t, i) => [t, i]));
    prefs.sort((a, b) => (order[a.type] ?? 999) - (order[b.type] ?? 999));

    res.json(prefs);
  } catch {
    res.status(500).json({ message: "Failed to fetch notification preferences" });
  }
});

// PUT /api/notification-preferences/:type
router.put("/notification-preferences/:type", requireAuth, async (req, res) => {
  const userId = res.locals.userId as string;
  const type = req.params.type as string;
  const { enabled } = req.body as { enabled: boolean };

  if (typeof enabled !== "boolean") {
    res.status(400).json({ message: "enabled (boolean) is required" });
    return;
  }

  try {
    // Upsert — create the row if the user never had it seeded
    const [pref] = await db
      .insert(notificationPreferences)
      .values({ userId, type, enabled })
      .onConflictDoUpdate({
        target: [notificationPreferences.userId, notificationPreferences.type],
        set: { enabled, updatedAt: new Date() },
      })
      .returning();

    res.json(pref);
  } catch {
    res.status(500).json({ message: "Failed to update notification preference" });
  }
});

export default router;
