/**
 * Push notification registration for Capacitor native builds.
 *
 * Call registerPushNotifications(getToken) once the user is signed in,
 * passing Clerk's getToken function so the token POST is authenticated.
 *
 * No-ops silently on web (non-native) so it's safe to call unconditionally.
 *
 * ⚠️  Full push delivery requires:
 *   1. "Push Notifications" capability added in Xcode → Signing & Capabilities.
 *   2. APNs secrets set in Replit (APNS_KEY_P8, APNS_KEY_ID, APNS_TEAM_ID for
 *      the MyUI app; APNS_KEY_P8_ENTERAXION etc. for the Enteraxion app).
 *   3. Testing on a real device (simulators cannot receive APNs pushes).
 */
import { Capacitor } from "@capacitor/core";
import { App } from "@capacitor/app";
import { PushNotifications } from "@capacitor/push-notifications";

const apiBase = (import.meta.env.VITE_API_BASE_URL as string) ?? "";

async function storeToken(
  token: string,
  platform: string,
  getToken: () => Promise<string | null>,
  bundleId?: string,
): Promise<void> {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  const jwt = await getToken().catch(() => null);
  if (jwt) headers["Authorization"] = `Bearer ${jwt}`;

  const body: Record<string, string> = { token, platform };
  if (bundleId) body["bundleId"] = bundleId;

  const res = await fetch(`${apiBase}/api/push-tokens`, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`[push] storeToken ${res.status}: ${text}`);
  }
}

let listenersAdded = false;

/**
 * Request push permission and register with APNs/FCM.
 * Safe to call multiple times — listeners are added only once.
 *
 * Reads the app bundle ID via App.getInfo() so the server can route the push
 * to the correct APNs credential set (MyUI vs Enteraxion).
 *
 * @param getToken - Clerk's getToken() from useAuth()
 */
export async function registerPushNotifications(
  getToken: () => Promise<string | null>,
): Promise<void> {
  if (!Capacitor.isNativePlatform()) return;

  let status = await PushNotifications.checkPermissions();
  if (status.receive === "prompt") {
    status = await PushNotifications.requestPermissions();
  }
  if (status.receive !== "granted") {
    console.log("[Goalsy:push] Permission not granted:", status.receive);
    return;
  }

  await PushNotifications.register();

  if (listenersAdded) return;
  listenersAdded = true;

  // Read the native bundle ID once so token registrations carry it.
  // App.getInfo() is only available on native; the isNativePlatform() guard
  // above ensures we never reach this on web.
  let nativeBundleId: string | undefined;
  try {
    const info = await App.getInfo();
    nativeBundleId = info.id; // e.g. "com.enteraxion.goalsy"
    console.log("[Goalsy:push] Bundle ID:", nativeBundleId);
  } catch (err) {
    console.warn("[Goalsy:push] Could not read bundle ID:", err);
  }

  // ── Token received from APNs/FCM ─────────────────────────────────────────
  PushNotifications.addListener("registration", async (token) => {
    const platform = Capacitor.getPlatform(); // 'ios' | 'android'
    console.log("[Goalsy:push] Token registered (len:", token.value.length, "platform:", platform, "bundleId:", nativeBundleId ?? "unknown", ")");
    try {
      await storeToken(token.value, platform, getToken, nativeBundleId);
    } catch (err) {
      console.warn("[Goalsy:push] Failed to store token:", err);
    }
  });

  PushNotifications.addListener("registrationError", (err) => {
    console.warn("[Goalsy:push] Registration error:", err.error);
  });

  // ── Foreground notification received ─────────────────────────────────────
  PushNotifications.addListener("pushNotificationReceived", (notification) => {
    console.log("[Goalsy:push] Foreground notification:", notification.title);
    // The in-app notification bell picks it up on next poll.
  });

  // ── User tapped a notification ────────────────────────────────────────────
  PushNotifications.addListener("pushNotificationActionPerformed", (action) => {
    const screen: string | undefined = action.notification.data?.["targetScreen"];
    console.log("[Goalsy:push] Notification tapped — navigating to:", screen);
    if (screen) {
      window.location.hash = screen;
    }
  });
}
