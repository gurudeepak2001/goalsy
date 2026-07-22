import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  // Unique reverse-domain identifier — this becomes your app's ID in both stores.
  // Once you publish, this CANNOT be changed without creating a new app listing.
  appId: 'com.goalsy.executive',
  appName: 'Goalsy Executive',

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
