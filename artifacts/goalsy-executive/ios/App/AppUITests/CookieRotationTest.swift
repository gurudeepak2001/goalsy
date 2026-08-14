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
/// The test interacts with Clerk's hosted sign-in WebView.  The identifiers
/// used below match the Clerk default component HTML at the time of writing.
/// If Clerk changes its markup, update the predicates in the sign-in helpers.
/// See the "UI Locator Notes" inline comments for fallback strategies.

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
        try signIn(app: app, email: email, password: password)

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
        //   xcrun simctl get_app_container booted com.goalsy.executive data
        //   plutil -convert json … | python3 -c "…['cm_clerk_cookies_v2']…"
        app.terminate()
    }

    // MARK: - Sign-In Helpers

    /// Drives Clerk's WebView sign-in form through its two-step flow:
    ///   Step 1 — enter email, tap Continue
    ///   Step 2 — enter password, tap Continue / Sign in
    ///
    /// UI locator notes:
    /// - Clerk renders its sign-in UI inside a WKWebView, so all elements are
    ///   reached via `app.webViews.firstMatch`.
    /// - The email field is identified by its placeholder "Email address";
    ///   fall back to a text-field predicate if Clerk changes it.
    /// - The password field is a `secureTextField`; Clerk currently uses
    ///   placeholder "Password".
    /// - "Continue" is Clerk's default button label for both steps; adjust if
    ///   the instance uses a custom label.
    private func signIn(app: XCUIApplication, email: String, password: String) throws {
        let webView = app.webViews.firstMatch

        // ── Step 1: email ─────────────────────────────────────────────────────
        // Wait for the sign-in form to appear in the WebView.
        XCTAssertTrue(
            webView.waitForExistence(timeout: 20),
            "WebView did not appear — is the app showing a sign-in screen?"
        )

        // Locate the email field.  Try the placeholder first; fall back to the
        // first text field in the WebView if Clerk changes its copy.
        let emailField: XCUIElement
        let emailByPlaceholder = webView.textFields["Email address"]
        if emailByPlaceholder.waitForExistence(timeout: 10) {
            emailField = emailByPlaceholder
        } else {
            // Fallback: first text field in the WebView
            let fallback = webView.textFields.firstMatch
            XCTAssertTrue(
                fallback.waitForExistence(timeout: 5),
                "Could not locate an email text field in the sign-in WebView. " +
                "Clerk may have changed its markup — update the locator in CookieRotationTest.swift."
            )
            emailField = fallback
        }

        emailField.tap()
        emailField.typeText(email)

        // Tap the first "Continue" button to advance to the password step.
        tapContinueButton(in: webView)

        // ── Step 2: password ──────────────────────────────────────────────────
        // Wait for the password field to appear (Clerk's two-step flow).
        let passwordField: XCUIElement
        let passwordByPlaceholder = webView.secureTextFields["Password"]
        if passwordByPlaceholder.waitForExistence(timeout: 10) {
            passwordField = passwordByPlaceholder
        } else {
            let fallback = webView.secureTextFields.firstMatch
            XCTAssertTrue(
                fallback.waitForExistence(timeout: 5),
                "Could not locate a password secure text field after entering email. " +
                "Clerk may have changed its markup — update the locator in CookieRotationTest.swift."
            )
            passwordField = fallback
        }

        passwordField.tap()
        passwordField.typeText(password)

        // Tap Continue / Sign in to submit credentials.
        tapContinueButton(in: webView)
    }

    /// Taps the first visible "Continue" or "Sign in" button inside `parent`.
    /// Waits up to 5 s for it to appear (Clerk may animate the transition).
    private func tapContinueButton(in parent: XCUIElement) {
        // Prefer the exact label "Continue"; fall back to "Sign in" or the
        // first button with type="submit" (matched via predicate on identifier).
        let continueBtn   = parent.buttons["Continue"].firstMatch
        let signInBtn     = parent.buttons["Sign in"].firstMatch
        let firstButton   = parent.buttons.firstMatch

        if continueBtn.waitForExistence(timeout: 5) {
            continueBtn.tap()
        } else if signInBtn.waitForExistence(timeout: 2) {
            signInBtn.tap()
        } else {
            XCTAssertTrue(
                firstButton.waitForExistence(timeout: 2),
                "Could not find a Continue/Sign-in button in the WebView. " +
                "Update the button locator in CookieRotationTest.swift."
            )
            firstButton.tap()
        }
    }
}
