/// CookieRotationTest.swift
///
/// XCUITest used exclusively by the rotate-clerk-test-cookies CI workflow.
/// It signs in to the app with a real Clerk test-environment account,
/// backgrounds the app so that `applicationDidEnterBackground` fires and
/// `saveClerkCookies()` writes the live session cookies to UserDefaults, then
/// exits — leaving the cookies in the simulator's UserDefaults for the CI
/// shell step to extract with `xcrun simctl get_app_container` + `plutil`.
///
/// ## How to invoke
/// This test is NOT meant to be run manually on a local Mac; use
/// `extract-clerk-test-cookies.sh` instead.
///
/// In CI it is invoked by `.github/workflows/rotate-clerk-test-cookies.yml`:
///
///   xcodebuild test \
///     -project ios/App/App.xcodeproj \
///     -scheme AppUITests \
///     -destination 'platform=iOS Simulator,name=iPhone 16' \
///     -only-testing AppUITests/CookieRotationTest/testSignInAndSaveCookies \
///     -testenv CLERK_ROTATE_EMAIL="ci-rotate@example.com" \
///     -testenv CLERK_ROTATE_PASSWORD="…" \
///     CODE_SIGNING_ALLOWED=NO
///
/// ## Environment variables (injected via -testenv)
/// - CLERK_ROTATE_EMAIL    — email address of a valid Clerk test-environment account
/// - CLERK_ROTATE_PASSWORD — password for that account (stored as a CI secret)
///
/// The test skips automatically when either variable is absent, so it never
/// causes a developer's local build to fail.
///
/// ## Timing contract
/// After `XCUIDevice.shared.press(.home)` returns, the test waits
/// `cookieSaveGracePeriod` seconds before terminating the app.  That window
/// is intentionally generous (5 s) to give `WKHTTPCookieStore.getAllCookies`
/// time to complete its async callback before the test harness cleans up.
///
/// ## UI element assumptions
/// The test interacts with Clerk's hosted sign-in WebView via the shared
/// `ClerkWebViewHelpers` / `ClerkSignInLocators` types.  If Clerk changes its
/// form markup, update `ClerkSignInLocators` in `ClerkWebViewSignIn.swift` —
/// this file picks up the change automatically.

import XCTest

final class CookieRotationTest: XCTestCase {

    // MARK: - Configuration

    /// Env var carrying the test-account email (non-secret, safe as a
    /// workflow_dispatch input or a plain CI variable).
    private let emailEnvKey    = "CLERK_ROTATE_EMAIL"

    /// Env var carrying the test-account password (must be stored as a
    /// GitHub Actions secret and injected via `-testenv`).
    private let passwordEnvKey = "CLERK_ROTATE_PASSWORD"

    /// Maximum time to wait for the authenticated dashboard to appear
    /// after submitting credentials.
    private let dashboardTimeout: TimeInterval = 40

    /// Time to wait after pressing Home before terminating, so
    /// saveClerkCookies() can finish its async WKHTTPCookieStore read.
    private let cookieSaveGracePeriod: TimeInterval = 5

    // MARK: - Test

    /// Signs in with the credentials from CLERK_ROTATE_EMAIL /
    /// CLERK_ROTATE_PASSWORD, backgrounds the app, waits for
    /// `saveClerkCookies()` to complete, then terminates.
    ///
    /// After this test passes the CI shell step can read the cookies from the
    /// simulator's UserDefaults via the existing extraction logic.
    func testSignInAndSaveCookies() throws {
        // ── Guard: skip unless both rotation credentials are present ─────────
        guard
            let email    = ProcessInfo.processInfo.environment[emailEnvKey],
            let password = ProcessInfo.processInfo.environment[passwordEnvKey],
            !email.isEmpty, !password.isEmpty
        else {
            throw XCTSkip(
                "CLERK_ROTATE_EMAIL and/or CLERK_ROTATE_PASSWORD not set — " +
                "skipping CookieRotationTest.  These are only injected by the " +
                "rotate-clerk-test-cookies CI workflow."
            )
        }

        // ── 1. Launch the app cold (no seed cookies) ─────────────────────────
        let app = XCUIApplication()
        app.launchEnvironment["GOALSY_UITEST_SUPPRESS_COOKIE_SEED"] = "1"
        app.launch()

        // ── 2. Sign in via Clerk's WebView form ──────────────────────────────
        try ClerkWebViewHelpers.signIn(app: app, email: email, password: password)

        // ── 3. Confirm authenticated state ───────────────────────────────────
        // Wait for the dashboard — any element that only appears when the user
        // is authenticated.  The accessibility identifier "AuthenticatedView"
        // is set by GoalsyApp/ContentView.swift on the root authenticated stack.
        let dashboard = app.otherElements["AuthenticatedView"]
            .firstMatch
        XCTAssertTrue(
            dashboard.waitForExistence(timeout: dashboardTimeout),
            "Authenticated dashboard did not appear within \(dashboardTimeout)s. " +
            "Check that the credentials are valid and that the Clerk test instance is reachable."
        )

        // ── 4. Background the app (triggers applicationDidEnterBackground) ───
        // XCUIDevice.press(.home) sends the app to the background exactly as
        // the Home button does — applicationDidEnterBackground fires, which
        // calls saveClerkCookies() asynchronously.
        XCUIDevice.shared.press(.home)

        // ── 5. Wait for saveClerkCookies() to complete ───────────────────────
        // WKHTTPCookieStore.getAllCookies is async; the grace period lets the
        // background task finish before the test harness cleans up.
        Thread.sleep(forTimeInterval: cookieSaveGracePeriod)

        // ── 6. Terminate — cookies are now in UserDefaults ───────────────────
        // The CI shell step reads them via:
        //   xcrun simctl get_app_container booted com.myui.goalsyexecutive data
        //   plutil -convert json … | python3 -c "…['cm_clerk_cookies_v2']…"
        app.terminate()
    }

}
