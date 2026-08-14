# Android WebView Session-Persistence Regression Checklist

## Background

`CookieManager.flush()` in `MainActivity.onStop()` is the single guarantee that Clerk
session cookies survive a force-kill. Android System WebView ships as a separate APK
and updates silently and independently of the OS.  A WebView update could change how
the Chromium cookie layer flushes to its SQLite store, breaking the flush→restore
guarantee without any code change on our side.

This checklist must be run whenever:

| Trigger | What to check in the build |
|---------|---------------------------|
| `targetSdkVersion` bumped in `variables.gradle` | File this checklist under the PR |
| `compileSdkVersion` bumped in `variables.gradle` | File this checklist under the PR |
| Gradle wrapper version bumped in `gradle/wrapper/gradle-wrapper.properties` | File this checklist under the PR |
| A major Android System WebView release ships (stable channel, e.g. 125→126) | Run on one physical device and one emulator |
| `androidx.webkit` version bumped in `variables.gradle` | Run on one physical device and one emulator |
| Capacitor Android runtime version bumped (`cordovaAndroidVersion` in `variables.gradle`) | File this checklist under the PR |

**Current baseline versions** (update this table when versions change):

| Component | Version |
|-----------|---------|
| `compileSdkVersion` | 36 |
| `targetSdkVersion` | 36 |
| `minSdkVersion` | 24 |
| Gradle wrapper | 8.14.3 |
| `androidxWebkitVersion` | 1.14.0 |
| `cordovaAndroidVersion` | 14.0.1 |

---

## Test: Force-Kill → Relaunch Session Restore

### Goal
Confirm that a user who is signed in, sends the app to the background, and then has the
process force-killed from the recents switcher, is **still signed in** when they reopen
the app — not silently signed out.

### Prerequisites
- A physical Android device **or** an emulator running Android 10+ (API 29+).
- The debug APK installed (`./gradlew assembleDebug && adb install -r app/build/outputs/apk/debug/app-debug.apk`).
- ADB connected (`adb devices` shows the target).
- Logcat filter ready: `adb logcat -s Goalsy:D` (the `[Goalsy:native]` tag).
- The test account credentials — use any valid Clerk account in the test environment.

### Steps

#### 1 — Sign in
1. Open the app.
2. Sign in with a valid account.
3. Confirm the home/dashboard screen loads without error.

#### 2 — Background the app
1. Press the **Home** button (do **not** press Back — that navigates within the app).
2. Confirm the app is no longer visible in the foreground.
3. In logcat, verify:
   ```
   D Goalsy: [Goalsy:native] onStop — CookieManager.flush() complete
   ```
   If this line is **missing**, stop — `onStop()` is not firing correctly.
   If it shows `flush() failed`, record the exception message and file a bug immediately.

#### 3 — Force-kill the process
Choose **one** of the following methods (both must pass):

**Method A — Recents switcher swipe-away (simulates user behaviour)**
1. Open the recents switcher (square/recent-apps button).
2. Swipe the Goalsy card off the screen.
3. The process is now force-killed.

**Method B — ADB kill (most reliable for CI-like testing)**
```bash
# Find the PID
adb shell pidof com.goalsy.executive

# Kill it (replace <PID> with the actual value)
adb shell kill -9 <PID>
```

#### 4 — Relaunch
1. Tap the Goalsy icon on the launcher (or run `adb shell monkey -p com.goalsy.executive -c android.intent.category.LAUNCHER 1`).
2. Wait up to 5 seconds for the app to fully load.

#### 5 — Verify session restored
**Pass criteria (all must be true):**
- [ ] The app goes directly to the authenticated home/dashboard screen.
- [ ] No sign-in prompt or "session expired" screen appears.
- [ ] No visible error toast or banner.
- [ ] Navigating to a protected route (e.g., a goal detail screen) works without redirecting to sign-in.

**Fail criteria (any one fails the test):**
- The sign-in screen is shown on relaunch.
- A "session expired" or "you have been signed out" toast appears.
- Any Clerk auth error appears in the browser console (visible via `adb shell am start --user 0 -a android.intent.action.VIEW` or DevTools remote debugging).

#### 6 — Check logcat for errors
After relaunch, run:
```bash
adb logcat -d -s Goalsy:* | grep -i "clerk\|session\|cookie\|flush"
```
Confirm there are no unexpected error lines from `[Goalsy:native]`.

---

## Logging Reference

| Log line | Meaning |
|----------|---------|
| `[Goalsy:native] onStop — CookieManager.flush() complete` | Flush succeeded; cookies are on disk |
| `[Goalsy:native] onStop — CookieManager.flush() failed: …` | **Bug** — flush threw; cookies may be lost |
| *(line missing entirely)* | **Bug** — `onStop()` not called or superclass override missing |

---

## If the Test Fails

1. Enable WebView remote debugging in a debug build:
   ```java
   // MainActivity.java — debug builds only
   if (BuildConfig.DEBUG) {
       WebView.setWebContentsDebuggingEnabled(true);
   }
   ```
2. Open `chrome://inspect` on desktop Chrome, attach to the WebView, and inspect
   `Application → Cookies` immediately after the relaunch to see which cookies are present.
3. Check whether `CookieManager.getInstance().hasCookies()` returns `true` in `onCreate()`.
4. If cookies are missing, the WebView update likely changed the flush timing.  Possible
   mitigations to investigate:
   - Call `flush()` in both `onPause()` **and** `onStop()` (belt-and-suspenders).
   - Wrap the flush in a coroutine / handler with a short deadline before calling
     `super.onStop()` to give the write more time.
   - File an issue against the Android System WebView Chromium tracker if the behaviour
     is a WebView regression.

---

## Relevant Source Files

| File | Purpose |
|------|---------|
| `android/app/src/main/java/com/goalsy/executive/MainActivity.java` | `onStop()` flush implementation |
| `android/variables.gradle` | SDK / dependency version pins |
| `android/gradle/wrapper/gradle-wrapper.properties` | Gradle wrapper version |
