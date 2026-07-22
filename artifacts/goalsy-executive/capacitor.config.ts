import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  // Unique reverse-domain identifier — this becomes your app's ID in both stores.
  // Once you publish, this CANNOT be changed without creating a new app listing.
  appId: 'com.goalsy.executive',
  appName: 'Goalsy Executive',

  // Where Vite puts the production build (matches vite.config.ts → build.outDir)
  webDir: 'dist/public',

  server: {
    // ── DEV: point the native WebView at the live Replit dev server ────────────
    // This lets the native app use the same origin as the browser preview, so
    // root-relative /api/* calls reach the API server and Clerk auth works.
    // ⚠️  BEFORE a store build: comment this url line out and run `cap sync`
    //     so the packaged app uses the bundled files in webDir instead.
    url: 'https://b89a11ff-b052-43b2-b941-88baf72a4a02-00-1vdn0ng8937zm.kirk.replit.dev/goalsy-executive',

    // Allow Clerk's auth endpoints and the Replit dev domain to be reached from the WebView.
    allowNavigation: [
      'b89a11ff-b052-43b2-b941-88baf72a4a02-00-1vdn0ng8937zm.kirk.replit.dev',
      '*.clerk.accounts.dev',
      '*.clerk.com',
      'clerk.goalsy.com', // update to your production Clerk domain when you have one
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
  },
};

export default config;
