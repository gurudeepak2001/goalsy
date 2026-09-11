import XCTest

final class BiometricUnlockSmokeTests: XCTestCase {
    private let dashboardIdentifier = "goalsy.screen.dashboard"
    private let unlockScreenIdentifier = "biometric-unlock-screen"
    private let startupTimeout: TimeInterval = 30

    override func setUp() {
        super.setUp()
        continueAfterFailure = false
    }

    /// Confirms a restored signed-in session reaches the JavaScript-to-native
    /// BiometricAuth availability call and renders the native simulator result.
    /// An unregistered or renamed plugin fails with "not implemented", which this
    /// assertion reports directly instead of allowing the release smoke job to pass.
    func testSavedSessionHandlesBiometricAvailabilityResult() {
        let app = XCUIApplication()
        app.launchEnvironment["GOALSY_UITEST_ENABLE_BIOMETRIC_LOCK"] = "1"
        app.launch()

        let unlockScreen = app.descendants(matching: .any)
            .matching(identifier: unlockScreenIdentifier)
            .firstMatch
        XCTAssertTrue(
            unlockScreen.waitForExistence(timeout: startupTimeout),
            "Biometric unlock screen did not appear. Ensure GOALSY_UITEST_CLERK_COOKIES contains a valid saved session."
        )

        let dashboard = app.descendants(matching: .any)
            .matching(identifier: dashboardIdentifier)
            .firstMatch
        XCTAssertFalse(
            dashboard.exists,
            "Dashboard appeared before the enabled biometric lock handled the native availability result."
        )

        let unimplementedError = app.staticTexts.matching(
            NSPredicate(format: "label CONTAINS[c] %@", "not implemented")
        ).firstMatch
        XCTAssertFalse(
            unimplementedError.exists,
            "BiometricAuth web-to-native call failed as an unimplemented plugin. Check plugin registration, jsName, and method names."
        )

        let handledNativeResult = app.buttons["Try again"].firstMatch
        XCTAssertTrue(
            handledNativeResult.waitForExistence(timeout: 5),
            "BiometricAuth.checkBiometry returned no handled lock state. The web layer may not be handling the plugin response."
        )
    }
}