import { Router } from "express";
import { eq } from "drizzle-orm";
import { db, briefings } from "@workspace/db";
import { requireAuth } from "../middlewares/requireAuth";

const router = Router();

// GET /api/briefings
router.get("/briefings", requireAuth, async (req, res) => {
  const userId = res.locals.userId as string;
  try {
    const rows = await db
      .select()
      .from(briefings)
      .where(eq(briefings.userId, userId))
      .orderBy(briefings.scheduledDate);
    res.json(rows);
  } catch {
    res.status(500).json({ message: "Failed to fetch briefings" });
  }
});

export default router;
