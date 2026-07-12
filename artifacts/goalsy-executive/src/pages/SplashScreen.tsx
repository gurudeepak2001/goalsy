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
      <div 
        className="rounded-2xl"
        style={{ boxShadow: '0 0 60px 15px rgba(37,99,235,0.35)' }}
      >
        <GoalsyLogo size="lg" />
      </div>
      <h1 className="text-white font-bold text-2xl tracking-tight mt-6">
        GoalsyExecutive
      </h1>
      <div className="w-8 h-0.5 bg-[#2563EB] mt-3 mx-auto rounded-full"></div>
    </div>
  );
}
