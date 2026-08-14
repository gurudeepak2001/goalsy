/// ClerkWebViewSignIn.swift
///
/// Single source of truth for every Clerk sign-in UI identifier used across
/// the AppUITests target.
///
/// ## Why this file exists
/// Clerk occasionally renames placeholders and button labels in its hosted
/// sign-in component.  Keeping all locators here means a markup change requires
/// exactly one edit — in this file — and every test that references these
/// constants picks up the fix automatically.
///
/// ## Usage
///   app.textFields[ClerkSignInLocators.emailPlaceholder]
///   app.secureTextFields[ClerkSignInLocators.passwordPlaceholder]
///   app.buttons[ClerkSignInLocators.continueButton]
///
/// See `ClerkWebViewHelpers.swift` for the interactive sign-in helper that
/// drives these locators through the full two-step Clerk form.

import XCTest

// MARK: - Locator constants

/// Single source of truth for every Clerk form label this test suite matches.
/// Update here when Clerk changes its markup; all tests that import this file
/// pick up the change automatically.
public enum ClerkSignInLocators {
    /// Placeholder text on the email / username input (Step 1).
    public static let emailPlaceholder     = "Email address"
    /// Placeholder on the secure password input (Step 2).
    public static let passwordPlaceholder  = "Password"
    /// Primary submit button label (both steps).
    public static let continueButton       = "Continue"
    /// Alternative submit label some Clerk instances use on the final step.
    public static let signInButton         = "Sign in"
    /// Native button on the app's WelcomeScreen that routes to /signin.
    public static let welcomeSignInButton  = "Sign In"
}
