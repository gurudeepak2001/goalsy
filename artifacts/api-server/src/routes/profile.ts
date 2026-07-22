import { Router } from "express";
import { eq } from "drizzle-orm";
import { db, userProfiles } from "@workspace/db";
import { requireAuth } from "../middlewares/requireAuth";

const router = Router();

// GET /api/profile — return profile (auto-creates a blank one on first call)
router.get("/profile", requireAuth, async (req, res) => {
  const userId = res.locals.userId as string;
  try {
    let [profile] = await db
      .select()
      .from(userProfiles)
      .where(eq(userProfiles.userId, userId));

    if (!profile) {
      [profile] = await db
        .insert(userProfiles)
        .values({ userId })
        .returning();
    }

    res.json(profile);
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch profile" });
  }
});

// PUT /api/profile — upsert profile fields
router.put("/profile", requireAuth, async (req, res) => {
  const userId = res.locals.userId as string;
  const { displayName, avatarKey, onboardingComplete } = req.body as {
    displayName?: string | null;
    avatarKey?: string | null;
    onboardingComplete?: boolean;
  };

  try {
    const [profile] = await db
      .insert(userProfiles)
      .values({ userId, displayName, avatarKey, onboardingComplete })
      .onConflictDoUpdate({
        target: userProfiles.userId,
        set: {
          ...(displayName !== undefined && { displayName }),
          ...(avatarKey !== undefined && { avatarKey }),
          ...(onboardingComplete !== undefined && { onboardingComplete }),
          updatedAt: new Date(),
        },
      })
      .returning();

    res.json(profile);
  } catch (err) {
    res.status(500).json({ message: "Failed to update profile" });
  }
});

export default router;
