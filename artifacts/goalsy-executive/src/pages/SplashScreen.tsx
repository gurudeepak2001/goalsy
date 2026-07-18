import { useEffect } from 'react';
import { useLocation } from 'wouter';
import { Layers } from 'lucide-react';

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

        {/* Icon square — 80×80, #2563EB, radius 16px, blue glow */}
        <div
          className="flex items-center justify-center flex-shrink-0"
          style={{
            width: 80,
            height: 80,
            backgroundColor: '#2563EB',
            borderRadius: 16,
            boxShadow: '0px 0px 40px rgba(37, 99, 235, 0.3)',
          }}
        >
          <Layers color="white" size={40} strokeWidth={1.75} />
        </div>

        {/* Text section — column, items center */}
        <div className="flex flex-col items-center" style={{ width: 215 }}>
          {/* GoalsyExecutive — Inter 700, 28px, −1px tracking */}
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
            }}
          >
            GoalsyExecutive
          </span>

          {/* Divider — 48×2px, #2563EB, 16px top margin */}
          <div
            style={{
              width: 48,
              height: 2,
              backgroundColor: '#2563EB',
              borderRadius: 9999,
              marginTop: 16,
              alignSelf: 'flex-start',
            }}
          />
        </div>

      </div>
    </div>
  );
}
