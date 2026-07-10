import { useEffect } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import NotFound from '@/pages/not-found';
import { Route, Switch, Router as WouterRouter } from 'wouter';

import SplashScreen from '@/pages/SplashScreen';
import WelcomeScreen from '@/pages/WelcomeScreen';
import SignInScreen from '@/pages/SignInScreen';
import CreateAccountScreen from '@/pages/CreateAccountScreen';
import FinancialConnectionScreen from '@/pages/FinancialConnectionScreen';
import AIHomeScreen from '@/pages/AIHomeScreen';
import FinancialHealthScreen from '@/pages/FinancialHealthScreen';
import CalendarScreen from '@/pages/CalendarScreen';
import GoalsOverviewScreen from '@/pages/GoalsOverviewScreen';

const queryClient = new QueryClient();

function Router() {
  return (
    <Switch>
      <Route path="/" component={SplashScreen} />
      <Route path="/welcome" component={WelcomeScreen} />
      <Route path="/signin" component={SignInScreen} />
      <Route path="/create-account" component={CreateAccountScreen} />
      <Route path="/financial-connection" component={FinancialConnectionScreen} />
      <Route path="/ai-home" component={AIHomeScreen} />
      <Route path="/financial-health" component={FinancialHealthScreen} />
      <Route path="/calendar" component={CalendarScreen} />
      <Route path="/goals" component={GoalsOverviewScreen} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  useEffect(() => {
    document.documentElement.classList.add('dark');
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, '')}>
          <Router />
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
