import { useEffect } from 'react';
import { useLocation } from 'wouter';
import GoalsyLogo from '@/components/GoalsyLogo';

export default function SplashScreen() {
  const [, setLocation] = useLocation();

  useEffect(() => {
    const timer = setTimeout(() => {
      setLocation('/welcome');
    }, 2500);
    return () => clearTimeout(timer);
  }, [setLocation]);

  return (
    <div className="min-h-[100dvh] w-full bg-[#000000] flex flex-col items-center justify-center max-w-md mx-auto relative overflow-hidden">
      {/* Wordmark shown as-is — G icon + "Goalsy" text, original colours. */}
      <GoalsyLogo size="lg" />
    </div>
  );
}
