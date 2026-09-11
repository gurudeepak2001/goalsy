import Capacitor
import XCTest
@testable import App

@MainActor
final class BiometricAuthRegistrationTests: XCTestCase {
    private let pluginName = "BiometricAuth"

    func testBiometricAuthExportsJavaScriptBridgeMethods() {
        let plugin = BiometricAuthPlugin()
        let methodsByName = Dictionary(
            uniqueKeysWithValues: plugin.pluginMethods.map { ($0.name, $0.selector) }
        )

        XCTAssertEqual(
            Set(methodsByName.keys),
            Set(["checkBiometry", "authenticate"]),
            "\(pluginName) must export the JavaScript methods used by the Face ID unlock flow"
        )

        for methodName in ["checkBiometry", "authenticate"] {
            guard let selector = methodsByName[methodName] else {
                continue
            }
            XCTAssertTrue(
                plugin.responds(to: selector),
                "\(pluginName).\(methodName) must resolve to an implemented native bridge method"
            )
        }
    }

    func testStoryboardStartupRegistersBiometricAuthOnCapacitorBridge() throws {
        let appDelegate: App.AppDelegate = try XCTUnwrap(
            UIApplication.shared.delegate as? App.AppDelegate,
            "The AppTests host must launch through AppDelegate"
        )
        let mainViewController: App.MainViewController = try XCTUnwrap(
            appDelegate.window?.rootViewController as? App.MainViewController,
            "Main.storyboard must create MainViewController so capacitorDidLoad runs"
        )

        mainViewController.loadViewIfNeeded()

        let bridge: CAPBridgeProtocol = try XCTUnwrap(
            mainViewController.bridge,
            "The storyboard launch must create a Capacitor bridge"
        )
        XCTAssertNotNil(
            bridge.plugin(withName: pluginName),
            "\(pluginName) must be registered during the normal storyboard startup path"
        )
    }

    func testDidBecomeActiveRegistersBiometricAuthWhenStoryboardHookIsUnavailable() throws {
        let appDelegate: App.AppDelegate = try XCTUnwrap(
            UIApplication.shared.delegate as? App.AppDelegate,
            "The AppTests host must launch through AppDelegate"
        )
        let originalRootViewController = appDelegate.window?.rootViewController
        defer {
            appDelegate.window?.rootViewController = originalRootViewController
        }

        let fallbackViewController = CAPBridgeViewController()
        appDelegate.window?.rootViewController = fallbackViewController
        fallbackViewController.loadViewIfNeeded()

        let bridge: CAPBridgeProtocol = try XCTUnwrap(
            fallbackViewController.bridge,
            "The fallback controller must create a Capacitor bridge"
        )
        XCTAssertNil(
            bridge.plugin(withName: pluginName),
            "A plain CAPBridgeViewController should not register the app's custom plugin itself"
        )

        appDelegate.applicationDidBecomeActive(UIApplication.shared)

        XCTAssertNotNil(
            bridge.plugin(withName: pluginName),
            "\(pluginName) must be registered by the foreground lifecycle fallback"
        )
    }
}