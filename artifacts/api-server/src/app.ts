import express, { type Express } from "express";
import cors from "cors";
import pinoHttp from "pino-http";
import router from "./routes";
import { logger } from "./lib/logger";

const app: Express = express();

// ── Startup health probe ──────────────────────────────────────────────────────
// Registered before all other middleware so the deployment sidecar's readiness
// check succeeds the instant the server binds to its port.  The sidecar probes
// the service path prefix GET /api (not the deeper /api/healthz path configured
// in artifact.toml) so we need a handler here that returns 200 immediately.
app.get(["/api", "/api/healthz"], (_req, res) => {
  res.json({ status: "ok" });
});

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


app.use("/api", router);

export default app;
