import { Router } from "express";
import { eq, and } from "drizzle-orm";
import { db, expenses } from "@workspace/db";
import { requireAuth } from "../middlewares/requireAuth";

const router = Router();

// GET /api/expenses?month=YYYY-MM
router.get("/expenses", requireAuth, async (req, res) => {
  const userId = res.locals.userId as string;
  const month = req.query["month"] as string | undefined; // e.g. "2026-08"

  try {
    let rows = await db
      .select()
      .from(expenses)
      .where(eq(expenses.userId, userId))
      .orderBy(expenses.createdAt);

    if (month) {
      // expenseDate is stored as YYYY-MM-DD — filter by year-month prefix
      rows = rows.filter((r) => r.expenseDate.startsWith(month));
    }

    res.json(rows);
  } catch {
    res.status(500).json({ message: "Failed to fetch expenses" });
  }
});

// POST /api/expenses
router.post("/expenses", requireAuth, async (req, res) => {
  const userId = res.locals.userId as string;
  const { category, amount, frequency, expenseDate, note } = req.body as {
    category: string;
    amount: number;
    frequency?: string;
    expenseDate: string;
    note?: string | null;
  };

  if (!category || amount == null || !expenseDate) {
    res.status(400).json({ message: "category, amount, and expenseDate are required" });
    return;
  }

  try {
    const [row] = await db
      .insert(expenses)
      .values({
        userId,
        category,
        amount,
        frequency: frequency ?? "monthly",
        expenseDate,
        note: note ?? null,
      })
      .returning();
    res.status(201).json(row);
  } catch {
    res.status(500).json({ message: "Failed to create expense" });
  }
});

// DELETE /api/expenses/:id
router.delete("/expenses/:id", requireAuth, async (req, res) => {
  const userId = res.locals.userId as string;
  const id = req.params.id as string;

  try {
    const deleted = await db
      .delete(expenses)
      .where(and(eq(expenses.id, id), eq(expenses.userId, userId)))
      .returning();
    if (!deleted.length) {
      res.status(404).json({ message: "Expense not found" });
      return;
    }
    res.status(204).send();
  } catch {
    res.status(500).json({ message: "Failed to delete expense" });
  }
});

export default router;
