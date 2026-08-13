import { useLocation } from 'wouter';
import { ArrowUpRight } from 'lucide-react';
import AppHeader from '@/components/AppHeader';
import ExecutiveButton from '@/components/ExecutiveButton';

export default function WelcomeScreen() {
  const [, setLocation] = useLocation();

  return (
    <div className="min-h-[100dvh] w-full max-w-md mx-auto flex flex-col justify-between bg-[#05070A] px-8" style={{ paddingTop: 'calc(3rem + var(--safe-top))', paddingBottom: 'calc(2rem + var(--safe-bottom))' }}>
      <header className="w-[311px] mx-auto">
        <AppHeader />
      </header>

      <main className="w-[311px] mx-auto flex flex-col justify-center py-[46.695px] pb-12">
        <div className="flex flex-col items-start gap-6">
          <h1
            className="text-white font-bold text-[48px] leading-[53px] tracking-[-2.4px]"
            style={{ letterSpacing: '-2.4px' }}
          >
            The Financial<br />Operating<br />System for the<br />Ambitious.
          </h1>
          <p
            className="text-[#CBD5E1] font-semibold text-lg leading-[29px]"
            style={{ maxWidth: '311px' }}
          >
            Precision metrics and architectural strategy for high-stakes leadership.
          </p>
        </div>

        <div className="relative w-[311px] h-[180px] mt-8 flex flex-col items-center justify-center">
          <div
            className="absolute rounded-full"
            style={{
              width: '240px',
              height: '240px',
              left: '35px',
              top: '-30px',
              background: '#2563EB',
              opacity: 0.1,
              filter: 'blur(40px)',
            }}
          />
          <div className="relative z-10 w-[299.39px] text-center">
            <div className="relative h-[80px] opacity-90">
              <span
                className="absolute left-0 top-[-0.5px] text-white font-bold text-[80px] leading-[80px]"
                style={{ letterSpacing: '-4px' }}
              >
                98.4
              </span>
              <span
                className="absolute text-[#2563EB] font-bold text-[28px] leading-[28px]"
                style={{ left: '174px', top: '46px' }}
              >
                %
              </span>
            </div>
            <div className="relative mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#111827] border border-white/5">
              <ArrowUpRight size={16} className="text-[#22C55E]" strokeWidth={3} />
              <span
                className="text-[#22C55E] font-bold text-sm uppercase"
                style={{ letterSpacing: '1.4px' }}
              >
                Efficiency Peak
              </span>
            </div>
          </div>
        </div>
      </main>

      <footer className="w-[311px] mx-auto flex flex-col gap-4">
        <ExecutiveButton
          text="Get Started"
          style={{ letterSpacing: '-0.00488281em' }}
          onClick={() => setLocation('/create-account')}
        />
        <ExecutiveButton
          variant="outline"
          text="Sign In"
          style={{ letterSpacing: '0.00195312em' }}
          onClick={() => setLocation('/signin')}
        />
        <div className="pt-4 text-center">
          <span
            className="text-[#808BA4] font-semibold text-xs uppercase"
            style={{ letterSpacing: '1.2px', opacity: 0.5 }}
          >
            Trusted by 500+ Ventures
          </span>
        </div>
      </footer>
    </div>
  );
}
