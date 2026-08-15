import type { RequestHandler } from "express";

/**
 * Express middleware that enforces a signed-in Clerk session.
 * Relies on verifyClerkJwt having already run and set res.locals.userId.
 */
export const requireAuth: RequestHandler = (req, res, next) => {
  const userId = res.locals.userId as string | undefined;
  if (!userId) {
    const authHeader = req.headers["authorization"];
    console.error("[requireAuth] 401 —", {
      hasAuthHeader: !!authHeader,
      tokenLen: authHeader ? authHeader.length : 0,
      tokenPrefix: authHeader ? authHeader.slice(0, 30) : null,
    });
    res.status(401).json({ message: "Unauthorized" });
    return;
  }
  next();
};
