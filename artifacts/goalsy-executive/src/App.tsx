import { useEffect, type ComponentType } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ClerkProvider, ClerkLoading, ClerkLoaded, Show, useAuth } from '@clerk/react';
import ErrorBoundary from '@/components/ErrorBoundary';
import { initApiClient } from '@/lib/apiClient';
import { publishableKeyFromHost } from '@clerk/react/internal';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import NotFound from '@/pages/not-found';
import { Route, Switch, Redirect, useLocation, Router as WouterRouter } from 'wouter';

import SplashScreen from '@/pages/SplashScreen';
import WelcomeScreen from '@/pages/WelcomeScreen';
import SignInScreen from '@/pages/SignInScreen';
import CreateAccountScreen from '@/pages/CreateAccountScreen';
import FinancialConnectionScreen from '@/pages/FinancialConnectionScreen';
import AIHomeScreen from '@/pages/AIHomeScreen';
import FinancialHealthScreen from '@/pages/FinancialHealthScreen';
import TodayScreen from '@/pages/TodayScreen';
import CalendarScreen from '@/pages/CalendarScreen';
import GoalsOverviewScreen from '@/pages/GoalsOverviewScreen';
import ProfileScreen from '@/pages/ProfileScreen';
import ScoreScreen from '@/pages/ScoreScreen';

const queryClient = new QueryClient();

const basePath = import.meta.env.BASE_URL.replace(/\/$/, '');

// Resolve the Clerk publishable key.
// In a normal browser the hostname matches the Clerk domain and publishableKeyFromHost
// derives the key automatically. Inside a Capacitor WebView the hostname is always
// "localhost" regardless of the real Clerk domain — publishableKeyFromHost then
// constructs a key whose embedded frontend API resolves to "clerk.localhost", which
// doesn't exist, causing Clerk's JS bundle load to fail and the app to show a blank
// screen. We detect the Capacitor runtime via window.Capacitor (always set on both
// Android and iOS) and bypass the hostname derivation entirely, using the key baked
// into the bundle at Vite build time.
const isCapacitor = !!(window as any).Capacitor;
const clerkPubKey = isCapacitor
  ? import.meta.env.VITE_CLERK_PUBLISHABLE_KEY
  : publishableKeyFromHost(window.location.hostname, import.meta.env.VITE_CLERK_PUBLISHABLE_KEY);

// In the browser the Clerk proxy URL routes auth through Replit's domain.
// In a Capacitor native build Clerk must talk to its servers directly, so we
// clear the proxy URL — the allowNavigation list in capacitor.config.ts covers it.
const clerkProxyUrl = isCapacitor ? undefined : import.meta.env.VITE_CLERK_PROXY_URL;

if (!clerkPubKey) {
  throw new Error('Missing VITE_CLERK_PUBLISHABLE_KEY in .env file');
}

// Screens that require a signed-in user. Signed-out visitors are redirected to /welcome.
function AuthGate({ component: Component }: { component: ComponentType }) {
  return (
    <>
      <Show when="signed-in">
        <Component />
      </Show>
      <Show when="signed-out">
        <Redirect to="/welcome" />
      </Show>
    </>
  );
}

// Auth screens (welcome/sign-in/create-account) redirect a signed-in user straight into the app.
function GuestOnly({ component: Component }: { component: ComponentType }) {
  return (
    <>
      <Show when="signed-out">
        <Component />
      </Show>
      <Show when="signed-in">
        <Redirect to="/ai-home" />
      </Show>
    </>
  );
}

function HomeRedirect() {
  return (
    <>
      <Show when="signed-in">
        <Redirect to="/ai-home" />
      </Show>
      <Show when="signed-out">
        <SplashScreen />
      </Show>
    </>
  );
}

function Router() {
  return (
    <Switch>
      <Route path="/" component={HomeRedirect} />
      <Route path="/welcome" component={() => <GuestOnly component={WelcomeScreen} />} />
      <Route path="/signin" component={() => <GuestOnly component={SignInScreen} />} />
      <Route path="/create-account" component={() => <GuestOnly component={CreateAccountScreen} />} />
      <Route path="/financial-connection" component={() => <AuthGate component={FinancialConnectionScreen} />} />
      <Route path="/ai-home" component={() => <AuthGate component={AIHomeScreen} />} />
      <Route path="/today" component={() => <AuthGate component={TodayScreen} />} />
      <Route path="/financial-health" component={() => <AuthGate component={FinancialHealthScreen} />} />
      <Route path="/calendar" component={() => <AuthGate component={CalendarScreen} />} />
      <Route path="/goals" component={() => <AuthGate component={GoalsOverviewScreen} />} />
      <Route path="/profile" component={() => <AuthGate component={ProfileScreen} />} />
      <Route path="/score" component={() => <AuthGate component={ScoreScreen} />} />
      <Route component={NotFound} />
    </Switch>
  );
}

/** Runs once inside ClerkLoaded — wires the Clerk session token to every API request. */
function ApiClientBootstrap() {
  const { getToken } = useAuth();
  useEffect(() => { initApiClient(getToken); }, []); // eslint-disable-line react-hooks/exhaustive-deps
  return null;
}

function ClerkProviderWithRoutes() {
  const [, setLocation] = useLocation();

  return (
    <ClerkProvider
      publishableKey={clerkPubKey}
      proxyUrl={clerkProxyUrl}
      routerPush={(to) => setLocation(to)}
      routerReplace={(to) => setLocation(to, { replace: true })}
    >
      {/* Show SplashScreen while Clerk resolves auth state so the preview
          never displays a blank page. Once loaded, Show/signed-in/signed-out
          take over as normal. */}
      <ClerkLoading>
        <SplashScreen />
      </ClerkLoading>
      <ClerkLoaded>
        <ApiClientBootstrap />
        <Router />
      </ClerkLoaded>
    </ClerkProvider>
  );
}

function App() {
  useEffect(() => {
    document.documentElement.classList.add('dark');
  }, []);

  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <WouterRouter base={basePath}>
            <ClerkProviderWithRoutes />
          </WouterRouter>
          <Toaster />
        </TooltipProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}

export default App;
