import UIKit
import Capacitor
import WebKit

@UIApplicationMain
class AppDelegate: UIResponder, UIApplicationDelegate {

    var window: UIWindow?

    // UserDefaults key for the serialised WKHTTPCookieStore snapshot.
    private let clerkCookieStoreKey = "cm_clerk_cookies_v2"

    // MARK: - UIApplicationDelegate

    func application(
        _ application: UIApplication,
        didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]?
    ) -> Bool {
        // Restore WKHTTPCookieStore cookies for Clerk / FAPI domains BEFORE the
        // WebView loads its first URL.  Force-kill wipes WKHTTPCookieStore entirely;
        // UserDefaults (backed by the iOS data protection container) survives it.
        // Without the __client cookie on clerk.accounts.dev FAPI creates a brand-new
        // empty client on every cold start — restoring it here lets FAPI recognise
        // the existing authenticated client and return the live session.
        restoreClerkCookies()
        return true
    }

    func applicationDidEnterBackground(_ application: UIApplication) {
        // Request extra background time so the async getAllCookies callback can
        // complete before iOS suspends the process.
        let taskId = application.beginBackgroundTask(withName: "GoalsySaveClerkCookies") {
            // Expiry handler — iOS is about to force-suspend; nothing more we can do.
        }
        saveClerkCookies {
            application.endBackgroundTask(taskId)
        }
    }

    func applicationWillResignActive(_ application: UIApplication) {}
    func applicationWillEnterForeground(_ application: UIApplication) {}
    func applicationDidBecomeActive(_ application: UIApplication) {}
    func applicationWillTerminate(_ application: UIApplication) {}

    func application(
        _ app: UIApplication,
        open url: URL,
        options: [UIApplication.OpenURLOptionsKey: Any] = [:]
    ) -> Bool {
        return ApplicationDelegateProxy.shared.application(app, open: url, options: options)
    }

    func application(
        _ application: UIApplication,
        continue userActivity: NSUserActivity,
        restorationHandler: @escaping ([UIUserActivityRestoring]?) -> Void
    ) -> Bool {
        return ApplicationDelegateProxy.shared.application(
            application, continue: userActivity, restorationHandler: restorationHandler)
    }

    // MARK: - Clerk cookie persistence

    /// Snapshot every cookie in `WKHTTPCookieStore` whose domain contains "clerk"
    /// or ".accounts.dev" into UserDefaults so it survives force-kill.
    private func saveClerkCookies(completion: @escaping () -> Void = {}) {
        WKWebsiteDataStore.default().httpCookieStore.getAllCookies { [weak self] cookies in
            guard let self = self else { completion(); return }

            let clerkCookies = cookies.filter { c in
                c.domain.contains("clerk") || c.domain.contains(".accounts.dev")
            }

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
                UserDefaults.standard.set(data, forKey: self.clerkCookieStoreKey)
                UserDefaults.standard.synchronize()
                NSLog("[Goalsy:native] Saved %d Clerk cookies to UserDefaults", clerkCookies.count)
                for c in clerkCookies {
                    NSLog("[Goalsy:native]  saved: %@ on %@  (httpOnly=%d secure=%d)",
                          c.name, c.domain, c.isHTTPOnly, c.isSecure)
                }
            }
            completion()
        }
    }

    /// Write the previously saved Clerk cookies back into `WKHTTPCookieStore`.
    /// Called at launch before the WebView loads — the async `setCookie` calls
    /// complete well within the time it takes WKWebView to parse index.html and
    /// begin executing JavaScript, so no FAPI network call races ahead of them.
    private func restoreClerkCookies() {
        guard
            let data  = UserDefaults.standard.data(forKey: clerkCookieStoreKey),
            let array = try? JSONSerialization.jsonObject(with: data) as? [[String: Any]],
            !array.isEmpty
        else {
            NSLog("[Goalsy:native] No saved Clerk cookies to restore (first launch or cleared)")
            return
        }

        let store = WKWebsiteDataStore.default().httpCookieStore
        var queued = 0

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
            // Restore the original expiry if present; otherwise give former
            // session cookies a 30-day window so they survive force-kill.
            if let ts = props["expires"] as? Double, ts > 0 {
                cookieProps[.expires] = Date(timeIntervalSince1970: ts)
            } else {
                cookieProps[.expires] = Date(timeIntervalSinceNow: 30 * 24 * 60 * 60)
            }

            if let cookie = HTTPCookie(properties: cookieProps) {
                store.setCookie(cookie) {
                    NSLog("[Goalsy:native] Restored cookie: %@ on %@", name, domain)
                }
                queued += 1
            }
        }

        NSLog("[Goalsy:native] Queued restore of %d Clerk cookies into WKHTTPCookieStore", queued)
    }
}
