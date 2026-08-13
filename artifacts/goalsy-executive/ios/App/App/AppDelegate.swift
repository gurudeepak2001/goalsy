import UIKit
import Capacitor
import WebKit

@UIApplicationMain
class AppDelegate: UIResponder, UIApplicationDelegate {

    var window: UIWindow?

    // UserDefaults key for the serialised cookie snapshot.
    private let clerkCookieKey = "cm_clerk_cookies_v2"

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
        restoreClerkCookies()
        return true
    }

    func applicationDidEnterBackground(_ application: UIApplication) {
        // Request extra background execution time so getAllCookies() — which is
        // async — can complete before iOS suspends the process.
        let taskId = application.beginBackgroundTask(withName: "GoalsySaveClerkCookies") { }
        saveClerkCookies {
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

    // MARK: - Clerk cookie persistence

    /// Reads every cookie from the WebView's native cookie jar whose domain
    /// contains "clerk" or ".accounts.dev" and snapshots them to UserDefaults.
    ///
    /// Uses `WKWebView.configuration.websiteDataStore.httpCookieStore` on the
    /// live WebView instance so we are reading exactly the same cookie jar
    /// that Clerk's FAPI calls use — including httpOnly, cross-origin cookies
    /// that are permanently invisible to JavaScript.
    private func saveClerkCookies(completion: @escaping () -> Void = {}) {
        // Walk the view-controller hierarchy to reach the Capacitor WebView.
        let cookieStore: WKHTTPCookieStore
        if let bridgeVC = window?.rootViewController as? CAPBridgeViewController,
           let wv = bridgeVC.webView {
            cookieStore = wv.configuration.websiteDataStore.httpCookieStore
            NSLog("[Goalsy:native] saveClerkCookies — reading from live WKWebView cookie store")
        } else {
            // Fallback: use the shared default store (same underlying store when
            // Capacitor uses WKWebsiteDataStore.default(), which it does by default).
            cookieStore = WKWebsiteDataStore.default().httpCookieStore
            NSLog("[Goalsy:native] saveClerkCookies — WebView not found, using default store")
        }

        cookieStore.getAllCookies { [weak self] cookies in
            guard let self = self else { completion(); return }

            let clerkCookies = cookies.filter {
                $0.domain.contains("clerk") || $0.domain.contains(".accounts.dev")
            }

            NSLog("[Goalsy:native] Found %d Clerk cookies in cookie store (total cookies: %d)",
                  clerkCookies.count, cookies.count)

            let serialisable: [[String: Any]] = clerkCookies.compactMap { c in
                var d: [String: Any] = [
                    "name":       c.name,
                    "value":      c.value,
                    "domain":     c.domain,
                    "path":       c.path,
                    "isSecure":   c.isSecure,
                    "isHTTPOnly": c.isHTTPOnly,
                ]
                if let exp = c.expiresDate {
                    d["expires"] = exp.timeIntervalSince1970
                }
                return d
            }

            if let data = try? JSONSerialization.data(withJSONObject: serialisable) {
                UserDefaults.standard.set(data, forKey: self.clerkCookieKey)
                UserDefaults.standard.synchronize()
                NSLog("[Goalsy:native] Saved %d Clerk cookies to UserDefaults:", clerkCookies.count)
                for c in clerkCookies {
                    NSLog("[Goalsy:native]   %@ | domain: %@ | httpOnly: %d | secure: %d | expires: %@",
                          c.name, c.domain, c.isHTTPOnly ? 1 : 0, c.isSecure ? 1 : 0,
                          c.expiresDate?.description ?? "session")
                }
            } else {
                NSLog("[Goalsy:native] ERROR: Failed to serialise Clerk cookies")
            }

            completion()
        }
    }

    /// Reconstructs previously saved Clerk cookies and injects them into
    /// `WKWebsiteDataStore.default().httpCookieStore` before the WebView loads.
    ///
    /// Called synchronously from `application(_:didFinishLaunchingWithOptions:)`.
    /// The `setCookie` calls are asynchronous but complete in milliseconds — well
    /// before WKWebView finishes parsing index.html and JavaScript begins running,
    /// so Clerk's first FAPI call already has the session cookies available.
    ///
    /// Note: the WKWebView instance does not exist yet at this point (it is
    /// created by CAPBridgeViewController.viewDidLoad, which runs after this
    /// method returns).  WKWebsiteDataStore.default() is the same underlying
    /// store — Capacitor does not override the data store configuration.
    private func restoreClerkCookies() {
        guard
            let data  = UserDefaults.standard.data(forKey: clerkCookieKey),
            let array = try? JSONSerialization.jsonObject(with: data) as? [[String: Any]],
            !array.isEmpty
        else {
            NSLog("[Goalsy:native] restoreClerkCookies — no saved cookies (first launch or cleared)")
            return
        }

        NSLog("[Goalsy:native] restoreClerkCookies — injecting %d cookies into WKHTTPCookieStore before WebView load", array.count)

        let store = WKWebsiteDataStore.default().httpCookieStore

        for props in array {
            guard
                let name   = props["name"]   as? String,
                let value  = props["value"]  as? String,
                let domain = props["domain"] as? String,
                let path   = props["path"]   as? String
            else { continue }

            var cookieProps: [HTTPCookiePropertyKey: Any] = [
                .name: name, .value: value, .domain: domain, .path: path,
            ]
            if let isSecure = props["isSecure"] as? Bool, isSecure {
                cookieProps[.secure] = "TRUE"
            }
            // Restore the original expiry when present.
            // Session cookies (no expiry) get a 30-day synthetic expiry so they
            // survive future force-kills without requiring a new sign-in.
            if let ts = props["expires"] as? Double, ts > Date().timeIntervalSince1970 {
                cookieProps[.expires] = Date(timeIntervalSince1970: ts)
            } else {
                cookieProps[.expires] = Date(timeIntervalSinceNow: 30 * 24 * 60 * 60)
            }

            if let cookie = HTTPCookie(properties: cookieProps) {
                store.setCookie(cookie) {
                    NSLog("[Goalsy:native]   restored: %@ | domain: %@", name, domain)
                }
            } else {
                NSLog("[Goalsy:native]   WARN: could not reconstruct cookie: %@ on %@", name, domain)
            }
        }
    }
}
