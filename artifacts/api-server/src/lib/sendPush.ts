/**
 * sendPush — lightweight APNs HTTP/2 push dispatch.
 *
 * Uses Node's built-in `http2` module + `jose` (already a project dependency)
 * to sign APNs provider JWTs (ES256) and deliver pushes over a persistent
 * HTTP/2 session.  No additional packages needed.
 *
 * Required environment variables (set via Replit Secrets):
 *   APNS_KEY_P8    — contents of the .p8 file downloaded from developer.apple.com,
 *                    including the -----BEGIN PRIVATE KEY----- / END lines.
 *   APNS_KEY_ID    — 10-character Key ID shown in Apple Developer → Certificates → Keys
 *   APNS_TEAM_ID   — 10-character Team ID from Apple Developer → Account → Membership
 *
 * Bundle ID is read from APNS_BUNDLE_ID (defaults to 'com.myui.goalsyexecutive').
 *
 * ⚠️  REQUIRES USER SETUP (cannot be automated):
 *   1. In developer.apple.com → Certificates, Identifiers & Profiles → Keys
 *      create a new key with "Apple Push Notifications service (APNs)" enabled.
 *   2. Download the .p8 file — it can only be downloaded once.
 *   3. Add APNS_KEY_P8, APNS_KEY_ID, APNS_TEAM_ID to Replit Secrets.
 *   4. In Xcode → Signing & Capabilities → add "Push Notifications" capability.
 *   5. Test on a real device (simulators cannot receive APNs pushes).
 *
 * When credentials are absent the function logs a warning and returns without
 * throwing — goal notification logic degrades gracefully to in-app-only.
 */

import * as http2 from "node:http2";
import { SignJWT, importPKCS8 } from "jose";
import { logger } from "./logger";

const APNS_SANDBOX_HOST = "api.sandbox.push.apple.com";
const APNS_PROD_HOST = "api.push.apple.com";

// Use sandbox in development, production otherwise.
const apnsHost =
  process.env["NODE_ENV"] === "production" ? APNS_PROD_HOST : APNS_SANDBOX_HOST;

const BUNDLE_ID =
  process.env["APNS_BUNDLE_ID"] ?? "com.myui.goalsyexecutive";

// ── Provider JWT cache ────────────────────────────────────────────────────────
// APNs provider JWTs are valid for 1 hour; regenerate every 50 minutes.
let cachedProviderToken: string | null = null;
let providerTokenIat = 0;

async function getProviderToken(): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  if (cachedProviderToken && now - providerTokenIat < 50 * 60) {
    return cachedProviderToken;
  }

  const keyP8 = process.env["APNS_KEY_P8"];
  const keyId = process.env["APNS_KEY_ID"];
  const teamId = process.env["APNS_TEAM_ID"];

  if (!keyP8 || !keyId || !teamId) {
    throw new Error(
      "APNs credentials missing — set APNS_KEY_P8, APNS_KEY_ID, APNS_TEAM_ID in Replit Secrets",
    );
  }

  const privateKey = await importPKCS8(keyP8, "ES256");
  const token = await new SignJWT({})
    .setProtectedHeader({ alg: "ES256", kid: keyId })
    .setIssuer(teamId)
    .setIssuedAt()
    .sign(privateKey);

  cachedProviderToken = token;
  providerTokenIat = now;
  return token;
}

// ── HTTP/2 session pool ───────────────────────────────────────────────────────
// Reuse a single HTTP/2 session per process lifetime; reconnect on error.
let h2Session: http2.ClientHttp2Session | null = null;

function getSession(): http2.ClientHttp2Session {
  if (h2Session && !h2Session.destroyed && !h2Session.closed) {
    return h2Session;
  }
  h2Session = http2.connect(`https://${apnsHost}`);
  h2Session.on("error", (err) => {
    logger.warn({ err }, "[sendPush] HTTP/2 session error — will reconnect");
    h2Session = null;
  });
  h2Session.on("close", () => {
    h2Session = null;
  });
  return h2Session;
}

// ── Public API ────────────────────────────────────────────────────────────────
export interface PushPayload {
  title: string;
  body: string;
  /** Extra key-value pairs forwarded in notification.data for deep-linking */
  data?: Record<string, string>;
}

/**
 * Send a push notification to a single APNs device token.
 * Resolves silently if credentials are not yet configured.
 */
export async function sendPush(
  deviceToken: string,
  payload: PushPayload,
): Promise<void> {
  // Graceful no-op when credentials are absent
  const keyP8 = process.env["APNS_KEY_P8"];
  const keyId = process.env["APNS_KEY_ID"];
  const teamId = process.env["APNS_TEAM_ID"];
  if (!keyP8 || !keyId || !teamId) {
    logger.warn(
      "[sendPush] APNs credentials not configured — push skipped. " +
        "Add APNS_KEY_P8, APNS_KEY_ID, APNS_TEAM_ID to Replit Secrets to enable push.",
    );
    return;
  }

  let providerToken: string;
  try {
    providerToken = await getProviderToken();
  } catch (err) {
    logger.error({ err }, "[sendPush] Failed to generate provider JWT");
    return;
  }

  const apnsPayload = JSON.stringify({
    aps: {
      alert: { title: payload.title, body: payload.body },
      sound: "default",
      badge: 1,
    },
    ...(payload.data ?? {}),
  });

  return new Promise((resolve) => {
    try {
      const session = getSession();
      const req = session.request({
        ":method": "POST",
        ":path": `/3/device/${deviceToken}`,
        "apns-topic": BUNDLE_ID,
        "apns-push-type": "alert",
        "apns-priority": "10",
        authorization: `bearer ${providerToken}`,
        "content-type": "application/json",
      });

      req.write(apnsPayload);
      req.end();

      req.on("response", (headers) => {
        const status = headers[":status"] as number | undefined;
        if (status === 200) {
          logger.info(
            { tokenPrefix: deviceToken.slice(0, 8) },
            "[sendPush] Push delivered",
          );
        } else {
          // Collect body for error detail
          let body = "";
          req.on("data", (chunk: Buffer) => { body += chunk.toString(); });
          req.on("end", () => {
            logger.warn(
              { status, body, tokenPrefix: deviceToken.slice(0, 8) },
              "[sendPush] APNs rejected push",
            );
          });
        }
        resolve();
      });

      req.on("error", (err) => {
        logger.error({ err }, "[sendPush] Request error");
        resolve();
      });
    } catch (err) {
      logger.error({ err }, "[sendPush] Unexpected error sending push");
      resolve();
    }
  });
}

/**
 * Fan-out: send the same notification to multiple device tokens.
 * Failures are logged but do not throw.
 */
export async function sendPushToMany(
  deviceTokens: string[],
  payload: PushPayload,
): Promise<void> {
  if (deviceTokens.length === 0) return;
  await Promise.allSettled(deviceTokens.map((t) => sendPush(t, payload)));
}
