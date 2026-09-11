import { useEffect } from 'react';
import { useLocation } from 'wouter';
import GoalsyLogo from '@/components/GoalsyLogo';

export default function SplashScreen() {
  const [, setLocation] = useLocation();

  useEffect(() => {
    const timer = setTimeout(() => setLocation('/welcome'), 2500);
    return () => clearTimeout(timer);
  }, [setLocation]);

  return (
    <div
      className="min-h-[100dvh] w-full flex items-center justify-center max-w-md mx-auto"
      style={{ backgroundColor: '#05070A' }}
    >
      {/* Outer container — 215 wide, column, 24px gap (matches Figma "Container") */}
      <div className="flex flex-col items-center" style={{ width: 215, gap: 24 }}>

        <GoalsyLogo size="lg" />

        {/* Text section — column, items center */}
        <div className="flex flex-col items-center" style={{ width: 215 }}>
          {/* Goalsy — Inter 700, 28px, −1px tracking */}
          <span
            style={{
              fontFamily: 'Inter, sans-serif',
              fontWeight: 700,
              fontSize: 28,
              lineHeight: '36px',
              letterSpacing: '-1px',
              color: '#FFFFFF',
              display: 'block',
              width: 215,
              textAlign: 'center',
            }}
          >
            Goalsy
          </span>

          {/* Divider — 48×2px, #2563EB, 16px top margin */}
          <div
            style={{
              width: 48,
              height: 2,
              backgroundColor: '#2563EB',
              borderRadius: 9999,
              marginTop: 16,
              alignSelf: 'center',
            }}
          />
        </div>

      </div>
    </div>
  );
}
