import express, { type Express } from "express";
import cors from "cors";
import pinoHttp from "pino-http";
import { verifyClerkJwt } from "./middlewares/verifyClerkJwt";
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

// Verify Clerk JWTs via JWKS — no CLERK_SECRET_KEY needed.
// verifyClerkJwt derives the JWKS URL from VITE_CLERK_PUBLISHABLE_KEY,
// verifies the Bearer token signature + expiry, and sets res.locals.userId.
app.use(verifyClerkJwt);

app.use("/api", router);

export default app;
