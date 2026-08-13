/**
 * Initialises the generated API client with Clerk auth.
 *
 * Call `initApiClient(getToken)` at app startup and again whenever the
 * Clerk `getToken` identity changes (sign-in / sign-out). The api client
 * always calls through a module-level indirection to the LATEST getter —
 * a stale pre-sign-in closure can never be captured permanently.
 *
 * The BASE_URL is left empty for web — the Replit path-based router already
 * forwards /api/* to the API server on the same domain.  For a Capacitor
 * native build pointed at a remote host, set VITE_API_BASE_URL in the env.
 */
import { setAuthTokenGetter, setBaseUrl } from "@workspace/api-client-react";

let baseUrlSet = false;
let currentGetToken: (() => Promise<string | null>) | null = null;

export function initApiClient(getToken: () => Promise<string | null>) {
  // Always update to the latest getter — Clerk re-creates getToken when auth
  // state changes (sign-in / sign-out), and the old closure returns null.
  currentGetToken = getToken;

  if (baseUrlSet) return;
  baseUrlSet = true;

  // Web: empty (same-origin /api/* routing via Replit proxy).
  // Capacitor: full URL baked in at build time via VITE_API_BASE_URL.
  const apiBase = import.meta.env.VITE_API_BASE_URL ?? "";
  if (apiBase) setBaseUrl(apiBase);

  // Attach the Clerk session JWT to every outbound API request, via the
  // indirection so we always call the freshest getToken.
  setAuthTokenGetter(async () => {
    try {
      const token = await currentGetToken?.();
      // Diagnostic: log token presence/length (never the value itself) so
      // 401s can be traced to a missing vs. rejected token.
      if (!token) {
        console.log('[Goalsy:api] outbound request WITHOUT auth token (getToken returned null)');
      } else if (token.length < 100) {
        console.log('[Goalsy:api] outbound token suspiciously short (len:', token.length, ')');
      }
      return token ?? null;
    } catch (err) {
      console.log('[Goalsy:api] getToken threw:', err);
      return null;
    }
  });
}
