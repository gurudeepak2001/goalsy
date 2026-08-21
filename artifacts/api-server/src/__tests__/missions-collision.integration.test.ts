import { randomUUID } from "node:crypto";
import { and, eq } from "drizzle-orm";
import request from "supertest";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { achievementAwards, dailyMissions, db } from "@workspace/db";

const TEST_USER_ID = `usr_mission_collision_${randomUUID()}`;
const MISSION_STREAK_ACHIEVEMENT_ID = "mission-streak-7-day";

// Keep this test focused on the endpoint transition and database behavior,
// while avoiding a network call to Clerk's JWKS endpoint.
vi.mock("../middlewares/verifyClerkJwt.js", () => ({
  verifyClerkJwt: (req: any, res: any, next: any) => {
    const auth = (req.headers.authorization as string) ?? "";
    if (auth.startsWith("Bearer ") && auth.length > 7) {
      res.locals.userId = TEST_USER_ID;
      next();
    } else {
      res.status(401).json({ message: "Unauthorized" });
    }
  },
}));

import app from "../app.js";

function dateOffset(dateString: string, offset: number): string {
  const date = new Date(`${dateString}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + offset);
  return date.toISOString().slice(0, 10);
}

function todayDateString(): string {
  return new Date().toISOString().slice(0, 10);
}

describe("mission terminal actions under concurrent requests", () => {
  beforeAll(async () => {
    await db.delete(achievementAwards).where(eq(achievementAwards.userId, TEST_USER_ID));
    await db.delete(dailyMissions).where(eq(dailyMissions.userId, TEST_USER_ID));
  });

  afterAll(async () => {
    await db.delete(achievementAwards).where(eq(achievementAwards.userId, TEST_USER_ID));
    await db.delete(dailyMissions).where(eq(dailyMissions.userId, TEST_USER_ID));
  });

  it("persists one winner, never awards a streak to a skip winner, and keeps same-action retries idempotent", async () => {
    const today = todayDateString();
    const priorMissions = Array.from({ length: 6 }, (_, index) => {
      const missionDate = dateOffset(today, index - 6);
      return {
        userId: TEST_USER_ID,
        missionDate,
        title: `Completed mission ${index + 1}`,
        description: "Integration test mission",
        category: "review",
        status: "completed",
        completedAt: new Date(`${missionDate}T09:00:00.000Z`),
      };
    });

    await db.insert(dailyMissions).values(priorMissions);
    const [pendingMission] = await db
      .insert(dailyMissions)
      .values({
        userId: TEST_USER_ID,
        missionDate: today,
        title: "Today's collision mission",
        description: "Integration test mission",
        category: "review",
        status: "pending",
      })
      .returning({ id: dailyMissions.id });

    const auth = { Authorization: "Bearer integration-test-token" };
    const [completeResponse, skipResponse] = await Promise.all([
      request(app)
        .post(`/api/missions/${pendingMission.id}/complete`)
        .set(auth),
      request(app)
        .post(`/api/missions/${pendingMission.id}/skip`)
        .set(auth)
        .send({ reason: "Integration test collision" }),
    ]);

    const [persistedMission] = await db
      .select()
      .from(dailyMissions)
      .where(and(
        eq(dailyMissions.id, pendingMission.id),
        eq(dailyMissions.userId, TEST_USER_ID),
      ));
    const awards = await db
      .select()
      .from(achievementAwards)
      .where(and(
        eq(achievementAwards.userId, TEST_USER_ID),
        eq(achievementAwards.achievementId, MISSION_STREAK_ACHIEVEMENT_ID),
      ));

    expect(["completed", "skipped"]).toContain(persistedMission.status);
    expect(skipResponse.status).toBe(200);
    expect(completeResponse.status).toBe(
      persistedMission.status === "completed" ? 200 : 409,
    );

    if (persistedMission.status === "skipped") {
      expect(skipResponse.body.status).toBe("skipped");
      expect(awards).toHaveLength(0);
      const [retryOne, retryTwo] = await Promise.all([
        request(app)
          .post(`/api/missions/${pendingMission.id}/skip`)
          .set(auth)
          .send({ reason: "Repeated integration test skip" }),
        request(app)
          .post(`/api/missions/${pendingMission.id}/skip`)
          .set(auth)
          .send({ reason: "Repeated integration test skip" }),
      ]);
      expect(retryOne.status).toBe(200);
      expect(retryTwo.status).toBe(200);
      expect(retryOne.body.status).toBe("skipped");
      expect(retryTwo.body.status).toBe("skipped");
    } else {
      expect(completeResponse.body.status).toBe("completed");
      expect(skipResponse.body.status).toBe("completed");
      expect(awards).toHaveLength(1);
      const [retryOne, retryTwo] = await Promise.all([
        request(app)
          .post(`/api/missions/${pendingMission.id}/complete`)
          .set(auth),
        request(app)
          .post(`/api/missions/${pendingMission.id}/complete`)
          .set(auth),
      ]);
      expect(retryOne.status).toBe(200);
      expect(retryTwo.status).toBe(200);
      expect(retryOne.body.status).toBe("completed");
      expect(retryTwo.body.status).toBe("completed");
    }

    const [missionAfterRetries] = await db
      .select()
      .from(dailyMissions)
      .where(eq(dailyMissions.id, pendingMission.id));
    const awardsAfterRetries = await db
      .select()
      .from(achievementAwards)
      .where(and(
        eq(achievementAwards.userId, TEST_USER_ID),
        eq(achievementAwards.achievementId, MISSION_STREAK_ACHIEVEMENT_ID),
      ));

    expect(missionAfterRetries.status).toBe(persistedMission.status);
    expect(awardsAfterRetries).toHaveLength(
      persistedMission.status === "skipped" ? 0 : 1,
    );
    if (persistedMission.status === "skipped") {
      expect(missionAfterRetries.skipReason).toBe("Integration test collision");
    }
  });
});