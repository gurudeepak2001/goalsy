/**
 * Initialises the generated API client with Clerk auth.
 *
 * Call `initApiClient(getToken)` once at app startup (inside a component
 * that has access to the Clerk hook) so every generated React Query hook
 * automatically attaches the session token to API requests.
 *
 * The BASE_URL is left empty for web — the Replit path-based router already
 * forwards /api/* to the API server on the same domain.  For a Capacitor
 * native build pointed at a remote host, set VITE_API_BASE_URL in the env.
 *
 * IMPORTANT: never gate re-initialisation behind an `initialised` flag.
 * The first mount happens before sign-in; that `getToken` closure returns
 * null forever.  Re-registering on every `[getToken]` identity change
 * (each sign-in produces a new function reference) keeps the client live.
 */
import { setAuthTokenGetter, setBaseUrl } from "@workspace/api-client-react";

// Module-level indirection so the registered getter always calls the latest
// Clerk `getToken` reference, even after sign-in changes it.
let currentGetToken: (() => Promise<string | null>) | null = null;

// Set the base URL once — it never changes between sign-ins.
const apiBase = import.meta.env.VITE_API_BASE_URL ?? "";
if (apiBase) setBaseUrl(apiBase);

// Register the indirection once — the getter itself stays constant; only
// currentGetToken is swapped on each call to initApiClient.
setAuthTokenGetter(() => {
  if (!currentGetToken) {
    console.warn('[Goalsy:api] outbound request WITHOUT auth token — getToken not yet registered');
    return Promise.resolve(null);
  }
  return currentGetToken().then((token) => {
    if (!token) console.warn('[Goalsy:api] outbound request WITHOUT auth token — getToken returned null');
    else if (token.length < 100) console.warn('[Goalsy:api] outbound request with suspiciously short token (len:', token.length, ')');
    return token;
  }).catch((err) => {
    console.warn('[Goalsy:api] getToken threw:', err);
    return null;
  });
});

export function initApiClient(getToken: () => Promise<string | null>) {
  // Always update — a new getToken reference means the user just signed in.
  currentGetToken = getToken;
}
