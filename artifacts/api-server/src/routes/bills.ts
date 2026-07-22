import { Router } from "express";
import { eq, and } from "drizzle-orm";
import { db, bills } from "@workspace/db";
import { requireAuth } from "../middlewares/requireAuth";

const router = Router();

// GET /api/bills
router.get("/bills", requireAuth, async (req, res) => {
  const userId = res.locals.userId as string;
  try {
    const rows = await db
      .select()
      .from(bills)
      .where(eq(bills.userId, userId))
      .orderBy(bills.dueDate);
    res.json(rows);
  } catch {
    res.status(500).json({ message: "Failed to fetch bills" });
  }
});

// PUT /api/bills/:id/pay
router.put("/bills/:id/pay", requireAuth, async (req, res) => {
  const userId = res.locals.userId as string;
  try {
    const [bill] = await db
      .update(bills)
      .set({ isPaid: true, paidAt: new Date() })
      .where(and(eq(bills.id, req.params.id), eq(bills.userId, userId)))
      .returning();
    if (!bill) { res.status(404).json({ message: "Bill not found" }); return; }
    res.json(bill);
  } catch {
    res.status(500).json({ message: "Failed to mark bill as paid" });
  }
});

export default router;
