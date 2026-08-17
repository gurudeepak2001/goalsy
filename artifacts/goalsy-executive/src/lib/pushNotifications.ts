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
 *   2. APNS_KEY_P8 / APNS_KEY_ID / APNS_TEAM_ID secrets set in Replit.
 *   3. Testing on a real device (simulators cannot receive APNs pushes).
 */
import { Capacitor } from "@capacitor/core";
import { PushNotifications } from "@capacitor/push-notifications";

const apiBase = (import.meta.env.VITE_API_BASE_URL as string) ?? "";

async function storeToken(
  token: string,
  platform: string,
  getToken: () => Promise<string | null>,
): Promise<void> {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  const jwt = await getToken().catch(() => null);
  if (jwt) headers["Authorization"] = `Bearer ${jwt}`;

  const res = await fetch(`${apiBase}/api/push-tokens`, {
    method: "POST",
    headers,
    body: JSON.stringify({ token, platform }),
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`[push] storeToken ${res.status}: ${body}`);
  }
}

let listenersAdded = false;

/**
 * Request push permission and register with APNs/FCM.
 * Safe to call multiple times — listeners are added only once.
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

  // ── Token received from APNs/FCM ─────────────────────────────────────────
  PushNotifications.addListener("registration", async (token) => {
    const platform = Capacitor.getPlatform(); // 'ios' | 'android'
    console.log("[Goalsy:push] Token registered (len:", token.value.length, "platform:", platform, ")");
    try {
      await storeToken(token.value, platform, getToken);
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
