import {
  TrendingDown,
  DollarSign,
  PiggyBank,
  CreditCard,
  Lightbulb,
  ShieldCheck,
  ArrowRight,
  ArrowUpRight,
  Minus,
  ChevronLeft,
} from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import AppHeader from '@/components/AppHeader';
import AppShell from '@/components/AppShell';
import Avatar from '@/components/Avatar';
import SectionLabel from '@/components/SectionLabel';
import CircularScoreRing from '@/components/CircularScoreRing';
import ProgressBar from '@/components/ProgressBar';
import FeatureCard from '@/components/FeatureCard';

function MetricCard({
  label,
  value,
  trendDirection,
  trendColor,
  trendValue,
  icon: Icon,
}: {
  label: string;
  value: string;
  trendDirection: 'up' | 'down' | 'neutral';
  trendColor: string;
  trendValue: string;
  icon: React.ElementType;
}) {
  const TrendIcon = trendDirection === 'up' ? ArrowUpRight : trendDirection === 'down' ? TrendingDown : Minus;

  return (
    <div className="bg-[#0F1625] border border-[#1A2238] rounded-2xl p-4 flex-1 flex flex-col">
      <div className="flex items-center justify-between mb-2">
        <span className="text-[#64748B] text-[9px] uppercase tracking-[0.2em] font-bold">{label}</span>
        <Icon size={14} className="text-[#475569]" />
      </div>
      <div className="text-white text-lg font-black">{value}</div>
      <div className={`flex items-center gap-1 text-xs font-bold mt-1 ${trendColor}`}>
        <TrendIcon size={12} strokeWidth={2.5} />
        {trendValue}
      </div>
    </div>
  );
}

export default function FinancialHealthScreen() {
  return (
    <AppShell activeTab="ai" header={<AppHeader leftElement={<button className="p-2 -ml-2 text-white" aria-label="Go back"><ChevronLeft size={24} /></button>} rightElement={<Avatar fallback="AL" />} showLogo={false} />}>
      <div className="pt-2">
        <p className="text-[#64748B] text-[10px] tracking-[0.2em] uppercase font-bold">Financial Assessment</p>
        <h1 className="text-white font-black text-[32px] leading-9 tracking-tight mt-1">Financial Health</h1>
        <p className="text-[#94A3B8] text-sm mt-2 font-medium">Comprehensive analysis of your fiscal position.</p>
      </div>

      <div className="mt-6 flex flex-col items-center">
        <div className="bg-[#0F1625] border border-[#1A2238] rounded-[24px] p-6 w-full flex flex-col items-center relative overflow-hidden">
          {/* Subtle background glow behind the ring */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-40 h-40 bg-[#22C55E]/10 blur-[50px] rounded-full pointer-events-none" />
          
          <CircularScoreRing value={78} size={160} strokeWidth={10} color="#22C55E" label="78" sublabel="HEALTH SCORE" showGlow={true} />
          
          <div className="flex items-center gap-2 mt-6 bg-[#05070A] border border-[#1A2238] rounded-full px-4 py-2 z-10">
            <div className="w-2 h-2 bg-[#22C55E] rounded-full shadow-[0_0_8px_rgba(34,197,94,0.8)]" />
            <span className="text-[#22C55E] text-[13px] font-bold">Excellent Standing</span>
          </div>
        </div>
      </div>

      <div className="flex gap-3 mt-5">
        <MetricCard label="Income" value="$8.4k" trendDirection="up" trendColor="text-[#22C55E]" trendValue="+12%" icon={DollarSign} />
        <MetricCard label="Savings" value="$18.2k" trendDirection="up" trendColor="text-[#22C55E]" trendValue="+4.5%" icon={PiggyBank} />
        <MetricCard label="Debt" value="$4.1k" trendDirection="down" trendColor="text-[#EF4444]" trendValue="-8%" icon={CreditCard} />
      </div>

      <div className="mt-8">
        <SectionLabel text="BUDGET PERFORMANCE" accentBar />
        <div className="bg-[#0F1625] border border-[#1A2238] rounded-2xl p-5 flex flex-col gap-5">
          <ProgressBar label="Housing" value={82} color="#22C55E" />
          <ProgressBar label="Investments" value={65} color="#2563EB" />
          <ProgressBar label="Discretionary" value={45} color="#F59E0B" />
          <ProgressBar label="Debt Service" value={28} color="#EF4444" />
        </div>
      </div>

      <div className="mt-8">
        <SectionLabel text="INSIGHTS" accentBar />
        <div className="flex flex-col gap-3">
          <FeatureCard
            icon={<Lightbulb size={18} className="text-[#F59E0B]" />}
            title="Savings rate above target"
            subtitle="You're saving 24% of income vs. 20% goal."
          />
          <FeatureCard
            icon={<ShieldCheck size={18} className="text-[#22C55E]" />}
            title="Emergency fund secure"
            subtitle="Current runway covers 6.2 months of expenses."
          />
        </div>
      </div>

      <div className="mt-8">
        <SectionLabel text="RECOMMENDATIONS" accentBar />
        <div className="bg-[#0F1625] border border-[#1A2238] rounded-2xl p-5 flex flex-col gap-5">
          {[
            { num: '01', text: 'Increase 401(k) contribution to capture full employer match.' },
            { num: '02', text: 'Refinance high-interest debt while rates stabilize.' },
            { num: '03', text: 'Diversify taxable investments into international index funds.' },
          ].map((item) => (
            <div key={item.num} className="flex items-start gap-3">
              <div className="bg-[#2563EB]/10 rounded-full p-1.5 flex-shrink-0 mt-0.5">
                <div className="w-1.5 h-1.5 bg-[#2563EB] rounded-full" />
              </div>
              <div>
                <span className="text-[#2563EB] text-xs font-bold">{item.num}</span>
                <p className="text-white text-sm mt-0.5 leading-relaxed">{item.text}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-6 bg-[#0F1625] border border-[#1A2238] rounded-2xl p-5 flex items-center justify-between">
        <div>
          <div className="text-white font-bold text-sm">Download Full Report</div>
          <div className="text-[#64748B] text-xs mt-0.5">PDF · Updated today</div>
        </div>
        <button
          onClick={() => toast({ title: 'Report Downloaded', description: 'Your full financial report is ready.' })}
          className="bg-[#2563EB] hover:bg-[#1D4ED8] text-white rounded-xl p-3 transition-colors shadow-[0_0_12px_rgba(37,99,235,0.35)] flex items-center justify-center"
          aria-label="Download report"
        >
          <ArrowRight size={18} />
        </button>
      </div>
    </AppShell>
  );
}
