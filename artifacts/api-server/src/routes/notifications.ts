import { Router } from "express";
import { eq, and } from "drizzle-orm";
import { db, notifications } from "@workspace/db";
import { requireAuth } from "../middlewares/requireAuth";

const router = Router();

// GET /api/notifications — non-dismissed notifications for current user
router.get("/notifications", requireAuth, async (req, res) => {
  const userId = res.locals.userId as string;
  try {
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
