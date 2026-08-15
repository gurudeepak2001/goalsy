import UIKit
import Capacitor
import WebKit

// ── GoalsyAuthStateHandler ────────────────────────────────────────────────────
// WKScriptMessageHandler that receives auth-state messages posted by the web
// layer (App.tsx → postAuthScreenToNative) and sets a stable
// accessibilityIdentifier on the Capacitor root view so XCUITest can assert on
// "goalsy.screen.dashboard" / "goalsy.screen.signin" instead of fragile text.
//
// Registered under the handler name "goalsyAuthState".  The WKWebView holds a
// strong reference to message handlers, so we use the weak-delegate pattern
// (GoalsyAuthStateHandlerProxy) to avoid a retain cycle with AppDelegate.
private final class GoalsyAuthStateHandler: NSObject, WKScriptMessageHandler {
    // The view whose accessibilityIdentifier we update on each auth-state change.
    // AppDelegate sets this once the Capacitor root view is available.
    weak var targetView: UIView?

    func userContentController(
        _ userContentController: WKUserContentController,
        didReceive message: WKScriptMessage
    ) {
        guard let body = message.body as? [String: Any],
              let screen = body["screen"] as? String else {
            NSLog("[Goalsy:native] goalsyAuthState — unexpected message body: %@", "\(message.body)")
            return
        }
        let identifier = "goalsy.screen.\(screen)"
        DispatchQueue.main.async { [weak self] in
            self?.targetView?.accessibilityIdentifier = identifier
            NSLog("[Goalsy:native] goalsyAuthState — set accessibilityIdentifier to '%@'", identifier)
        }
    }
}

/// Proxy wrapper held by WKUserContentController to break the retain cycle.
/// WKUserContentController strongly retains its message handlers; this proxy
/// holds only a weak reference to the real handler so the handler (and anything
/// it holds) can be deallocated normally.
private final class GoalsyAuthStateHandlerProxy: NSObject, WKScriptMessageHandler {
    weak var target: GoalsyAuthStateHandler?
    init(_ target: GoalsyAuthStateHandler) { self.target = target }

    func userContentController(
        _ userContentController: WKUserContentController,
        didReceive message: WKScriptMessage
    ) {
        target?.userContentController(userContentController, didReceive: message)
    }
}

@UIApplicationMain
class AppDelegate: UIResponder, UIApplicationDelegate {

    var window: UIWindow?

    // Auth-state bridge: set up once when Capacitor's WKWebView is available.
    private let authStateHandler = GoalsyAuthStateHandler()
    private var authHandlerRegistered = false

    /// Handles the Clerk cookie backup/restore round-trip.
    /// Instantiated once; AppDelegate supplies the live Capacitor cookie store
    /// via the `cookieStoreProvider` closure so the logic stays testable.
    private lazy var clerkPersistence: ClerkCookiePersistence = {
        ClerkCookiePersistence(
            defaults: .standard,
            key: "cm_clerk_cookies_v2",
            cookieStoreProvider: { [weak self] in
                // Prefer the live Capacitor WebView's store so httpOnly cookies
                // that are invisible to JavaScript are included in the backup.
                if let bridgeVC = self?.window?.rootViewController as? CAPBridgeViewController,
                   let wv = bridgeVC.webView {
                    NSLog("[Goalsy:native] saveClerkCookies — reading from live WKWebView cookie store")
                    return wv.configuration.websiteDataStore.httpCookieStore
                }
                // Fallback: the shared default store (same underlying store when
                // Capacitor uses WKWebsiteDataStore.default(), which it does by default).
                NSLog("[Goalsy:native] saveClerkCookies — WebView not found, using default store")
                return WKWebsiteDataStore.default().httpCookieStore
            }
        )
    }()

    // MARK: - UIApplicationDelegate lifecycle

    func application(
        _ application: UIApplication,
        didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]?
    ) -> Bool {
        // ── XCUITest cookie seeding ───────────────────────────────────────────
        // When running under an XCUITest scheme the test harness may pass
        // pre-serialised Clerk cookies via the GOALSY_UITEST_CLERK_COOKIES
        // launch-environment key.  Writing them into UserDefaults here lets the
        // normal ClerkCookiePersistence.restore() path below pick them up as if
        // they had been saved by a prior backgrounding — so the test can verify
        // that the restored cookies are still accepted by Clerk's FAPI server
        // without having to go through a real sign-in flow inside the test runner.
        //
        // This block is unreachable in production: the key is never set by the
        // app itself and ProcessInfo.environment is read-only at runtime.
        if let cookiesJSON = ProcessInfo.processInfo.environment["GOALSY_UITEST_CLERK_COOKIES"],
           let data = cookiesJSON.data(using: .utf8) {
            UserDefaults.standard.set(data, forKey: "cm_clerk_cookies_v2")
            UserDefaults.standard.synchronize()
            NSLog("[Goalsy:native] XCUITest seed — wrote GOALSY_UITEST_CLERK_COOKIES to UserDefaults (%d bytes)", data.count)
        }

        // ── Normal restore ────────────────────────────────────────────────────
        // Restore Clerk session cookies into WKHTTPCookieStore BEFORE the WebView
        // makes its first network request.  Force-kill wipes WKHTTPCookieStore
        // entirely; UserDefaults survives it.  Without the __client cookie on
        // Clerk's domain, FAPI creates a brand-new empty client on every cold
        // start — injecting the saved cookies here lets FAPI recognise the
        // existing authenticated client and return the live session.
        clerkPersistence.restore()
        return true
    }

    func applicationDidEnterBackground(_ application: UIApplication) {
        // Request extra background execution time so getAllCookies() — which is
        // async — can complete before iOS suspends the process.
        let taskId = application.beginBackgroundTask(withName: "GoalsySaveClerkCookies") { }
        clerkPersistence.save {
            application.endBackgroundTask(taskId)
        }
    }

    func applicationWillResignActive(_ application: UIApplication) {}
    func applicationWillEnterForeground(_ application: UIApplication) {}

    func applicationDidBecomeActive(_ application: UIApplication) {
        // Register the auth-state script-message handler the first time the
        // Capacitor WKWebView is available (i.e. after viewDidLoad has run).
        // applicationDidBecomeActive is the earliest reliable point where
        // CAPBridgeViewController.webView is non-nil.
        registerAuthStateHandlerIfNeeded()
    }

    func applicationWillTerminate(_ application: UIApplication) {
        // applicationDidEnterBackground fires when the user opens the app switcher,
        // so cookies are usually already saved by the time they swipe the card.
        // This is a belt-and-suspenders save for the rare case where the process
        // is terminated without a prior background transition (e.g. force-kill
        // directly from the foreground on older iOS versions).
        // We block the main thread for up to 4 s so getAllCookies() — which is
        // async — has time to complete before iOS sends SIGKILL (~5 s budget).
        let sema = DispatchSemaphore(value: 0)
        clerkPersistence.save { sema.signal() }
        _ = sema.wait(timeout: .now() + 4)
    }

    // MARK: - Auth-state accessibility bridge

    /// Registers the GoalsyAuthStateHandler on the Capacitor WKWebView's
    /// userContentController exactly once.  Safe to call repeatedly — the
    /// `authHandlerRegistered` flag prevents double-registration (which would
    /// crash with a WKWebView "handler already registered" assertion).
    private func registerAuthStateHandlerIfNeeded() {
        guard !authHandlerRegistered,
              let bridgeVC = window?.rootViewController as? CAPBridgeViewController,
              let webView = bridgeVC.webView else { return }

        // Point the handler at Capacitor's root view so the identifier is
        // always visible at the top of the accessibility tree.
        authStateHandler.targetView = webView.superview ?? webView

        // Use the proxy to break the retain cycle: WKUserContentController
        // holds a strong ref to its handlers; the proxy holds only a weak ref
        // back to authStateHandler, letting both be deallocated normally.
        let proxy = GoalsyAuthStateHandlerProxy(authStateHandler)
        webView.configuration.userContentController.add(proxy, name: "goalsyAuthState")
        authHandlerRegistered = true
        NSLog("[Goalsy:native] goalsyAuthState message handler registered")
    }

    func application(_ app: UIApplication, open url: URL,
                     options: [UIApplication.OpenURLOptionsKey: Any] = [:]) -> Bool {
        return ApplicationDelegateProxy.shared.application(app, open: url, options: options)
    }

    func application(_ application: UIApplication,
                     continue userActivity: NSUserActivity,
                     restorationHandler: @escaping ([UIUserActivityRestoring]?) -> Void) -> Bool {
        return ApplicationDelegateProxy.shared.application(
            application, continue: userActivity, restorationHandler: restorationHandler)
    }
}
