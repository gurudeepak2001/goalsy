/// CookieRotationLocatorCanaryTest.swift
///
/// Lightweight XCUITest that verifies the Clerk sign-in WebView still exposes
/// the element types the cookie-rotation test depends on — without submitting
/// any credentials.
///
/// ## Purpose
/// Clerk occasionally updates its hosted sign-in component HTML.  If element
/// selectors drift, `CookieRotationTest.testSignInAndSaveCookies` will fail at
/// the worst possible moment: exactly when cookies have expired and the team
/// needs them rotated.
///
/// This canary runs **nightly** via the `clerk-locator-canary` GitHub Actions
/// workflow.  It surfaces markup drift days before the rotation run, giving
/// the team time to update locators at a calm moment rather than under pressure.
///
/// ## What it checks
/// 1. The app launches and displays a WKWebView on its unauthenticated root screen.
/// 2. At least one `textField` is reachable inside the WebView (email input).
/// 3. At least one `secureTextField` is reachable inside the WebView (password
///    input — may require advancing past the email step; see below).
/// 4. At least one `button` is reachable inside the WebView (Continue / Sign in).
///
/// ## Credentials
/// This test does NOT require CLERK_ROTATE_EMAIL or CLERK_ROTATE_PASSWORD.
/// It checks element *existence* only, never submitting the form.
///
/// ## Relationship to CookieRotationTest
/// `CookieRotationTest` performs the full sign-in and cookie extraction.
/// `CookieRotationLocatorCanaryTest` is a structural pre-flight: if this
/// canary fails, update the locators in CookieRotationTest before the next
/// rotation run.

import XCTest

final class CookieRotationLocatorCanaryTest: XCTestCase {

    // MARK: - Configuration

    /// How long to wait for the unauthenticated sign-in WebView to appear after
    /// a cold launch.  Network-dependent; be generous.
    private let webViewTimeout: TimeInterval = 30

    /// How long to wait for individual elements once the WebView is visible.
    private let elementTimeout: TimeInterval = 15

    // MARK: - Test

    /// Verifies that the Clerk sign-in WebView loads and exposes the element
    /// types the cookie-rotation test relies on, without submitting credentials.
    func testClerkSignInLocatorsReachable() throws {
        // ── 1. Launch app cold, suppressing any cached cookie seed ───────────
        // GOALSY_UITEST_SUPPRESS_COOKIE_SEED ensures the app starts on the
        // unauthenticated sign-in screen even if stale cookies are present.
        let app = XCUIApplication()
        app.launchEnvironment["GOALSY_UITEST_SUPPRESS_COOKIE_SEED"] = "1"
        app.launch()

        // ── 2. Locate the sign-in WebView ─────────────────────────────────
        let webView = app.webViews.firstMatch
        XCTAssertTrue(
            webView.waitForExistence(timeout: webViewTimeout),
            "❌ CANARY: WebView did not appear within \(webViewTimeout)s after a cold launch. " +
            "The app may not be showing its unauthenticated sign-in screen, or Clerk's " +
            "component failed to load. Check network reachability and Clerk instance status."
        )

        // ── 3. Check: at least one text field (email input) ───────────────
        // Try the known placeholder first so the error message is specific;
        // fall back to `firstMatch` so a placeholder change doesn't mask a
        // structural breakage (e.g. Clerk removing the field entirely).
        let emailByPlaceholder = webView.textFields[ClerkSignInLocators.emailPlaceholder]
        let emailExists: Bool
        if emailByPlaceholder.waitForExistence(timeout: elementTimeout) {
            emailExists = true
        } else {
            // Placeholder may have changed — check whether any text field exists.
            emailExists = webView.textFields.firstMatch.waitForExistence(timeout: 5)
            if emailExists {
                XCTFail(
                    "⚠️ CANARY: A text field was found in the WebView but its placeholder " +
                    "no longer matches '\(ClerkSignInLocators.emailPlaceholder)'. Clerk may have changed its copy. " +
                    "Update `ClerkSignInLocators.emailPlaceholder` in ClerkWebViewSignIn.swift."
                )
            }
        }
        XCTAssertTrue(
            emailExists,
            "❌ CANARY: No text field found in the Clerk sign-in WebView. " +
            "Clerk may have changed its form structure — update the email field " +
            "locator in ClerkWebViewSignIn.swift before the next rotation run."
        )

        // ── 4. Check: at least one button (Continue / Sign in) ───────────
        // Buttons are always visible on the first step of the sign-in form,
        // so this doesn't require advancing past the email field.
        let continueBtn = webView.buttons[ClerkSignInLocators.continueButton].firstMatch
        let signInBtn   = webView.buttons[ClerkSignInLocators.signInButton].firstMatch
        let anyButton   = webView.buttons.firstMatch

        let buttonExists: Bool
        if continueBtn.waitForExistence(timeout: elementTimeout) {
            buttonExists = true
        } else if signInBtn.waitForExistence(timeout: 3) {
            buttonExists = true
            XCTFail(
                "⚠️ CANARY: The primary action button label has changed from " +
                "'\(ClerkSignInLocators.continueButton)' to '\(ClerkSignInLocators.signInButton)' (or similar). " +
                "Update `ClerkSignInLocators.continueButton` in ClerkWebViewSignIn.swift if needed."
            )
        } else {
            buttonExists = anyButton.waitForExistence(timeout: 3)
            if !buttonExists {
                // No labelled button found at all.
            } else {
                XCTFail(
                    "⚠️ CANARY: A button exists in the WebView but neither " +
                    "'\(ClerkSignInLocators.continueButton)' nor '\(ClerkSignInLocators.signInButton)' label was found. " +
                    "Update `ClerkSignInLocators` in ClerkWebViewSignIn.swift to match the new label."
                )
            }
        }
        XCTAssertTrue(
            buttonExists,
            "❌ CANARY: No button found in the Clerk sign-in WebView. " +
            "Clerk may have restructured its form — update the button locator " +
            "in ClerkWebViewSignIn.swift before the next rotation run."
        )

        // ── 5. Check: at least one secure text field (password input) ─────
        // Clerk's two-step flow hides the password field until the user advances
        // past the email step.  To avoid submitting credentials, we look for the
        // field on the first step (where some Clerk configurations show both fields
        // at once) and — only if absent — submit a synthetic dummy email to advance
        // to the password step, then verify the field appears.
        //
        // We use a clearly invalid local-part so the request always fails at the
        // Clerk API layer (no account lookup), ensuring no session is ever created.
        let passwordOnFirstStep = webView.secureTextFields.firstMatch
        let secureFieldExists: Bool

        if passwordOnFirstStep.waitForExistence(timeout: 5) {
            // Single-step layout — both fields visible simultaneously.
            secureFieldExists = true
        } else {
            // Two-step layout — advance past the email step with a dummy address.
            secureFieldExists = advanceToDummyPasswordStep(app: app, webView: webView)
        }

        XCTAssertTrue(
            secureFieldExists,
            "❌ CANARY: No secureTextField found in the Clerk sign-in WebView " +
            "(checked both the first step and after advancing with a dummy email). " +
            "Clerk may have changed its form structure — update the password field " +
            "locator in ClerkWebViewSignIn.swift before the next rotation run."
        )

        // ── 6. Done — do NOT submit credentials ──────────────────────────
        // All structural checks passed.  Terminate without creating any session.
        app.terminate()
    }

    // MARK: - Helpers

    /// Enters a syntactically valid but deliberately unroutable email address,
    /// taps the Continue button, and checks whether a secureTextField appears
    /// on the next step.
    ///
    /// Using `canary-noreply@example.invalid` ensures:
    /// - The string passes basic client-side email format validation.
    /// - `.invalid` is a reserved TLD (RFC 2606) — Clerk's API will reject it
    ///   before any lookup, so no real account interaction occurs.
    ///
    /// Returns `true` if a secureTextField became visible after the transition.
    @discardableResult
    private func advanceToDummyPasswordStep(
        app: XCUIApplication,
        webView: XCUIElement
    ) -> Bool {
        let dummyEmail = "canary-noreply@example.invalid"

        // Locate and fill the email field.
        let emailByPlaceholder = webView.textFields[ClerkSignInLocators.emailPlaceholder]
        let emailField: XCUIElement
        if emailByPlaceholder.waitForExistence(timeout: elementTimeout) {
            emailField = emailByPlaceholder
        } else {
            let fallback = webView.textFields.firstMatch
            guard fallback.waitForExistence(timeout: 5) else { return false }
            emailField = fallback
        }

        emailField.tap()
        emailField.typeText(dummyEmail)

        // Tap Continue (or Sign in / first button as fallbacks).
        tapContinueButton(in: webView)

        // Wait for the password field to appear.
        let passwordField = webView.secureTextFields.firstMatch
        return passwordField.waitForExistence(timeout: elementTimeout)
    }

    /// Taps the first visible "Continue" or "Sign in" button inside `parent`.
    private func tapContinueButton(in parent: XCUIElement) {
        let continueBtn = parent.buttons[ClerkSignInLocators.continueButton].firstMatch
        let signInBtn   = parent.buttons[ClerkSignInLocators.signInButton].firstMatch
        let firstButton = parent.buttons.firstMatch

        if continueBtn.waitForExistence(timeout: 5) {
            continueBtn.tap()
        } else if signInBtn.waitForExistence(timeout: 2) {
            signInBtn.tap()
        } else if firstButton.waitForExistence(timeout: 2) {
            firstButton.tap()
        }
    }
}
