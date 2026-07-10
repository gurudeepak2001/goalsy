import { useEffect } from 'react';
import { useLocation } from 'wouter';

export default function SplashScreen() {
  const [, setLocation] = useLocation();

  useEffect(() => {
    const timer = setTimeout(() => {
      setLocation('/welcome');
    }, 2500);
    return () => clearTimeout(timer);
  }, [setLocation]);

  return (
    <div className="min-h-[100dvh] w-full max-w-md mx-auto relative overflow-hidden bg-black">
      <img
        src="/splash-bg.png"
        alt="Goalsy Executive"
        className="absolute inset-0 w-full h-full object-cover"
      />
    </div>
  );
}
