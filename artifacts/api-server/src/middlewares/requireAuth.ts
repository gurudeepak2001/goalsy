import { getAuth } from "@clerk/express";
import type { RequestHandler } from "express";

/**
 * Express middleware that enforces a signed-in Clerk session.
 * Attaches `res.locals.userId` for downstream handlers.
 */
export const requireAuth: RequestHandler = (req, res, next) => {
  const { userId } = getAuth(req);
  if (!userId) {
    res.status(401).json({ message: "Unauthorized" });
    return;
  }
  res.locals.userId = userId;
  next();
};
