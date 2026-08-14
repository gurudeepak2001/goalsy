import UIKit
import Capacitor
import WebKit

@UIApplicationMain
class AppDelegate: UIResponder, UIApplicationDelegate {

    var window: UIWindow?

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
    func applicationDidBecomeActive(_ application: UIApplication) {}
    func applicationWillTerminate(_ application: UIApplication) {}

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
