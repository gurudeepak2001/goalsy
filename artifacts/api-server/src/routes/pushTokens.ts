/**
 * Push token routes.
 *
 * POST /api/push-tokens          — register / refresh a device token
 * DELETE /api/push-tokens/:token — deregister (e.g. on sign-out)
 */
import { Router } from "express";
import { eq, and } from "drizzle-orm";
import { db, pushTokens } from "@workspace/db";
import { requireAuth } from "../middlewares/requireAuth";

const router = Router();

// POST /api/push-tokens
router.post("/push-tokens", requireAuth, async (req, res) => {
  const userId = res.locals.userId as string;
  const { token, platform, bundleId } = req.body as {
    token?: string;
    platform?: string;
    bundleId?: string;
  };

  if (!token || typeof token !== "string" || token.length < 8) {
    res.status(400).json({ message: "token (string) is required" });
    return;
  }
  if (!platform || !["ios", "android"].includes(platform)) {
    res.status(400).json({ message: "platform must be 'ios' or 'android'" });
    return;
  }

  try {
    // Upsert: update timestamp (and bundleId if provided) if token already
    // registered for this user.
    const [row] = await db
      .insert(pushTokens)
      .values({
        userId,
        token,
        platform,
        bundleId: bundleId ?? null,
      })
      .onConflictDoUpdate({
        target: [pushTokens.userId, pushTokens.token],
        set: {
          updatedAt: new Date(),
          ...(bundleId !== undefined ? { bundleId } : {}),
        },
      })
      .returning();

    res.json(row);
  } catch {
    res.status(500).json({ message: "Failed to store push token" });
  }
});

// DELETE /api/push-tokens/:token
router.delete("/push-tokens/:token", requireAuth, async (req, res) => {
  const userId = res.locals.userId as string;
  const token = decodeURIComponent(String(req.params.token));

  try {
    await db
      .delete(pushTokens)
      .where(and(eq(pushTokens.userId, userId), eq(pushTokens.token, token)));
    res.json({ ok: true });
  } catch {
    res.status(500).json({ message: "Failed to remove push token" });
  }
});

export default router;
