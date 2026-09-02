/// ClerkCookiePersistenceTests.swift
///
/// XCTest suite for the Clerk cookie backup/restore round-trip in
/// ClerkCookiePersistence (extracted from AppDelegate).
///
/// These tests exercise the full save → clear → restore cycle against a real
/// WKHTTPCookieStore so that a silent WebKit update, Xcode SDK bump, or iOS
/// major-version release that breaks the round-trip will surface as a red test
/// rather than a production silent sign-out.
///
/// Run with:
///   xcodebuild test \
///     -project ios/App/App.xcodeproj \
///     -scheme AppTests \
///     -destination 'platform=iOS Simulator,name=iPhone 16'

import XCTest
import WebKit
@testable import App

final class ClerkCookiePersistenceTests: XCTestCase {

    // MARK: - Test fixtures

    private var persistence: ClerkCookiePersistence!
    private var testDefaults: UserDefaults!
    private var cookieStore: WKHTTPCookieStore!

    private let testSuite  = "com.enteraxion.goalsy.tests.cookie-round-trip"
    private let testKey    = "cm_clerk_cookies_v2_test"
    private let clerkDomain = ".clerk.goalsy.accounts.dev"

    // MARK: - Setup / teardown

    override func setUp() {
        super.setUp()

        // Isolated UserDefaults suite — never touches the real app store.
        testDefaults = UserDefaults(suiteName: testSuite)!
        testDefaults.removePersistentDomain(forName: testSuite)

        // Use the shared default cookie store (same store AppDelegate uses).
        cookieStore = WKWebsiteDataStore.default().httpCookieStore

        // Clear any Clerk cookies left over from a previous test or app run.
        deleteClerkCookies(description: "setUp-clear")

        persistence = ClerkCookiePersistence(
            defaults: testDefaults,
            key: testKey,
            cookieStoreProvider: { [unowned self] in self.cookieStore }
        )
    }

    override func tearDown() {
        deleteClerkCookies(description: "tearDown-clear")
        testDefaults.removePersistentDomain(forName: testSuite)
        super.tearDown()
    }

    // MARK: - Tests

    /// Core regression test: seed → save → clear → restore → assert present.
    ///
    /// This is the automated equivalent of the manual force-quit/relaunch
    /// checklist in `ios/WEBVIEW_SESSION_REGRESSION_CHECKLIST.md`.
    func testClerkCookieRoundTrip() {

        // 1. Seed two fake Clerk cookies into the live cookie store.
        let cookiesToSeed: [HTTPCookie] = [
            makeCookie(name: "__client",  domain: clerkDomain),
            makeCookie(name: "__session", domain: clerkDomain),
        ]
        let seeded = expectation(description: "cookies-seeded")
        var remaining = cookiesToSeed.count
        for cookie in cookiesToSeed {
            cookieStore.setCookie(cookie) {
                remaining -= 1
                if remaining == 0 { seeded.fulfill() }
            }
        }
        wait(for: [seeded], timeout: 5)

        // Confirm the store contains both cookies before saving.
        XCTAssertEqual(
            countClerkCookies(description: "pre-save count"),
            2,
            "Cookie store should contain 2 Clerk cookies before save"
        )

        // 2. Call save() and wait for the completion handler.
        let saved = expectation(description: "cookies-saved")
        persistence.save { saved.fulfill() }
        wait(for: [saved], timeout: 5)

        // 3. Clear the cookie store, simulating the WKHTTPCookieStore wipe
        //    that iOS performs when the process is force-killed.
        deleteClerkCookies(description: "post-save-clear")

        XCTAssertEqual(
            countClerkCookies(description: "post-clear count"),
            0,
            "Cookie store should be empty after clearing (simulating force-kill)"
        )

        // 4. Call restore() and wait for all setCookie completions.
        let restored = expectation(description: "cookies-restored")
        persistence.restore { restored.fulfill() }
        wait(for: [restored], timeout: 5)

        // 5. Assert the cookies are back in the store.
        let restoredCount = countClerkCookies(description: "post-restore count")
        XCTAssertEqual(
            restoredCount, 2,
            "Expected 2 Clerk cookies after restore; got \(restoredCount)"
        )

        let names = clerkCookieNames(description: "post-restore names")
        XCTAssertTrue(names.contains("__client"),
                      "__client cookie should be present after restore")
        XCTAssertTrue(names.contains("__session"),
                      "__session cookie should be present after restore")
    }

    /// When the store has no Clerk cookies, save() should write an empty
    /// (or absent) snapshot — not a non-empty stale snapshot from a prior run.
    func testSaveWithNoClerkCookiesWritesEmptySnapshot() {
        // Store is empty from setUp. Save immediately.
        let saved = expectation(description: "saved")
        persistence.save { saved.fulfill() }
        wait(for: [saved], timeout: 5)

        // UserDefaults key should be absent or contain an empty array.
        if let data = testDefaults.data(forKey: testKey),
           let array = try? JSONSerialization.jsonObject(with: data) as? [[String: Any]] {
            XCTAssertEqual(array.count, 0,
                           "save() with no Clerk cookies should write an empty array")
        }
        // data being nil is equally valid — no cookies, nothing written.
    }

    /// restore() with no prior save should be a silent no-op and must not
    /// inject any cookies into the store.
    func testRestoreWithNoSavedDataIsNoop() {
        // No data in testDefaults — restore must not crash.
        let completed = expectation(description: "restore-noop-completed")
        persistence.restore { completed.fulfill() }
        wait(for: [completed], timeout: 5)

        XCTAssertEqual(
            countClerkCookies(description: "after-noop-restore"),
            0,
            "restore() with no saved data must not inject any cookies"
        )
    }

    /// Values round-trip: cookie name, value, domain, and path must survive
    /// serialise → UserDefaults → deserialise → setCookie without corruption.
    func testCookieValuesRoundTripFaithfully() {
        let original = makeCookie(
            name:   "__client",
            domain: clerkDomain,
            value:  "a1b2c3d4e5f6-test-value"
        )

        let seeded = expectation(description: "seeded")
        cookieStore.setCookie(original) { seeded.fulfill() }
        wait(for: [seeded], timeout: 5)

        let saved = expectation(description: "saved")
        persistence.save { saved.fulfill() }
        wait(for: [saved], timeout: 5)

        deleteClerkCookies(description: "pre-restore-clear")

        let restored = expectation(description: "restored")
        persistence.restore { restored.fulfill() }
        wait(for: [restored], timeout: 5)

        let readExp = expectation(description: "read-back")
        var readBack: [HTTPCookie] = []
        cookieStore.getAllCookies { cookies in
            readBack = cookies.filter { $0.domain.contains("clerk") || $0.domain.contains(".accounts.dev") }
            readExp.fulfill()
        }
        wait(for: [readExp], timeout: 5)

        XCTAssertEqual(readBack.count, 1, "Expected exactly one cookie after value round-trip")
        if let cookie = readBack.first {
            XCTAssertEqual(cookie.name,   "__client",             "Cookie name mismatch")
            XCTAssertEqual(cookie.value,  "a1b2c3d4e5f6-test-value", "Cookie value mismatch")
            XCTAssertEqual(cookie.domain, clerkDomain,            "Cookie domain mismatch")
            XCTAssertEqual(cookie.path,   "/",                    "Cookie path mismatch")
        }
    }

    // MARK: - Helpers

    /// Returns a fake Clerk HTTPCookie for testing.
    private func makeCookie(
        name: String,
        domain: String,
        value: String? = nil
    ) -> HTTPCookie {
        HTTPCookie(properties: [
            .name:    name,
            .value:   value ?? "fake-\(name)-value",
            .domain:  domain,
            .path:    "/",
            .secure:  "TRUE",
            .expires: Date(timeIntervalSinceNow: 30 * 24 * 60 * 60),
        ])!
    }

    /// Synchronously deletes every Clerk/accounts.dev cookie from the shared store.
    @discardableResult
    private func deleteClerkCookies(description: String) -> Int {
        let exp = expectation(description: description)
        var deleted = 0
        cookieStore.getAllCookies { [weak self] cookies in
            guard let self = self else { exp.fulfill(); return }
            let clerkCookies = cookies.filter {
                $0.domain.contains("clerk") || $0.domain.contains(".accounts.dev")
            }
            deleted = clerkCookies.count
            if clerkCookies.isEmpty { exp.fulfill(); return }
            var remaining = clerkCookies.count
            for c in clerkCookies {
                self.cookieStore.delete(c) {
                    remaining -= 1
                    if remaining == 0 { exp.fulfill() }
                }
            }
        }
        wait(for: [exp], timeout: 5)
        return deleted
    }

    /// Synchronously returns the count of Clerk cookies in the shared store.
    private func countClerkCookies(description: String) -> Int {
        let exp = expectation(description: description)
        var count = 0
        cookieStore.getAllCookies { cookies in
            count = cookies.filter {
                $0.domain.contains("clerk") || $0.domain.contains(".accounts.dev")
            }.count
            exp.fulfill()
        }
        wait(for: [exp], timeout: 5)
        return count
    }

    /// Synchronously returns the set of Clerk cookie names in the shared store.
    private func clerkCookieNames(description: String) -> Set<String> {
        let exp = expectation(description: description)
        var names = Set<String>()
        cookieStore.getAllCookies { cookies in
            names = Set(
                cookies
                    .filter { $0.domain.contains("clerk") || $0.domain.contains(".accounts.dev") }
                    .map(\.name)
            )
            exp.fulfill()
        }
        wait(for: [exp], timeout: 5)
        return names
    }
}
