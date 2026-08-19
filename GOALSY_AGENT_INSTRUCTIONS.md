# Goalsy Agent Instructions

Persistent notes for the AI agent working on this project. Update this file
whenever a significant decision or reminder is documented.

---

## Enteraxion LLC — New App Store Entry Plan

**Decision (2026-08-18):** Not doing a formal Apple "Transfer App". Instead,
creating a **brand-new app** under the **Enteraxion LLC** Apple Developer
account with:
- A new bundle ID (e.g. `com.enteraxion.goalsy` or similar)
- A new App Store Connect entry (name: **Goalsy** or **Goalsy Pro**)
- Pointing at the **same backend** (`goalsy-finance-ui.replit.app`)
- No tester/review history carried over — clean slate

### ⚠️ Two blockers that MUST be done before the Enteraxion build can be uploaded or tested

#### 1. New APNs Key (Push Notifications)
The current secrets `APNS_KEY_P8`, `APNS_KEY_ID`, and `APNS_TEAM_ID` are tied
to the **MyUI LLC** Apple Developer team. They will not work for the
Enteraxion LLC team or a different bundle ID.

**Steps:**
1. Sign in to [developer.apple.com](https://developer.apple.com) under the
   Enteraxion LLC account.
2. Go to **Certificates, Identifiers & Profiles → Keys**.
3. Create a new key with **Apple Push Notifications service (APNs)** enabled.
4. Download the `.p8` file (one-time download).
5. Note the **Key ID** and **Team ID** (found under Account → Membership).
6. Add all three as new Replit Secrets:
   - `APNS_KEY_P8` — full contents of the `.p8` file including header/footer lines
   - `APNS_KEY_ID` — 10-character Key ID
   - `APNS_TEAM_ID` — 10-character Team ID (Enteraxion's, not MyUI's)

> The `APNS_BUNDLE_ID` env var (currently defaults to `com.myui.goalsyexecutive`)
> also needs to be updated to match the new bundle ID.

#### 2. Clerk — New Bundle ID / Redirect URL
The Clerk tenant must explicitly allow the new bundle ID as a trusted native
app identifier, or the sign-in WebView flow will fail on the Enteraxion build.

**Steps:**
1. Open the Clerk Dashboard for this project.
2. Go to **Configure → Native Applications** (or **Redirect URLs**, depending
   on Clerk dashboard version).
3. Add the new bundle ID in the format `com.enteraxion.goalsy` (or whichever
   bundle ID is chosen) as an allowed native app / redirect URL.
4. If using a Capacitor custom scheme, also add `com.enteraxion.goalsy://`
   as an allowed redirect.

### Reminder trigger
**If the user mentions uploading, TestFlight, signing, or debugging anything
related to the Enteraxion build or the new bundle ID, surface both blockers
above before anything else.**
