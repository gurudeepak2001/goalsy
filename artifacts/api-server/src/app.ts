import express, { type Express } from "express";
import cors from "cors";
import pinoHttp from "pino-http";
import { clerkMiddleware } from "@clerk/express";
import router from "./routes";
import { logger } from "./lib/logger";

const app: Express = express();

// Disable ETags and cache so the browser never replays stale JSON after a data change
app.set("etag", false);
app.use((_req, res, next) => {
  res.setHeader("Cache-Control", "no-store");
  next();
});

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return {
          id: req.id,
          method: req.method,
          url: req.url?.split("?")[0],
        };
      },
      res(res) {
        return {
          statusCode: res.statusCode,
        };
      },
    },
  }),
);
app.use(cors({ credentials: true, origin: true }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Use the dev-instance publishable key explicitly so Clerk fetches JWKS from
// bursting-hedgehog-64.clerk.accounts.dev (trusted cert) instead of the
// Replit-proxy FAPI (self-signed cert → JWKS fetch fails → 401).
// VITE_CLERK_PUBLISHABLE_KEY is the dev pk_test_ key baked into the frontend
// build; it is also available as a server-side env var in the Replit environment.
// Fall back to CLERK_PUBLISHABLE_KEY if the VITE_ var is absent.
app.use(clerkMiddleware({
  publishableKey:
    process.env.VITE_CLERK_PUBLISHABLE_KEY ?? process.env.CLERK_PUBLISHABLE_KEY,
}));

app.use("/api", router);

export default app;
