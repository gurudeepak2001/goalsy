---
name: Stable route components
description: Preserve in-progress form input when Clerk session restoration updates route state.
---

Route definitions must use stable component identities rather than callbacks recreated during each router render.

**Why:** Clerk's anonymous-client/session restoration can update URL state shortly after a page opens. When that update re-renders Wouter, an inline route callback has a new identity and remounts its page, discarding controlled input state. This is especially noticeable when users begin typing on Sign In immediately.

**How to apply:** Add named route wrapper components at module scope for guarded routes. Do not use inline `component={() => ...}` callbacks for pages that contain stateful UI or forms.