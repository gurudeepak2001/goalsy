/**
 * sendPush — lightweight APNs HTTP/2 push dispatch.
 *
 * Supports two independent APNs credential sets so the same server can
 * deliver pushes to devices registered under different bundle IDs (apps
 * owned by different Apple Developer accounts):
 *
 *   MyUI app  (com.myui.goalsyexecutive)
 *     APNS_KEY_P8, APNS_KEY_ID, APNS_TEAM_ID
 *
 *   Enteraxion app  (com.enteraxion.goalsy — value of APNS_BUNDLE_ID)
 *     APNS_KEY_P8_ENTERAXION, APNS_KEY_ID_ENTERAXION, APNS_TEAM_ID_ENTERAXION,
 *     APNS_BUNDLE_ID
 *
 * The credential set is chosen at send time by matching the bundle ID stored
 * alongside each push token.  Tokens with no bundle ID (registered before
 * this column existed) fall back to the MyUI set.
 *
 * Each credential set maintains its own provider JWT cache and HTTP/2 session.
 *
 * ⚠️  REQUIRES USER SETUP (cannot be automated):
 *   1. In developer.apple.com → Certificates, Identifiers & Profiles → Keys
 *      create a key with "Apple Push Notifications service (APNs)" enabled.
 *   2. Download the .p8 file — it can only be downloaded once.
 *   3. Add the relevant secrets to Replit.
 *   4. In Xcode → Signing & Capabilities → add "Push Notifications" capability.
 *   5. Test on a real device (simulators cannot receive APNs pushes).
 *
 * When credentials are absent the function logs a warning and returns without
 * throwing — notification logic degrades gracefully to in-app-only.
 */

import * as http2 from "node:http2";
import { SignJWT, importPKCS8 } from "jose";
import { logger } from "./logger";

const APNS_SANDBOX_HOST = "api.sandbox.push.apple.com";
const APNS_PROD_HOST = "api.push.apple.com";

const apnsHost =
  process.env["NODE_ENV"] === "production" ? APNS_PROD_HOST : APNS_SANDBOX_HOST;

// ── Bundle ID constants ────────────────────────────────────────────────────────

/** Legacy MyUI bundle ID — used as default for tokens with no bundleId recorded. */
const MYUI_BUNDLE_ID = "com.myui.goalsyexecutive";

/**
 * Enteraxion bundle ID — read from APNS_BUNDLE_ID secret (set to
 * com.enteraxion.goalsy).  Any token stored with this bundle ID uses the
 * _ENTERAXION credential set.
 */
const ENTERAXION_BUNDLE_ID =
  process.env["APNS_BUNDLE_ID"] ?? "com.enteraxion.goalsy";

// ── Credential set definition ─────────────────────────────────────────────────

interface CredentialSet {
  /** Human-readable label used only in log messages */
  label: string;
  bundleId: string;
  keyP8Env: string;
  keyIdEnv: string;
  teamIdEnv: string;
  /** Cached provider JWT */
  cachedToken: string | null;
  tokenIat: number;
  /** Persistent HTTP/2 session for this credential set */
  session: http2.ClientHttp2Session | null;
}

const MYUI_CREDS: CredentialSet = {
  label: "MyUI",
  bundleId: MYUI_BUNDLE_ID,
  keyP8Env: "APNS_KEY_P8",
  keyIdEnv: "APNS_KEY_ID",
  teamIdEnv: "APNS_TEAM_ID",
  cachedToken: null,
  tokenIat: 0,
  session: null,
};

const ENTERAXION_CREDS: CredentialSet = {
  label: "Enteraxion",
  bundleId: ENTERAXION_BUNDLE_ID,
  keyP8Env: "APNS_KEY_P8_ENTERAXION",
  keyIdEnv: "APNS_KEY_ID_ENTERAXION",
  teamIdEnv: "APNS_TEAM_ID_ENTERAXION",
  cachedToken: null,
  tokenIat: 0,
  session: null,
};

/**
 * Select the correct credential set for a given bundle ID.
 * Null / missing bundle ID falls back to MyUI (preserves pre-migration
 * behaviour for existing tokens).
 */
function credentialsFor(bundleId: string | null | undefined): CredentialSet {
  if (bundleId === ENTERAXION_BUNDLE_ID) return ENTERAXION_CREDS;
  return MYUI_CREDS;
}

// ── Provider JWT ──────────────────────────────────────────────────────────────
// APNs provider JWTs are valid for 1 hour; regenerate every 50 minutes.

async function getProviderToken(creds: CredentialSet): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  if (creds.cachedToken && now - creds.tokenIat < 50 * 60) {
    return creds.cachedToken;
  }

  const keyP8 = process.env[creds.keyP8Env];
  const keyId = process.env[creds.keyIdEnv];
  const teamId = process.env[creds.teamIdEnv];

  if (!keyP8 || !keyId || !teamId) {
    throw new Error(
      `[sendPush/${creds.label}] APNs credentials missing — set ` +
        `${creds.keyP8Env}, ${creds.keyIdEnv}, ${creds.teamIdEnv} in Replit Secrets`,
    );
  }

  const privateKey = await importPKCS8(keyP8, "ES256");
  const token = await new SignJWT({})
    .setProtectedHeader({ alg: "ES256", kid: keyId })
    .setIssuer(teamId)
    .setIssuedAt()
    .sign(privateKey);

  creds.cachedToken = token;
  creds.tokenIat = now;
  return token;
}

// ── HTTP/2 session pool ───────────────────────────────────────────────────────
// Each credential set keeps its own session so connections are not shared
// across Apple Developer accounts.

function getSession(creds: CredentialSet): http2.ClientHttp2Session {
  if (creds.session && !creds.session.destroyed && !creds.session.closed) {
    return creds.session;
  }
  const session = http2.connect(`https://${apnsHost}`);
  session.on("error", (err) => {
    logger.warn(
      { err, label: creds.label },
      "[sendPush] HTTP/2 session error — will reconnect",
    );
    creds.session = null;
  });
  session.on("close", () => {
    creds.session = null;
  });
  creds.session = session;
  return session;
}

// ── Public API ────────────────────────────────────────────────────────────────

export interface PushPayload {
  title: string;
  body: string;
  /** Extra key-value pairs forwarded in notification.data for deep-linking */
  data?: Record<string, string>;
}

/**
 * A device token paired with the bundle ID it was registered under.
 * bundleId may be null for tokens registered before the column was added —
 * they will use the MyUI credential set.
 */
export interface TokenWithBundle {
  token: string;
  bundleId: string | null;
}

/**
 * Send a push notification to a single APNs device token.
 * bundleId is used to select the correct signing credentials.
 * Resolves silently if the relevant credentials are not configured.
 */
export async function sendPush(
  deviceToken: string,
  bundleId: string | null | undefined,
  payload: PushPayload,
): Promise<void> {
  const creds = credentialsFor(bundleId);

  // Graceful no-op when credentials are absent
  const keyP8 = process.env[creds.keyP8Env];
  const keyId = process.env[creds.keyIdEnv];
  const teamId = process.env[creds.teamIdEnv];
  if (!keyP8 || !keyId || !teamId) {
    logger.warn(
      { label: creds.label },
      `[sendPush] APNs credentials not configured — push skipped. ` +
        `Add ${creds.keyP8Env}, ${creds.keyIdEnv}, ${creds.teamIdEnv} to Replit Secrets to enable push.`,
    );
    return;
  }

  let providerToken: string;
  try {
    providerToken = await getProviderToken(creds);
  } catch (err) {
    logger.error({ err, label: creds.label }, "[sendPush] Failed to generate provider JWT");
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
      const session = getSession(creds);
      const req = session.request({
        ":method": "POST",
        ":path": `/3/device/${deviceToken}`,
        "apns-topic": creds.bundleId,
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
            { tokenPrefix: deviceToken.slice(0, 8), label: creds.label },
            "[sendPush] Push delivered",
          );
        } else {
          let body = "";
          req.on("data", (chunk: Buffer) => { body += chunk.toString(); });
          req.on("end", () => {
            logger.warn(
              { status, body, tokenPrefix: deviceToken.slice(0, 8), label: creds.label },
              "[sendPush] APNs rejected push",
            );
          });
        }
        resolve();
      });

      req.on("error", (err) => {
        logger.error({ err, label: creds.label }, "[sendPush] Request error");
        resolve();
      });
    } catch (err) {
      logger.error({ err, label: creds.label }, "[sendPush] Unexpected error sending push");
      resolve();
    }
  });
}

/**
 * Fan-out: send the same notification to multiple device tokens.
 * Each token carries its bundle ID so the correct credentials are selected
 * per-delivery.  Failures are logged but do not throw.
 */
export async function sendPushToMany(
  tokens: TokenWithBundle[],
  payload: PushPayload,
): Promise<void> {
  if (tokens.length === 0) return;
  await Promise.allSettled(
    tokens.map(({ token, bundleId }) => sendPush(token, bundleId, payload)),
  );
}
