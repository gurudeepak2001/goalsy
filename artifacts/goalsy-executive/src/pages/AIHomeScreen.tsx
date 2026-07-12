import { useState } from 'react';
import {
  ArrowRight,
  Layers,
  Lightbulb,
  TrendingUp,
  BarChart3,
  Zap,
  Loader2,
  CheckCircle2,
} from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import AppHeader from '@/components/AppHeader';
import AppShell from '@/components/AppShell';
import Avatar from '@/components/Avatar';
import { simulateAsync } from '@/lib/mockData';

export default function AIHomeScreen() {
  const [transferStatus, setTransferStatus] = useState<'idle' | 'processing' | 'done'>('idle');
  const [movedToSavings, setMovedToSavings] = useState(0);

  const handleExecuteTransfer = async () => {
    if (transferStatus !== 'idle') return;
    setTransferStatus('processing');
    // MOCK DATA - replace with a real funds-transfer API call
    await simulateAsync(2400, 1500);
    setTransferStatus('done');
    setMovedToSavings((prev) => prev + 2400);
    toast({ title: 'Transfer Complete', description: '$2,400 moved to High-Yield Savings.' });
    setTimeout(() => setTransferStatus('idle'), 2500);
  };

  return (
    <AppShell
      activeTab="ai"
      headerClassName="h-[80px] px-8 bg-[#05070A]/90 backdrop-blur-[12px]"
      contentClassName="pt-[112px]"
      header={<AppHeader dashboard dashboardTitle="Strategic Intelligence" showNotification={false} />}
    >
      <div className="flex flex-col gap-6">
        {/* Strategic Recommendation */}
        <div className="bg-[#111827] border border-white/5 rounded-3xl p-8 flex flex-col gap-6">
          <div className="flex items-center gap-3">
            <div className="w-5 h-5 flex items-center justify-center">
              <Lightbulb size={20} className="text-[#3B82F6]" strokeWidth={2} />
            </div>
            <span className="text-[#808BA4] font-bold text-xs uppercase tracking-[1.5px]">
              Strategic Recommendation
            </span>
          </div>
          <div className="flex flex-col gap-2">
            <h2 className="text-white font-bold text-[28px] leading-[35px]">
              Refinance Mortgage
            </h2>
            <span className="text-[#22C55E] font-bold text-base leading-6">
              Potential Savings: $420/mo
            </span>
          </div>
          <div className="flex items-center justify-between pt-4 border-t border-white/5">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-[#22C55E] rounded-full"></div>
              <span className="text-[#CBD5E1] font-semibold text-sm leading-[21px]">
                Confidence
              </span>
            </div>
            <span className="text-white font-bold text-base leading-6">94%</span>
          </div>
        </div>

        {/* Financial Forecast */}
        <div className="bg-[#111827] border border-white/5 rounded-3xl p-8 flex flex-col gap-6">
          <div className="flex items-center gap-3">
            <div className="w-5 h-5 flex items-center justify-center">
              <TrendingUp size={20} className="text-white" strokeWidth={2} />
            </div>
            <span className="text-[#808BA4] font-bold text-xs uppercase tracking-[1.5px]">
              Financial Forecast
            </span>
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-[#CBD5E1] font-semibold text-sm leading-[21px]">
              Projected Net Worth (Dec 2024)
            </span>
            <div className="flex items-end gap-3">
              <span className="text-white font-bold text-[36px] leading-9">$1.42M</span>
              <span className="text-[#22C55E] font-bold text-base leading-6 mb-1">+8.4%</span>
            </div>
          </div>
        </div>

        {/* Scenario Simulator */}
        <div className="bg-[#111827] border border-white/5 rounded-3xl p-8 flex flex-col gap-6">
          <div className="flex items-center gap-3">
            <div className="w-5 h-5 flex items-center justify-center">
              <BarChart3 size={20} className="text-white" strokeWidth={2} />
            </div>
            <span className="text-[#808BA4] font-bold text-xs uppercase tracking-[1.5px]">
              Scenario Simulator
            </span>
          </div>
          <div className="bg-[#1F2937] border border-white/5 rounded-xl p-5 flex flex-col gap-4">
            <span className="text-[#E5E7EB] font-semibold text-base leading-[26px]">
              Impact of $500/mo additional debt payment:
            </span>
            <div className="flex items-center gap-3">
              <span className="bg-[#EF4444]/20 border border-[#EF4444]/30 rounded px-3 py-1 text-[#EF4444] font-bold text-sm leading-[21px]">
                -14 Months
              </span>
              <span className="text-[#CBD5E1] font-semibold text-sm leading-[21px]">
                to debt free
              </span>
            </div>
          </div>
        </div>

        {/* Daily Analysis */}
        <div className="bg-[#111827] border border-white/5 rounded-3xl p-8 flex flex-col gap-6">
          <div className="flex items-center gap-3">
            <div className="w-5 h-5 flex items-center justify-center">
              <Zap size={20} className="text-white" strokeWidth={2} />
            </div>
            <span className="text-[#808BA4] font-bold text-xs uppercase tracking-[1.5px]">
              Daily Analysis
            </span>
          </div>
          <p className="text-[#E5E7EB] font-bold text-lg leading-[25px]">
            {movedToSavings > 0
              ? `${movedToSavings.toLocaleString()} moved to High-Yield Savings so far. Cash flow remains 12% above target.`
              : 'Cash flow is 12% above target. Recommend moving $2,400 to High-Yield Savings.'}
          </p>
          <button
            type="button"
            onClick={handleExecuteTransfer}
            disabled={transferStatus !== 'idle'}
            className="w-full h-14 bg-[#2563EB] shadow-[0_0_20px_rgba(37,99,235,0.15)] rounded-xl flex items-center justify-center gap-3 text-white font-bold text-base active:scale-95 transition-transform disabled:opacity-80"
          >
            {transferStatus === 'processing' ? (
              <>
                Processing Transfer
                <Loader2 size={16} className="animate-spin" />
              </>
            ) : transferStatus === 'done' ? (
              <>
                Transfer Complete
                <CheckCircle2 size={16} />
              </>
            ) : (
              <>
                Execute Transfer
                <ArrowRight size={16} />
              </>
            )}
          </button>
        </div>
      </div>
    </AppShell>
  );
}
