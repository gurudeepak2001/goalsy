import { Router } from "express";

const router = Router();

/**
 * GET /api/config
 * Returns runtime configuration the native iOS/Android client needs before
 * it can initialise Clerk.  No authentication required — `clerkPublishableKey`
 * is a PUBLIC key (analogous to a pk_ value in a .env file) and safe to
 * expose.  In development NODE_ENV the key is pk_test_…; in production it is
 * pk_live_… — the native build always gets the correct one for the environment
 * it is talking to.
 */
router.get("/config", (_req, res) => {
  res.json({
    clerkPublishableKey: process.env.CLERK_PUBLISHABLE_KEY ?? "",
  });
});

export default router;
