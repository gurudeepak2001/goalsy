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
 */
import { setAuthTokenGetter, setBaseUrl } from "@workspace/api-client-react";

let initialised = false;

export function initApiClient(getToken: () => Promise<string | null>) {
  if (initialised) return;
  initialised = true;

  // Web: empty (same-origin /api/* routing via Replit proxy).
  // Capacitor: full URL baked in at build time via VITE_API_BASE_URL.
  const apiBase = import.meta.env.VITE_API_BASE_URL ?? "";
  if (apiBase) setBaseUrl(apiBase);

  // Attach the Clerk session JWT to every outbound API request.
  setAuthTokenGetter(getToken);
}
