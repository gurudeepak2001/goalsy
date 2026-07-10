import { useLocation } from 'wouter';
import { ArrowUpRight } from 'lucide-react';
import AppHeader from '@/components/AppHeader';
import ExecutiveButton from '@/components/ExecutiveButton';

export default function WelcomeScreen() {
  const [, setLocation] = useLocation();

  return (
    <div className="min-h-[100dvh] w-full bg-[#09090C] flex flex-col max-w-md mx-auto">
      <div className="px-6 pt-12">
        <AppHeader />
        <h1 className="text-white font-black text-4xl leading-tight mt-10">
          The Financial<br />Operating<br />System for the<br />Ambitious.
        </h1>
        <p className="text-[#94A3B8] text-sm mt-4 leading-relaxed max-w-[280px]">
          Precision metrics and architectural strategy for high-stakes leadership.
        </p>
      </div>

      <div className="relative flex-1 flex flex-col items-center justify-center py-8">
        {/* Arc effects */}
        <div className="absolute left-0 top-1/2 -translate-y-1/2 w-24 h-48 bg-gradient-to-r from-[#2563EB] to-transparent opacity-80 rounded-r-full blur-xl pointer-events-none"></div>
        <div className="absolute right-0 top-1/2 -translate-y-1/2 w-24 h-48 bg-gradient-to-l from-[#2563EB] to-transparent opacity-80 rounded-l-full blur-xl pointer-events-none"></div>
        
        <div className="relative z-10 text-center">
          <div className="flex items-start justify-center">
            <span className="text-white font-black text-8xl tracking-tight leading-none">98.4</span>
            <span className="text-[#94A3B8] font-bold text-3xl mt-2">%</span>
          </div>
          <div className="bg-[#0A2A14] text-[#22C55E] text-xs font-bold tracking-widest uppercase px-3 py-1.5 rounded-full mt-4 inline-flex items-center gap-1.5 border border-[#16A34A]/20">
            <ArrowUpRight size={14} strokeWidth={3} />
            EFFICIENCY PEAK
          </div>
        </div>
      </div>

      <div className="px-6 pb-10 mt-auto">
        <ExecutiveButton 
          text="Get Started" 
          onClick={() => setLocation('/create-account')} 
        />
        <ExecutiveButton 
          variant="outline" 
          text="Sign In" 
          className="mt-3"
          icon={<></>}
          onClick={() => setLocation('/signin')} 
        />
        <div className="text-[#475569] text-xs tracking-widest uppercase text-center mt-8">
          TRUSTED BY 500+ VENTURES
        </div>
      </div>
    </div>
  );
}
