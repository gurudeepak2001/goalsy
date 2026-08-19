---
name: Enteraxion LLC app migration
description: Plan to publish a new App Store entry under Enteraxion LLC; two hard blockers must be done first.
---

## Decision
New app under Enteraxion LLC — new bundle ID (e.g. com.enteraxion.goalsy), new App Store Connect entry (Goalsy / Goalsy Pro), same backend. No transfer from MyUI LLC.

## Hard blockers before any upload/TestFlight/signing work

### 1. APNs key
Current APNS_KEY_P8 / APNS_KEY_ID / APNS_TEAM_ID are MyUI LLC — won't work for Enteraxion.
Must create a new APNs key under Enteraxion LLC developer account, download the .p8, and update all three Replit secrets plus APNS_BUNDLE_ID.

### 2. Clerk bundle ID
New bundle ID must be added to Clerk Dashboard → Configure → Native Applications (or Redirect URLs) or sign-in will fail on the new build.

**Why:** These are easy to forget and will cause silent failures (no pushes, broken auth) if skipped.

**How to apply:** Any time the user mentions Enteraxion build, TestFlight, uploading, signing, or the new bundle ID — surface both blockers immediately before doing any other work.
