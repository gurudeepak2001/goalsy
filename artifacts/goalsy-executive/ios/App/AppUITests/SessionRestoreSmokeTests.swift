/// SessionRestoreSmokeTests.swift
///
/// XCUITest smoke test that verifies a restored Clerk session cookie is still
/// accepted by Clerk's FAPI server after a force-kill / relaunch cycle.
///
/// ## Why this test exists
/// The unit tests in AppTests/ClerkCookiePersistenceTests.swift confirm the
/// local save→restore round-trip (UserDefaults ↔ WKHTTPCookieStore) works, but
/// they use fake cookies that are never sent to Clerk's servers.  A cookie that
/// passes the local test but is expired or revoked will still cause a silent
/// sign-out — the only signal was previously the manual checklist.
///
/// This smoke test closes that gap: it exercises the full path including Clerk's
/// FAPI response by seeding *real* test-environment cookies, force-killing the
/// process, and asserting the app lands on the authenticated dashboard (not the
/// sign-in screen) on next launch.
///
/// ## How to obtain test cookies
/// 1. Run the app in a simulator with a Clerk test-environment account.
/// 2. Background the app (press Home) — this triggers saveClerkCookies().
/// 3. From the Mac terminal:
///      CONTAINER=$(xcrun simctl get_app_container booted com.goalsy.executive data)
///      plutil -convert json "$CONTAINER/Library/Preferences/com.goalsy.executive.plist" -o - \
///        | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('cm_clerk_cookies_v2',''))"
/// 4. That output is the value to set as CLERK_TEST_COOKIES.
///
/// ## Running locally
/// Export CLERK_TEST_COOKIES into your shell before invoking xcodebuild.
/// The AppUITests scheme's TestAction expands $(CLERK_TEST_COOKIES) from the
/// process environment, so no -testenv flag is needed:
///
///   export CLERK_TEST_COOKIES='[{"name":"__client","value":"…","domain":".clerk.goalsy.accounts.dev","path":"/","isSecure":true,"isHTTPOnly":false}]'
///   xcodebuild test \
///     -project ios/App/App.xcodeproj \
///     -scheme AppUITests \
///     -destination 'platform=iOS Simulator,name=iPhone 16'
///
/// ## Running in CI
/// The secret is stored as CLERK_TEST_COOKIES in the repository's Actions
/// secrets.  The workflow job exports it as an env var and the scheme forwards
/// it to the test runner via the TestAction EnvironmentVariables expansion.
/// The test automatically skips (XCTSkip) when the variable is absent or
/// empty, so builds without credentials stay green.

import XCTest

final class SessionRestoreSmokeTests: XCTestCase {

    // MARK: - Constants

    /// CI/local env var that carries the pre-serialised Clerk cookie JSON.
    /// Format: JSON array matching the cm_clerk_cookies_v2 schema:
    ///   [{"name": "...", "value": "...", "domain": "...", "path": "...",
    ///     "isSecure": true, "isHTTPOnly": false, "expires": 1234567890}]
    private let cookieEnvKey = "CLERK_TEST_COOKIES"

    /// Launch-environment key AppDelegate reads to seed UserDefaults with the
    /// provided cookies before ClerkCookiePersistence.restore() runs.
    /// Set by this test only; never present in production.
    private let seedLaunchEnvKey = "GOALSY_UITEST_CLERK_COOKIES"

    /// How long to wait for the authenticated dashboard to appear after relaunch.
    private let dashboardTimeout: TimeInterval = 20

    /// How long to poll for a sign-in indicator after relaunch (shorter window).
    private let signInCheckWindow: TimeInterval = 6

    // MARK: - Tests

    /// Core regression: a Clerk session cookie written to UserDefaults by
    /// saveClerkCookies() must still be valid on Clerk's server after a cold
    /// start — so the app never silently signs the user out.
    ///
    /// Steps:
    ///  1. Seed phase — launch with GOALSY_UITEST_CLERK_COOKIES so AppDelegate
    ///     writes real cookies into UserDefaults (simulating a prior save).
    ///  2. Force-kill — XCUIApplication.terminate() sends SIGKILL, wiping
    ///     WKHTTPCookieStore exactly as a force-quit does.
    ///  3. Cold start — relaunch without the seed key; ClerkCookiePersistence
    ///     reads UserDefaults and injects the cookies before WebView loads.
    ///  4. Assert — the app must reach the authenticated dashboard and must NOT
    ///     show any sign-in prompt or Clerk FAPI error.
    func testRestoredSessionIsAcceptedByClerkServer() throws {
        // ── Guard: skip unless real test cookies are provided ────────────────
        guard let cookiesJSON = ProcessInfo.processInfo.environment[cookieEnvKey],
              !cookiesJSON.isEmpty else {
            throw XCTSkip(
                """
                CLERK_TEST_COOKIES is not set — skipping the server-validation smoke test.

                To enable this test, obtain Clerk cookies from a signed-in test-environment
                session (see the file header for instructions) and export the JSON string:
                  export CLERK_TEST_COOKIES='[{...}]'

                The test is automatically skipped in builds where no credentials are available.
                """
            )
        }

        // Validate that the value is parseable JSON before even launching the app,
        // so a malformed env var produces a clear failure message.
        guard let cookieData = cookiesJSON.data(using: .utf8),
              (try? JSONSerialization.jsonObject(with: cookieData)) != nil else {
            XCTFail(
                "CLERK_TEST_COOKIES contains invalid JSON. " +
                "Expected a JSON array of cookie dictionaries."
            )
            return
        }

        // ── Step 1: Seed phase ────────────────────────────────────────────────
        // Launch the app with the cookies JSON in the launch environment.
        // AppDelegate reads GOALSY_UITEST_CLERK_COOKIES and writes the data into
        // UserDefaults under cm_clerk_cookies_v2 before calling
        // ClerkCookiePersistence.restore() — simulating a session that was saved
        // by a prior applicationDidEnterBackground().
        let seedApp = XCUIApplication()
        seedApp.launchEnvironment[seedLaunchEnvKey] = cookiesJSON
        seedApp.launch()

        // Allow the app to finish its startup sequence and write UserDefaults.
        // We don't assert any UI in this phase — we only need the data written.
        sleep(3)

        // ── Step 2: Force-kill ───────────────────────────────────────────────
        // XCUIApplication.terminate() delivers SIGKILL to the app process.
        // This is identical to:
        //   • Pressing the Stop button (■) in Xcode with the app backgrounded
        //   • Swiping the app card upward in the iOS app switcher
        // WKHTTPCookieStore is wiped; UserDefaults survives because it was
        // synchronize()'d in AppDelegate before the process received the signal.
        seedApp.terminate()

        // ── Step 3: Cold start ───────────────────────────────────────────────
        // Relaunch WITHOUT the seed key.  ClerkCookiePersistence.restore() now
        // executes its normal path: reads UserDefaults, rebuilds HTTPCookie
        // objects, and injects them into WKHTTPCookieStore before the WebView
        // loads.  Clerk's clerk-js reads the injected __client cookie on its
        // first /v1/client request and returns the live session — or rejects the
        // cookie and redirects to sign-in if it is expired/revoked.
        let app = XCUIApplication()
        // Explicitly clear any leftover seed key from a previous test run.
        app.launchEnvironment.removeValue(forKey: seedLaunchEnvKey)
        app.launch()

        // ── Step 4a: Assert no sign-in prompt ────────────────────────────────
        assertNoSignInPrompt(in: app)

        // ── Step 4b: Assert dashboard is reachable ───────────────────────────
        assertDashboardVisible(in: app)
    }

    // MARK: - Assertion helpers

    /// Polls for `signInCheckWindow` seconds and fails immediately if any
    /// recognisable sign-in or session-error element appears.
    ///
    /// Primary check: the stable native accessibilityIdentifier
    /// "goalsy.screen.signin" set by GoalsyAuthStateHandler in AppDelegate when
    /// the web layer posts authState = "signin".  This identifier is immune to
    /// Clerk UI renames because it is set by our own code, not scraped from
    /// Clerk's rendered text.
    ///
    /// Secondary checks: WKWebView accessibility-tree text labels from Clerk's
    /// sign-in form and the app's own auth-error screens.  These remain as a
    /// belt-and-suspenders layer in case the bridge message is delayed.
    private func assertNoSignInPrompt(in app: XCUIApplication) {
        // ── Primary: stable native identifier ────────────────────────────────
        // The identifier is set asynchronously after Clerk resolves auth state,
        // so we poll within signInCheckWindow just like the text fallbacks.
        // Failing on the primary identifier is the definitive signal — no need
        // to also check text labels once this fires.
        let signInScreen = app.otherElements["goalsy.screen.signin"]

        // ── Secondary: visible-text fallbacks ─────────────────────────────────
        // Match on text/labels that Clerk's default sign-in UI renders and that
        // the app's own auth-error states might surface.  Kept as a belt-and-
        // suspenders layer; do NOT remove — they catch regressions where the
        // native bridge fires but the route guard fails to redirect.
        // Clerk-rendered labels use `ClerkSignInLocators` so any placeholder
        // rename only needs to be updated in ClerkWebViewHelpers.swift.
        let signInTextIndicators: [XCUIElement] = [
            app.staticTexts["Session expired"],
            app.staticTexts["You have been signed out"],
            app.staticTexts["Signed out"],
            app.buttons[ClerkSignInLocators.welcomeSignInButton],
            app.buttons[ClerkSignInLocators.signInButton],
            // Clerk's sign-in form fields (rendered in the WebView)
            app.textFields[ClerkSignInLocators.emailPlaceholder],
            app.secureTextFields[ClerkSignInLocators.passwordPlaceholder],
        ]

        let deadline = Date().addingTimeInterval(signInCheckWindow)
        while Date() < deadline {
            // Primary check first — stable and fast.
            if signInScreen.exists {
                XCTFail(
                    """
                    Native sign-in screen identifier 'goalsy.screen.signin' appeared after
                    session restore.

                    This means the Clerk cookie saved to UserDefaults was rejected by FAPI —
                    it may be expired, revoked, or belong to a different Clerk instance.

                    Next steps:
                    1. Re-obtain fresh CLERK_TEST_COOKIES from a live signed-in session.
                    2. Confirm the test account is in the *test* Clerk instance (pk_test_…),
                       not the production instance.
                    3. Check the WebView console via Safari → Develop → [Simulator] for
                       Clerk FAPI error details.
                    """
                )
                return
            }
            // Secondary text-based fallbacks.
            for indicator in signInTextIndicators where indicator.exists {
                XCTFail(
                    """
                    Sign-in text indicator '\(indicator.label)' appeared after session restore.

                    The native bridge identifier 'goalsy.screen.signin' did not fire, but a
                    Clerk sign-in UI element is visible — the Clerk cookie was likely rejected.

                    Next steps:
                    1. Re-obtain fresh CLERK_TEST_COOKIES from a live signed-in session.
                    2. Confirm the test account is in the *test* Clerk instance (pk_test_…),
                       not the production instance.
                    3. Check the WebView console via Safari → Develop → [Simulator] for
                       Clerk FAPI error details.
                    """
                )
                return
            }
            RunLoop.current.run(until: Date().addingTimeInterval(0.4))
        }
    }

    /// Waits up to `dashboardTimeout` for the authenticated home/dashboard screen
    /// to appear.  Fails if no recognisable authenticated-state element is found.
    ///
    /// Three layers of detection in priority order:
    ///
    /// 1. Native bridge identifier "goalsy.screen.dashboard" — set by
    ///    GoalsyAuthStateHandler in AppDelegate when the web layer posts
    ///    authState = "dashboard".  Immune to both Clerk and app label renames.
    ///
    /// 2. Web data-testid "AuthenticatedView" — set via data-testid on
    ///    AppShell's root div, surfaced through the WKWebView accessibility
    ///    bridge.  App-owned, so Clerk markup changes cannot affect it.
    ///
    /// 3. Structural / text fallbacks (tab bars, nav bars, static text labels).
    ///    Least stable but broadest coverage for edge cases where the upper
    ///    layers haven't fired yet.
    private func assertDashboardVisible(in app: XCUIApplication) {
        // ── Layer 1: stable native bridge identifier ──────────────────────────
        // waitForExistence blocks until the element appears or the full
        // dashboardTimeout expires — no busy-wait needed.
        let dashboardScreen = app.otherElements["goalsy.screen.dashboard"]
        if dashboardScreen.waitForExistence(timeout: dashboardTimeout) {
            // Sanity check: both identifiers should never co-exist.
            XCTAssertFalse(
                app.otherElements["goalsy.screen.signin"].exists,
                "goalsy.screen.signin co-exists with goalsy.screen.dashboard — " +
                "auth state bridge may have fired twice or in the wrong order."
            )
            return
        }

        // ── Layer 2: app-owned web data-testid ───────────────────────────────
        // Surfaced through Capacitor's WKWebView accessibility bridge as an
        // otherElement.  Immune to Clerk UI changes because it is set by the
        // app (AppShell's root div carries data-testid="AuthenticatedView").
        let authenticatedView = app.otherElements["AuthenticatedView"].firstMatch
        if authenticatedView.exists {
            return   // fast path — app-owned web identifier found
        }

        // ── Layer 3: structural / text fallbacks ─────────────────────────────
        // Reached only if neither bridge layer fired (e.g. WKScriptMessageHandler
        // not yet registered, or accessibility tree not yet flushed).
        let dashboardTextCandidates: [XCUIElement] = [
            app.tabBars.firstMatch,                     // authenticated app shell
            app.navigationBars.firstMatch,              // any nav bar past sign-in
            app.staticTexts["Goals"],
            app.staticTexts["Dashboard"],
            app.staticTexts["Home"],
            app.staticTexts["Overview"],
        ]

        var dashboardFound = false
        for candidate in dashboardTextCandidates where candidate.exists {
            dashboardFound = true
            break
        }

        XCTAssertTrue(
            dashboardFound,
            """
            Neither 'goalsy.screen.dashboard', 'AuthenticatedView', nor any
            structural dashboard element appeared within \(Int(dashboardTimeout))s
            after session restore.

            The app may be:
            • Stuck on a loading/splash screen (cookie inject timing issue)
            • Showing an error screen (FAPI rejected the session)
            • Navigating to an unexpected screen (check the accessibility tree)

            If the native bridge identifier never fires, verify that AppDelegate
            registered the 'goalsyAuthState' WKScriptMessageHandler (look for
            "[Goalsy:native] goalsyAuthState message handler registered" in the log)
            and that postAuthScreenToNative() is called from ApiClientBootstrap
            when isSignedIn resolves.

            Attach Safari Web Inspector immediately after running this test to inspect
            the WebView console for Clerk FAPI error details:
              Safari → Develop → [Simulator name] → Goalsy's WebView
            """
        )
    }
}
