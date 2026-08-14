package com.goalsy.executive;

import android.webkit.CookieManager;
import android.util.Log;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {

    private static final String TAG = "Goalsy";

    /**
     * Force-flush WebView cookies to disk before the OS may kill the process.
     *
     * Android's Chromium-based WebView writes cookies to its SQLite store
     * asynchronously. Under a normal background → foreground cycle this is
     * fine, but a force-kill from the recents switcher can arrive before the
     * pending writes land on disk, wiping the Clerk session cookies and signing
     * the user out on next launch.
     *
     * CookieManager.flush() is the Android equivalent of the iOS
     * WKHTTPCookieStore → UserDefaults backup in AppDelegate.swift.  It blocks
     * until all pending cookie writes have been committed to disk, so any
     * subsequent SIGKILL cannot lose them.
     *
     * Android System WebView ships as a separate APK and updates independently
     * of the OS.  A silent WebView update could change the flush behaviour and
     * break this guarantee.  Run the regression checklist after any bump to the
     * Capacitor Android target SDK, Gradle wrapper, or when a major WebView
     * version ships:
     *
     *   android/WEBVIEW_SESSION_REGRESSION_CHECKLIST.md
     *
     * onStop() is called:
     *   • when the app is sent to the background (home button, recents swipe)
     *   • just before the process is force-killed via the recents switcher
     *   • on configuration changes (rotation) — harmless to flush here too
     *
     * We do NOT need to restore cookies on onCreate() — unlike iOS
     * WKHTTPCookieStore (which is wiped on process death), Android's
     * CookieManager reads directly from the on-disk SQLite database, so
     * the cookies are already present when the WebView starts.
     */
    @Override
    protected void onStop() {
        super.onStop();
        try {
            CookieManager.getInstance().flush();
            Log.d(TAG, "[Goalsy:native] onStop — CookieManager.flush() complete");
        } catch (Exception e) {
            Log.e(TAG, "[Goalsy:native] onStop — CookieManager.flush() failed: " + e.getMessage());
        }
    }
}
