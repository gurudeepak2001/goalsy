# iOS WKWebView Session-Persistence Regression Checklist

## Background

`applicationDidEnterBackground(_:)` in `AppDelegate.swift` is the single guarantee that
Clerk session cookies survive a force-quit on iOS.  `WKHTTPCookieStore` is backed by an
in-memory store that iOS wipes entirely when the process is force-killed; cookies are
serialised to `UserDefaults` (`cm_clerk_cookies_v2`) on background transition and
re-injected into `WKWebsiteDataStore.default().httpCookieStore` at the top of
`application(_:didFinishLaunchingWithOptions:)` before the WebView is created.

A silent WKWebView / WebKit update, an Xcode SDK bump, or an iOS major-version release
could change when background handlers are called or how `WKHTTPCookieStore.getAllCookies`
behaves, breaking the backup/restore round-trip without any code change on our side.

**Relevant source file:** `ios/App/App/AppDelegate.swift`
— `saveClerkCookies()` (backup, called on `applicationDidEnterBackground`) and
`restoreClerkCookies()` (restore, called on `application(_:didFinishLaunchingWithOptions:)`).

---

## When to Run This Checklist

Run the full test whenever **any** of the following occur:

| Trigger | Action |
|---------|--------|
| Xcode SDK version bumped (`IPHONEOS_DEPLOYMENT_TARGET` in project settings) | File this checklist under the PR |
| iOS major version release (e.g. iOS 18 → iOS 19) | Run on one physical device and one simulator |
| WKWebView / WebKit API deprecation notice issued by Apple | Run on one physical device and one simulator |
| Capacitor iOS runtime version bumped (`package.json` `@capacitor/ios`) | File this checklist under the PR |
| `UserDefaults` storage behaviour changes noted in Xcode release notes | Run on one physical device and one simulator |

**Current baseline versions** (update this table when versions change):

| Component | Version |
|-----------|---------|
| `IPHONEOS_DEPLOYMENT_TARGET` | 13.0 |
| `@capacitor/ios` | (see `artifacts/goalsy-executive/package.json`) |
| Xcode | (record version used for each run) |
| iOS on test device/simulator | (record version used for each run) |

---

## Test: Force-Quit → Relaunch Session Restore

### Goal
Confirm that a user who is signed in, sends the app to the background, and then has the
process force-killed via the app switcher, is **still signed in** when they reopen the
app — not silently signed out.

### Prerequisites
- A physical iPhone **or** an iOS Simulator running iOS 13+.
- The debug build installed via Xcode (`Product → Run` on the target device/simulator).
- Xcode's Console pane open (or the standalone Console.app on the Mac) filtered to the
  process name `App` and the subsystem/message containing `[Goalsy:native]`.
- The test account credentials — use any valid Clerk account in the test environment.

---

### Steps

#### 1 — Sign In
1. Launch the app (tap the icon on the Home Screen, or run from Xcode).
2. Sign in with a valid account.
3. Confirm the home/dashboard screen loads without error.

---

#### 2 — Background the App
1. Swipe up from the bottom of the screen to return to the Home Screen (or press the Home
   button on older devices).  Do **not** use the app switcher yet — that is the force-quit
   gesture.
2. Confirm the app is no longer visible in the foreground.
3. In the Xcode Console (or Console.app), verify the following log line appears within a
   few seconds:
   ```
   [Goalsy:native] Saved <N> Clerk cookies to UserDefaults:
   ```
   If this line is **missing**, stop — `applicationDidEnterBackground(_:)` is not firing,
   or `getAllCookies` is completing before the background task guard runs.
   If the line shows `0` cookies, record the total-cookie count from the preceding log line
   and investigate — Clerk cookies may not be in the expected store.

---

#### 3 — Force-Quit the Process

> **This step simulates what happens when the user swipes the app away in the app
> switcher.  iOS kills the process immediately; no `applicationWillTerminate` is called.**

1. Open the **app switcher**: swipe up from the bottom edge and pause mid-screen (Face ID
   devices) or double-press the Home button (Touch ID devices).
2. Find the Goalsy card in the switcher.
3. Swipe the Goalsy card **upward** off the screen to force-quit the process.

The process is now dead.  `WKHTTPCookieStore` is gone.  Only `UserDefaults` persists.

> **Alternative — Xcode process kill (most repeatable):**
> With the app in the background and the `[Goalsy:native] Saved …` log confirmed, press
> the **Stop** button (■) in Xcode's toolbar.  This sends SIGKILL to the process,
> identical to a force-quit, without affecting `UserDefaults`.

---

#### 4 — Relaunch
1. Return to the Home Screen (dismiss the app switcher without tapping Goalsy).
2. Tap the Goalsy icon to relaunch.
3. Wait up to 5 seconds for the app to fully load.

---

#### 5 — Verify Session Restored

**Pass criteria (all must be true):**
- [ ] The app goes directly to the authenticated home/dashboard screen.
- [ ] No sign-in prompt or "session expired" screen appears.
- [ ] No visible error toast or banner.
- [ ] Navigating to a protected route (e.g., a goal detail screen) works without
      redirecting to sign-in.

**Fail criteria (any one fails the test):**
- The sign-in screen is shown on relaunch.
- A "session expired" or "you have been signed out" toast appears.
- Any Clerk auth error appears in the WebView's JavaScript console (visible via Safari
  → Develop → [device] → Goalsy's WebView — attach immediately after relaunch).

---

#### 6 — Check Console Logs After Relaunch

In the Xcode Console (filter: `[Goalsy:native]`), confirm the sequence below appears
**in order**:

```
[Goalsy:native] restoreClerkCookies — injecting <N> cookies into WKHTTPCookieStore before WebView load
[Goalsy:native]   restored: __client | domain: <clerk-domain>
[Goalsy:native]   restored: __session | domain: <clerk-domain>
… (one line per cookie)
```

Red flags — record and file a bug if you see any of these:
```
[Goalsy:native] restoreClerkCookies — no saved cookies (first launch or cleared)
[Goalsy:native]   WARN: could not reconstruct cookie: …
[Goalsy:native] ERROR: Failed to serialise Clerk cookies
[Goalsy:native] saveClerkCookies — WebView not found, using default store
```

---

## Logging Reference

| Log line | Meaning |
|----------|---------|
| `[Goalsy:native] saveClerkCookies — reading from live WKWebView cookie store` | Backup reading from the correct store |
| `[Goalsy:native] saveClerkCookies — WebView not found, using default store` | **Warning** — WebView not accessible; fallback store used |
| `[Goalsy:native] Saved <N> Clerk cookies to UserDefaults:` | Backup succeeded; N should be ≥ 2 |
| `[Goalsy:native] ERROR: Failed to serialise Clerk cookies` | **Bug** — serialisation failed; cookies lost |
| `[Goalsy:native] restoreClerkCookies — no saved cookies (first launch or cleared)` | No backup found — expected only on first-ever launch |
| `[Goalsy:native] restoreClerkCookies — injecting <N> cookies …` | Restore in progress |
| `[Goalsy:native]   restored: <name> \| domain: <domain>` | Individual cookie injected successfully |
| `[Goalsy:native]   WARN: could not reconstruct cookie: …` | **Bug** — a saved cookie could not be rebuilt; partial restore |

---

## If the Test Fails

1. **Attach Safari Web Inspector** immediately after relaunch:
   - On macOS: open Safari → Develop → [device name] → Goalsy's WebView.
   - Check **Storage → Cookies** for the Clerk domain — see which cookies are present.
   - Check the **Console** for any `clerk` or `FAPI` error messages.

2. **Verify UserDefaults was written** by adding a temporary log or using Xcode's
   `UserDefaults` viewer (`Debug → View Device State → Data Container`).  If the key
   `cm_clerk_cookies_v2` is absent, `saveClerkCookies` did not complete before the app
   was suspended — consider calling `saveClerkCookies` from `applicationWillResignActive`
   as well (belt-and-suspenders).

3. **Verify timing of `restoreClerkCookies`** — the `setCookie` calls are async.  If
   WebKit on a new iOS version begins loading the WebView faster than the cookies inject,
   you may need to gate WebView load on cookie-restore completion.

4. **Check for WKHTTPCookieStore API deprecation** in the Xcode 
   release notes or WWDC session for the relevant iOS version.  If the backing store
   behaviour changed, the mitigation is to also write cookies via `HTTPCookieStorage.shared`
   as a secondary backup.

5. If the issue is an iOS regression, file a Feedback Assistant report and reference the
   failing Goalsy test run.

---

## Relevant Source Files

| File | Purpose |
|------|---------|
| `ios/App/App/AppDelegate.swift` | `saveClerkCookies()` backup on `applicationDidEnterBackground`; `restoreClerkCookies()` restore on `didFinishLaunchingWithOptions` |
