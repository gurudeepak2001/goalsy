---
name: Stable route components
description: Preserve in-progress form input when Clerk session restoration updates route state.
---

Route definitions must use stable component identities rather than callbacks recreated during each router render.

**Why:** Clerk's anonymous-client/session restoration can update URL state shortly after a page opens. When that update re-renders Wouter, an inline route callback has a new identity and remounts its page, discarding controlled input state. This is especially noticeable when users begin typing on Sign In immediately.

**How to apply:** Add named route wrapper components at module scope for guarded routes. Do not use inline `component={() => ...}` callbacks for pages that contain stateful UI or forms.

On Capacitor iOS, stable route wrappers alone may not protect a form if Clerk replaces the native route tree once during startup. Preserve freshly typed credentials in a short-lived module-memory draft so the immediate remount restores them.

**Why:** The iOS WebView can remount the sign-in tree during its native Clerk initialization even when Wouter component identities are stable. Browser-only testing does not reproduce this lifecycle.

**How to apply:** Keep the draft strictly in JavaScript memory with a brief expiry, clear it after successful authentication, and never write passwords to localStorage, Preferences, cookies, or any other persistent storage.