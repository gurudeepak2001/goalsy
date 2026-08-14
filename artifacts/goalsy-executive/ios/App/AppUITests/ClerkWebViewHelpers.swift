/// ClerkWebViewHelpers.swift
///
/// Shared sign-in helpers for XCUITests that interact with Clerk's WebView
/// sign-in form.  Centralising the locators here means any Clerk markup change
/// only needs to be updated in one place.
///
/// ## Usage
///   try ClerkWebViewHelpers.signIn(app: app, email: email, password: password)
///
/// ## Locator philosophy
/// Each locator has a primary identifier (Clerk's current placeholder / label)
/// and a structural fallback (first field / first button of the expected type).
/// The fallback lets the rotation run survive a minor rename; the preflight
/// (`ClerkMarkupPreflight`) asserts the primary locator exists so regressions
/// are caught before a full rotation wastes 10+ minutes.

import XCTest

// MARK: - Locator constants

/// Single source of truth for every Clerk form label this test suite matches.
/// Update here when Clerk changes its markup; tests that import this file pick
/// up the change automatically.
enum ClerkSignInLocators {
    /// Placeholder text on the email / username input (Step 1).
    static let emailPlaceholder     = "Email address"
    /// Placeholder on the secure password input (Step 2).
    static let passwordPlaceholder  = "Password"
    /// Primary submit button label (both steps).
    static let continueButton       = "Continue"
    /// Alternative submit label some Clerk instances use on the final step.
    static let signInButton         = "Sign in"
    /// Native button on the app's WelcomeScreen that routes to /signin.
    static let welcomeSignInButton  = "Sign In"
}

// MARK: - Sign-in helpers

enum ClerkWebViewHelpers {

    // MARK: Navigation

    /// If the app is sitting on the WelcomeScreen (which shows a "Sign In"
    /// button), taps it so the Clerk /signin WebView becomes active.
    /// Safe to call even when the form is already visible — it will time out
    /// looking for the welcome button and return without action.
    static func navigateToSignInIfNeeded(in app: XCUIApplication) {
        // The welcome-screen "Sign In" button is a native React element rendered
        // in the WebView.  If it exists, tap it; if not (app is already on the
        // sign-in form or another screen) skip silently.
        let welcomeBtn = app.buttons[ClerkSignInLocators.welcomeSignInButton].firstMatch
        if welcomeBtn.waitForExistence(timeout: 4) {
            welcomeBtn.tap()
        }
    }

    // MARK: Full sign-in flow

    /// Drives Clerk's WebView sign-in form through its two-step flow:
    ///   Step 1 — enter email, tap Continue
    ///   Step 2 — enter password, tap Continue / Sign in
    ///
    /// Throws XCTSkip / calls XCTFail on missing elements so callers get
    /// actionable failure messages without additional boilerplate.
    static func signIn(
        app: XCUIApplication,
        email: String,
        password: String
    ) throws {
        // Navigate from WelcomeScreen to the Clerk form if needed.
        navigateToSignInIfNeeded(in: app)

        let webView = app.webViews.firstMatch

        // ── Step 1: email ─────────────────────────────────────────────────────
        XCTAssertTrue(
            webView.waitForExistence(timeout: 20),
            "WebView did not appear — is the app showing a sign-in screen?"
        )

        let emailField = resolveTextField(
            preferred: webView.textFields[ClerkSignInLocators.emailPlaceholder],
            fallback:  webView.textFields.firstMatch,
            context:   "email"
        )
        emailField.tap()
        emailField.typeText(email)

        tapContinueButton(in: webView)

        // ── Step 2: password ──────────────────────────────────────────────────
        let passwordField = resolveSecureTextField(
            preferred: webView.secureTextFields[ClerkSignInLocators.passwordPlaceholder],
            fallback:  webView.secureTextFields.firstMatch,
            context:   "password"
        )
        passwordField.tap()
        passwordField.typeText(password)

        tapContinueButton(in: webView)
    }

    // MARK: Button helper

    /// Taps the first visible Continue / Sign-in button inside `parent`.
    /// Tries the exact labels from `ClerkSignInLocators` before falling back to
    /// the first button in the element tree.
    static func tapContinueButton(in parent: XCUIElement) {
        let continueBtn = parent.buttons[ClerkSignInLocators.continueButton].firstMatch
        let signInBtn   = parent.buttons[ClerkSignInLocators.signInButton].firstMatch
        let firstBtn    = parent.buttons.firstMatch

        if continueBtn.waitForExistence(timeout: 5) {
            continueBtn.tap()
        } else if signInBtn.waitForExistence(timeout: 2) {
            signInBtn.tap()
        } else {
            XCTAssertTrue(
                firstBtn.waitForExistence(timeout: 2),
                "Could not find a '\(ClerkSignInLocators.continueButton)' or " +
                "'\(ClerkSignInLocators.signInButton)' button. " +
                "Clerk may have changed its button label — update ClerkSignInLocators.continueButton."
            )
            firstBtn.tap()
        }
    }

    // MARK: - Private resolution helpers

    private static func resolveTextField(
        preferred: XCUIElement,
        fallback:  XCUIElement,
        context:   String
    ) -> XCUIElement {
        if preferred.waitForExistence(timeout: 10) { return preferred }
        XCTAssertTrue(
            fallback.waitForExistence(timeout: 5),
            "Could not locate a \(context) text field in the sign-in WebView. " +
            "Clerk may have changed its placeholder — update ClerkSignInLocators."
        )
        return fallback
    }

    private static func resolveSecureTextField(
        preferred: XCUIElement,
        fallback:  XCUIElement,
        context:   String
    ) -> XCUIElement {
        if preferred.waitForExistence(timeout: 10) { return preferred }
        XCTAssertTrue(
            fallback.waitForExistence(timeout: 5),
            "Could not locate a \(context) secure text field in the sign-in WebView. " +
            "Clerk may have changed its placeholder — update ClerkSignInLocators."
        )
        return fallback
    }
}
