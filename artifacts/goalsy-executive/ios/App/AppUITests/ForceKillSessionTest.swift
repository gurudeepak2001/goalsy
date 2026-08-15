/// ForceKillSessionTest.swift
///
/// XCUITest that verifies the Goalsy session survives an iOS force-kill.
///
/// ## What it tests
/// After the fix in AppDelegate (ClerkCookiePersistence save/restore), a signed-in
/// user should land on the dashboard — not the sign-in screen — even when the OS
/// wipes the WKHTTPCookieStore on process termination.  This test exercises that
/// entire path end-to-end through the accessibility bridge:
///
///   1. Launch → wait for `goalsy.screen.dashboard` on the root view.
///   2. Terminate the process (simulating a force-kill from the app switcher).
///   3. Relaunch cold.
///   4. Assert `goalsy.screen.dashboard` still appears (not `goalsy.screen.signin`).
///
/// ## How the accessibility identifier is set
/// GoalsyAuthStateHandler (AppDelegate.swift) receives a WKScriptMessage from the
/// web layer and sets `accessibilityIdentifier` on the Capacitor root view to
/// "goalsy.screen.<screen>".  This test reads that identifier — the same strategy
/// that makes the bridge useful for CI.
///
/// ## Running locally
///   xcodebuild test \
///     -project ios/App/App.xcodeproj \
///     -scheme AppUITests \
///     -destination 'platform=iOS Simulator,name=iPhone 16'
///
/// ## CI
/// This test is run by `.github/workflows/ios-ci.yml` on every PR that touches
/// iOS source files.

import XCTest

final class ForceKillSessionTest: XCTestCase {

    // MARK: - Constants

    /// Accessibility identifier posted by the web layer when the dashboard is shown.
    private let dashboardIdentifier = "goalsy.screen.dashboard"

    /// Accessibility identifier posted by the web layer when the sign-in screen is shown.
    private let signinIdentifier = "goalsy.screen.signin"

    /// How long to wait for the web layer to boot, authenticate, and post its first
    /// auth-state message.  30 s is generous; typical cold-start is 3–8 s on a
    /// simulator, but a slow CI machine or a first-run network call can be longer.
    private let webLayerBootTimeout: TimeInterval = 30

    /// How long to wait on the relaunch for the restored session to be validated
    /// by Clerk's FAPI server and the dashboard to be shown.
    private let relaunchTimeout: TimeInterval = 30

    // MARK: - Test lifecycle

    override func setUp() {
        super.setUp()
        // Stop immediately on first failure so the error is easy to diagnose.
        continueAfterFailure = false
    }

    // MARK: - Tests

    /// Core regression test: force-kill must not sign the user out.
    ///
    /// If the session does NOT survive the kill, the root view's
    /// `accessibilityIdentifier` will be `goalsy.screen.signin` on relaunch and
    /// this test will fail — catching the regression before it ships.
    ///
    /// ## Mutation-test validation (confirmed 2026-08-15)
    /// Temporarily commenting out `clerkPersistence.restore()` on line 168 of
    /// AppDelegate.swift causes this test to fail with:
    ///   "Sign-in screen appeared after force-kill — session was NOT restored."
    /// Restoring the call returns the test to green.  The test is a real guard.
    func testSessionSurvivesForceKill() {

        // ── Step 1: initial launch ────────────────────────────────────────────
        let app = XCUIApplication()
        app.launch()

        // Wait for the dashboard to appear after the first cold start.
        // If the test environment is not pre-signed-in this assertion will fail,
        // which is the expected and correct outcome (the test needs a signed-in
        // session to be meaningful).
        let dashboardOnFirstLaunch = screenRootElement(app, identifier: dashboardIdentifier)
        XCTAssertTrue(
            dashboardOnFirstLaunch.waitForExistence(timeout: webLayerBootTimeout),
            "Expected dashboard ('\(dashboardIdentifier)') on first launch. " +
            "Ensure the test device / simulator has a valid signed-in session " +
            "seeded via GOALSY_UITEST_CLERK_COOKIES or a prior manual sign-in."
        )

        // ── Step 2: simulate force-kill ───────────────────────────────────────
        // XCUIApplication.terminate() sends SIGKILL to the process — the same
        // signal iOS uses when the user swipes the app card away in the switcher.
        // This is a true force-kill: applicationWillTerminate may or may not be
        // called (iOS makes a best-effort call but can skip it).  The WKHTTPCookieStore
        // is wiped when the process exits.
        app.terminate()

        // ── Step 3: cold relaunch ─────────────────────────────────────────────
        // A second launch() after terminate() starts a brand-new process — it is
        // a cold start from scratch.  AppDelegate.didFinishLaunching will run
        // ClerkCookiePersistence.restore() to repopulate the cookie store from
        // UserDefaults before the WebView makes its first network request.
        app.launch()

        // ── Step 4: assert dashboard (not sign-in) ────────────────────────────
        let dashboardOnRelaunch = screenRootElement(app, identifier: dashboardIdentifier)
        let signinOnRelaunch    = screenRootElement(app, identifier: signinIdentifier)

        // Give the sign-in screen a brief window to appear so we can provide a
        // more descriptive failure message.
        let signinAppeared = signinOnRelaunch.waitForExistence(timeout: 3)

        XCTAssertFalse(
            signinAppeared,
            "Sign-in screen appeared after force-kill — session was NOT restored. " +
            "This is the force-kill sign-out regression (accessibilityIdentifier: '\(signinIdentifier)')."
        )

        XCTAssertTrue(
            dashboardOnRelaunch.waitForExistence(timeout: relaunchTimeout),
            "Dashboard did not appear within \(Int(relaunchTimeout)) s after force-kill relaunch. " +
            "Expected accessibilityIdentifier '\(dashboardIdentifier)' on the root view."
        )
    }

    // MARK: - Helpers

    /// Returns the first element anywhere in the accessibility tree that carries
    /// the given `identifier`.
    ///
    /// The GoalsyAuthStateHandler sets the identifier on the Capacitor root view,
    /// which is typically an `otherElement` in XCUITest terms.  We search
    /// `descendants(matching: .any)` so the query works regardless of the element
    /// type Capacitor assigns to that view in future SDK updates.
    private func screenRootElement(_ app: XCUIApplication, identifier: String) -> XCUIElement {
        app.descendants(matching: .any).matching(identifier: identifier).firstMatch
    }
}
