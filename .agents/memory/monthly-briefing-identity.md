---
name: Monthly briefing identity
description: Identity and update-notification rules for generated future briefings.
---

Generated future briefings must keep the same identity for their type throughout the current calendar month, even though their scheduled date or generated content may change.

Viewed content versions are user state, not device state, and must be stored centrally.

**Why:** A rolling date-based identity makes every regeneration look like a different briefing, and device-local viewed versions make update markers disagree across web and mobile.

**How to apply:** Derive each briefing ID from the authenticated user, briefing type, and current month. Keep briefings visible after opening. Persist the opened content version for the authenticated user on the server, then compare it with current content.