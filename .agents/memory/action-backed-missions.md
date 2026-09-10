---
name: Action-backed mission completion
description: Completion rule for daily missions that direct users to perform a real financial action.
---

When a daily mission asks the user to change real Goalsy data, its primary action must route to the relevant record and the mission must complete only after the underlying write succeeds.

The “Top up your highest-priority goal” mission means one additional contribution of at least $25 during the current week. It does not compare against last week and must not alter the recurring contribution plan. If the current week already has a recorded amount, present and validate a new weekly total at least $25 higher.

**Why:** A generic “Mark Complete” button could award mission progress without the user making the requested goal contribution, leaving the score disconnected from actual activity.

**How to apply:** Resolve the target from authenticated user data, explain whether the action is one-time or recurring, carry only the target and mission identifiers into the action flow, save the user action first, then call the owner-scoped mission completion endpoint and refresh mission and score queries.