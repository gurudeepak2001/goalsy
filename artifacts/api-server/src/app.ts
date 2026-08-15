import express, { type Express } from "express";
import cors from "cors";
import pinoHttp from "pino-http";
import { clerkMiddleware } from "@clerk/express";
import type { IncomingHttpHeaders } from "http";
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

// Use the baked-in CLERK_PUBLISHABLE_KEY directly.
// Previously this derived a key from the request host via publishableKeyFromHost,
// which turned goalsy-finance-ui.replit.app into a pk_live_ key whose JWKS lives
// behind Replit's mTLS proxy (self-signed cert → JWKS fetch fails → 401 on every
// request from the Capacitor app).  Using the env var directly lets Clerk fetch
// JWKS from the real Clerk accounts domain (trusted cert).
app.use(clerkMiddleware());

app.use("/api", router);

export default app;
