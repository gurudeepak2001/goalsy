import { useLocation } from 'wouter';
import { toast } from '@/hooks/use-toast';
import { Target, Shield, Zap, PieChart, Layers } from 'lucide-react';
import AppHeader from '@/components/AppHeader';
import FeatureCard from '@/components/FeatureCard';
import ExecutiveButton from '@/components/ExecutiveButton';

export default function FinancialConnectionScreen() {
  const [, navigate] = useLocation();

  return (
    <div className="min-h-[100dvh] w-full bg-[#09090C] max-w-md mx-auto flex flex-col overflow-y-auto">
      <div className="px-6 pt-12 pb-10 flex-1 flex flex-col">
        <AppHeader showSecureMode={true} />
        
        <div className="mt-10 flex items-stretch gap-0">
          <div className="w-1 bg-[#2563EB] rounded-full flex-shrink-0"></div>
          <div className="pl-5 py-1">
            <div className="text-[#2563EB] text-xs font-bold tracking-[0.2em] uppercase mb-3">
              STEP 02: INTELLIGENCE SYNC
            </div>
            <h1 className="text-white font-black text-3xl leading-tight tracking-tight">
              Secure Data Connection.
            </h1>
            <p className="text-[#94A3B8] text-sm leading-relaxed mt-4">
              To provide real-time intelligence, Goalsy connects securely to your financial institutions via Plaid. Your data is encrypted and never sold.
            </p>
          </div>
        </div>
        
        <div className="mt-10 flex flex-col gap-3">
          <FeatureCard
            icon={<Target size={20} strokeWidth={2} />}
            title="Real-time Analysis"
            subtitle="Continuous cockpit updates"
          />
          <FeatureCard
            icon={<Shield size={20} strokeWidth={2} />}
            title="Bank-level Security"
            subtitle="Verified Plaid protocols"
          />
          <FeatureCard
            icon={<Zap size={20} strokeWidth={2} />}
            title="256-bit Encryption"
            subtitle="AES-256 standard active"
          />
        </div>
        
        <div className="mt-8 flex justify-center items-center gap-2.5">
          <span className="text-[#475569] text-[10px] tracking-widest uppercase font-medium">POWERED BY</span>
          <div className="w-4 h-4 border-[1.5px] border-[#94A3B8] rounded-full flex items-center justify-center">
            <span className="text-[#94A3B8] text-[8px] font-bold pb-[0.5px]">P</span>
          </div>
          <span className="text-[#94A3B8] text-sm font-bold tracking-widest">PLAID</span>
        </div>
        
        <ExecutiveButton
          text="Connect Accounts"
          className="mt-8"
          onClick={() => navigate('/goals')}
        />

        <ExecutiveButton
          variant="outline"
          text="Skip for Now"
          className="mt-3"
          onClick={() => navigate('/goals')}
        />
        
        <div className="mt-auto pt-10 flex flex-col items-center">
          <div className="flex items-center justify-center gap-3">
            <div className="bg-[#0F1625] border border-[#1A2238] rounded-full p-2">
              <PieChart size={14} className="text-[#475569]" strokeWidth={2.5} />
            </div>
            <div className="bg-[#0F1625] border border-[#1A2238] rounded-full p-2">
              <Layers size={14} className="text-[#475569]" strokeWidth={2.5} />
            </div>
            <div className="bg-[#0F1625] border border-[#1A2238] rounded-full p-2">
              <Shield size={14} className="text-[#475569]" strokeWidth={2.5} />
            </div>
          </div>
          <div className="text-[#334155] text-[10px] tracking-[0.2em] uppercase text-center font-medium mt-4">
            GOALSY EXECUTIVE © 2024 · ALL SYSTEMS SECURE
          </div>
        </div>
      </div>
    </div>
  );
}
