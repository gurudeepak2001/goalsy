import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  // Unique reverse-domain identifier — this becomes your app's ID in both stores.
  // Once you publish, this CANNOT be changed without creating a new app listing.
  appId: 'com.goalsy.executive',
  appName: 'Goalsy',

  // Where Vite puts the production build (matches vite.config.ts → build.outDir)
  webDir: 'dist/public',

  server: {
    // Allow Clerk's auth endpoints to be reached from the native WebView.
    // The app loads its own bundled files (webDir) — no server.url needed.
    allowNavigation: [
      '*.clerk.accounts.dev',
      '*.clerk.com',
      'clerk.goalsy.com',
      // Allow the Replit API server so API calls work from the native build.
      'b89a11ff-b052-43b2-b941-88baf72a4a02-00-1vdn0ng8937zm.kirk.replit.dev',
    ],
  },

  android: {
    // Use the full-screen edge-to-edge layout so we can control safe-area padding
    // ourselves in CSS (via env(safe-area-inset-*)) rather than letting Android
    // shrink the WebView away from the edges.
    // This must also be set in AndroidManifest.xml — `cap sync` does it automatically.
    allowMixedContent: false,
    captureInput: true,
    webContentsDebuggingEnabled: false, // flip to true when debugging on a real device
  },

  ios: {
    // Matches the UIViewControllerBasedStatusBarAppearance key in Info.plist.
    // Keeps the status bar light (white text) to match the dark theme.
    //
    // Note: `contentInset: 'always'` only controls the WKWebView's top/bottom
    // content inset relative to safe-area edges (notch / home indicator).
    // It does NOT interact with keyboard resize behaviour — the two settings
    // are orthogonal. When the keyboard appears, `resize: 'body'` below
    // shrinks the <body> to the visible space; the top contentInset is
    // unaffected and the bottom safe-area inset correctly becomes 0 because
    // the keyboard now occupies that region.
    contentInset: 'always',
  },

  plugins: {
    // Splash screen — shown while the WebView loads.
    // You'll supply the actual image assets before building for the stores.
    SplashScreen: {
      launchShowDuration: 1500,
      backgroundColor: '#05070A', // matches the splash screen background colour
      showSpinner: false,
      androidSplashResourceName: 'splash',
      iosSplashResourceName: 'Splash',
    },

    // Keyboard — resize the <body> when the soft keyboard appears.
    //
    // iOS (WKWebView): `resize: 'body'` shrinks the body to the available
    // height above the keyboard. Combined with the AppShell's `h-[100dvh]`
    // root container (which tracks the dynamic viewport height), the scroll
    // container reflows and `scrollIntoView` correctly brings the ConfirmForm
    // into view. ConfirmForm listens for `keyboardWillShow` on iOS so it can
    // start scrolling during the keyboard slide-up animation rather than after.
    //
    // Android: `resize: 'body'` + `keyboardDidShow` remains the correct
    // combination — the body is fully resized before the event fires.
    //
    // `resizeOnFullScreen: true` ensures the resize fires even when the app
    // is running in fullscreen / edge-to-edge mode on both platforms.
    Keyboard: {
      resize: 'body',
      style: 'dark',
      resizeOnFullScreen: true,
    },
  },
};

export default config;
