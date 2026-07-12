import { useEffect } from 'react';
import { useLocation } from 'wouter';
import OnboardingShell from '@/components/OnboardingShell';

export default function SplashScreen() {
  const [, setLocation] = useLocation();

  useEffect(() => {
    const timer = setTimeout(() => {
      setLocation('/welcome');
    }, 2500);
    return () => clearTimeout(timer);
  }, [setLocation]);

  return <OnboardingShell background="/splash-bg.png" alt="Goalsy Executive" />;
}
