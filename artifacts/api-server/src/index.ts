import app from "./app";
import { logger } from "./lib/logger";

const rawPort = process.env["PORT"];

if (!rawPort) {
  throw new Error(
    "PORT environment variable is required but was not provided.",
  );
}

const port = Number(rawPort);

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

app.listen(port, (err) => {
  if (err) {
    logger.error({ err }, "Error listening on port");
    process.exit(1);
  }

  logger.info({ port }, "Server listening");

  // APNs credential check — logged once at startup so you can confirm secrets landed.
  const apnsKeyP8  = process.env["APNS_KEY_P8"];
  const apnsKeyId  = process.env["APNS_KEY_ID"];
  const apnsTeamId = process.env["APNS_TEAM_ID"];
  if (apnsKeyP8 && apnsKeyId && apnsTeamId) {
    logger.info(
      { keyId: apnsKeyId, teamId: apnsTeamId, keyLen: apnsKeyP8.length },
      "[APNs] ✅ credentials present — push notifications enabled",
    );
  } else {
    const missing = [
      !apnsKeyP8  && "APNS_KEY_P8",
      !apnsKeyId  && "APNS_KEY_ID",
      !apnsTeamId && "APNS_TEAM_ID",
    ].filter(Boolean);
    logger.warn(
      { missing },
      "[APNs] ⚠️  credentials missing — push notifications disabled (in-app only)",
    );
  }
});
