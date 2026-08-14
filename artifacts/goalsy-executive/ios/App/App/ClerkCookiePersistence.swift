import WebKit

/// Serialises Clerk session cookies to UserDefaults and restores them on
/// next launch, surviving force-quit (which wipes WKHTTPCookieStore).
///
/// Extracted from AppDelegate so the round-trip logic can be unit-tested
/// without a running Capacitor host. AppDelegate owns the instance and
/// supplies the live WebView's cookie store via `cookieStoreProvider`.
///
/// Usage:
///   let persistence = ClerkCookiePersistence()
///   persistence.save { /* done */ }   // on background
///   persistence.restore()             // on launch, before WebView loads
///
/// Testing:
///   let persistence = ClerkCookiePersistence(
///       defaults: testDefaults,
///       cookieStoreProvider: { mySeededStore }
///   )
class ClerkCookiePersistence {

    // MARK: - Configuration

    /// The UserDefaults instance used for storage. Inject a separate suite in
    /// tests to avoid touching the real app data.
    let defaults: UserDefaults

    /// The UserDefaults key under which the cookie snapshot is stored.
    let defaultsKey: String

    /// Returns the WKHTTPCookieStore to read from when saving cookies.
    /// AppDelegate supplies the live Capacitor WebView's store (or the shared
    /// default when the WebView isn't available). Tests supply a seeded store.
    var cookieStoreProvider: () -> WKHTTPCookieStore

    // MARK: - Init

    init(
        defaults: UserDefaults = .standard,
        key: String = "cm_clerk_cookies_v2",
        cookieStoreProvider: @escaping () -> WKHTTPCookieStore = {
            WKWebsiteDataStore.default().httpCookieStore
        }
    ) {
        self.defaults        = defaults
        self.defaultsKey     = key
        self.cookieStoreProvider = cookieStoreProvider
    }

    // MARK: - Public API

    /// Reads every Clerk cookie from the injected cookie store and persists
    /// them to UserDefaults as JSON. Calls `completion` when done (including
    /// on error paths so callers can always end background tasks).
    func save(completion: @escaping () -> Void = {}) {
        cookieStoreProvider().getAllCookies { [weak self] cookies in
            guard let self = self else { completion(); return }

            let clerkCookies = cookies.filter {
                $0.domain.contains("clerk") || $0.domain.contains(".accounts.dev")
            }

            NSLog("[Goalsy:native] ClerkCookiePersistence.save — found %d Clerk cookies (total: %d)",
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
                self.defaults.set(data, forKey: self.defaultsKey)
                self.defaults.synchronize()
                NSLog("[Goalsy:native] Saved %d Clerk cookies to UserDefaults", clerkCookies.count)
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

    /// Reads the cookie snapshot from UserDefaults and injects each cookie
    /// into the store returned by `cookieStoreProvider`. Calls `completion`
    /// once all `setCookie` operations have fired (useful in tests; AppDelegate
    /// callers can omit the completion parameter).
    func restore(completion: @escaping () -> Void = {}) {
        guard
            let data  = defaults.data(forKey: defaultsKey),
            let array = try? JSONSerialization.jsonObject(with: data) as? [[String: Any]],
            !array.isEmpty
        else {
            NSLog("[Goalsy:native] restoreClerkCookies — no saved cookies (first launch or cleared)")
            completion()
            return
        }

        NSLog("[Goalsy:native] restoreClerkCookies — injecting %d cookies into WKHTTPCookieStore before WebView load",
              array.count)

        let store = cookieStoreProvider()
        let group = DispatchGroup()

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
                group.enter()
                store.setCookie(cookie) {
                    NSLog("[Goalsy:native]   restored: %@ | domain: %@", name, domain)
                    group.leave()
                }
            } else {
                NSLog("[Goalsy:native]   WARN: could not reconstruct cookie: %@ on %@", name, domain)
            }
        }

        group.notify(queue: .main) { completion() }
    }
}
