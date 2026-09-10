---
name: Monthly briefing identity
description: Identity and update-notification rules for generated future briefings.
---

Generated future briefings must keep the same identity for their type throughout the current calendar month, even though their scheduled date or generated content may change.

**Why:** A rolling date-based identity makes every regeneration look like a different briefing, so Goalsy cannot tell whether previously viewed content was updated.

**How to apply:** Derive each briefing ID from the authenticated user, briefing type, and current month. Keep briefings visible after opening. Compare current content with the last version opened and show an update marker only when they differ.