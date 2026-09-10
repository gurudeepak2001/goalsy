---
name: Bottom-sheet confirmation transitions
description: Interaction rule for moving from a detail sheet into a destructive-action confirmation.
---

When a destructive action starts inside an open bottom sheet, replace that sheet’s content with the confirmation state instead of closing it while opening a second sheet.

**Why:** Simultaneously animating two portalled Radix dialogs can leave the outgoing overlay above the incoming sheet on native devices, forcing users to tap multiple times.

**How to apply:** Keep one controlled dialog open, switch its title and body to the confirmation step, and clear the selected record only after cancellation, dismissal, or a successful mutation.