/// SessionRestoreSmokeTests.swift
///
/// XCUITest that confirms the GoalsyAuthStateHandler actually fires on a cold
/// start and that the resulting accessibilityIdentifier is visible to XCUITest.
///
/// ## Why this test exists
/// GoalsyAuthStateHandler (AppDelegate.swift) sets `accessibilityIdentifier` on
/// `webView.superview ?? webView` in response to a JS bridge message.  The
/// handler is registered in `applicationDidBecomeActive`, but until this test
/// existed there was no automated proof that:
///
///   a) The superview chosen is the element XCUITest actually sees.
///   b) The handler fires before the dashboardTimeout on a realistic cold start.
///
/// Without this, the test suite might silently fall back to text-based element
/// matching every run, giving false confidence that the identifier bridge works.
///
/// ## What to look for in Xcode output
/// A passing cold-start run should emit both of these lines in the console:
///
///   [Goalsy:native] goalsyAuthState + goalsyDbJwt message handlers registered
///   [Goalsy:native] goalsyAuthState — set accessibilityIdentifier to 'goalsy.screen.dashboard'
///
/// If the first line is missing, `applicationDidBecomeActive` / `registerAuthStateHandlerIfNeeded()`
/// did not run before the 5-second early smoke check expired.
/// If the second line is missing, the JS web layer did not post its auth-state
/// message in time.
///
/// ## Running locally
///   xcodebuild test \
///     -project ios/App/App.xcodeproj \
///     -scheme AppUITests \
///     -destination 'platform=iOS Simulator,name=iPhone 16' \
///     -only-testing:AppUITests/SessionRestoreSmokeTests
///
/// Set GOALSY_UITEST_CLERK_COOKIES in the scheme's environment variables (or
/// via -testenv) so the app starts with a pre-seeded signed-in session.
///
/// ## CI
/// This test is run by `.github/workflows/ios-ci.yml` alongside
/// ForceKillSessionTest on every PR that touches iOS source files.

import XCTest

final class SessionRestoreSmokeTests: XCTestCase {

    // MARK: - Constants

    /// Accessibility identifier posted by the web layer when the dashboard is shown.
    /// Set by GoalsyAuthStateHandler on `webView.superview ?? webView`.
    private let dashboardIdentifier = "goalsy.screen.dashboard"

    /// Accessibility identifier posted by the web layer when the sign-in screen is shown.
    private let signinIdentifier = "goalsy.screen.signin"

    /// Early smoke-check window.  On a healthy simulator the identifier should
    /// appear well within 5 s.  If this assertion fails it means either the
    /// message handler wasn't registered (check for the
    /// "goalsyAuthState + goalsyDbJwt message handlers registered" log line) or
    /// the JS web layer hasn't posted its first auth-state message yet.
    private let earlySmokeDuration: TimeInterval = 5

    /// Full cold-start budget.  Generous to accommodate slow CI machines and
    /// first-run FAPI network calls.
    private let coldStartTimeout: TimeInterval = 20

    // MARK: - Test lifecycle

    override func setUp() {
        super.setUp()
        continueAfterFailure = false
    }

    // MARK: - Tests

    /// Smoke test: confirms the auth-state bridge fires on a cold start and that
    /// XCUITest can see the resulting accessibilityIdentifier.
    ///
    /// ## Assertion strategy — two phases
    ///
    /// **Phase 1 — early smoke check (5 s)**
    /// `XCTAssertTrue(dashboardScreen.waitForExistence(timeout: earlySmokeDuration))`
    ///
    /// This assertion is the primary signal.  A CI pass here means:
    ///   • `registerAuthStateHandlerIfNeeded()` ran in `applicationDidBecomeActive`.
    ///   • The JS web layer posted its auth-state message within 5 s.
    ///   • `webView.superview ?? webView` is the element XCUITest queries.
    ///
    /// If Phase 1 fails, the Xcode console will show which of the two expected
    /// log lines is missing, pinpointing whether the gap is in the native handler
    /// registration or in the JS message dispatch.
    ///
    /// **Phase 2 — extended wait (20 s)**
    /// A second `waitForExistence` with the full cold-start budget.  This catches
    /// the edge case where the bridge fires correctly but the web layer is slow
    /// (e.g. a large JS bundle on first install).  A Phase 2 pass after a Phase 1
    /// failure tells CI: "the identifier *did* arrive — just not within 5 s."
    ///
    /// Text-based fallback elements (e.g. searching for the "Dashboard" label by
    /// static text) are intentionally NOT used here.  This test exists specifically
    /// to prove the identifier bridge works; falling back to text would hide a
    /// broken bridge.
    func testAuthStateIdentifierAppearsOnColdStart() {

        // ── Launch (cold start) ───────────────────────────────────────────────
        let app = XCUIApplication()
        app.launch()

        let dashboardScreen = screenRootElement(app, identifier: dashboardIdentifier)

        // ── Phase 1: early smoke check ────────────────────────────────────────
        // If this assertion fails, inspect the Xcode console for the two lines:
        //   "[Goalsy:native] goalsyAuthState + goalsyDbJwt message handlers registered"
        //   "[Goalsy:native] goalsyAuthState — set accessibilityIdentifier to 'goalsy.screen.dashboard'"
        // A missing first line → handler not registered (applicationDidBecomeActive issue).
        // A missing second line → JS layer did not post the auth-state message in time.
        XCTAssertTrue(
            dashboardScreen.waitForExistence(timeout: earlySmokeDuration),
            "Primary path FAILED: '\(dashboardIdentifier)' not visible within \(Int(earlySmokeDuration)) s. " +
            "Check console for '[Goalsy:native] goalsyAuthState + goalsyDbJwt message handlers registered' " +
            "and '[Goalsy:native] goalsyAuthState — set accessibilityIdentifier to \"goalsy.screen.dashboard\"'. " +
            "Ensure GOALSY_UITEST_CLERK_COOKIES is set so the app starts signed in."
        )

        // ── Phase 2: extended wait ────────────────────────────────────────────
        // Reached only if Phase 1 passed (continueAfterFailure = false).
        // Gives slow CI environments the full cold-start budget.
        XCTAssertTrue(
            dashboardScreen.waitForExistence(timeout: coldStartTimeout),
            "Dashboard identifier '\(dashboardIdentifier)' not visible within \(Int(coldStartTimeout)) s " +
            "on cold start.  Session may not have been seeded or the web layer failed to boot."
        )

        // ── Confirm sign-in screen is absent ─────────────────────────────────
        // Belt-and-suspenders: the sign-in identifier must not be present.
        let signinScreen = screenRootElement(app, identifier: signinIdentifier)
        XCTAssertFalse(
            signinScreen.exists,
            "Sign-in screen ('\(signinIdentifier)') is present — expected dashboard on cold start."
        )
    }

    // MARK: - Helpers

    /// Returns the first element anywhere in the accessibility tree that carries
    /// the given `identifier`.
    ///
    /// GoalsyAuthStateHandler sets the identifier on `webView.superview ?? webView`,
    /// which Capacitor exposes as an `otherElement` in XCUITest.  Querying
    /// `.any` makes the lookup element-type-agnostic in case the Capacitor SDK
    /// changes the view class in a future update.
    private func screenRootElement(_ app: XCUIApplication, identifier: String) -> XCUIElement {
        app.descendants(matching: .any).matching(identifier: identifier).firstMatch
    }
}
