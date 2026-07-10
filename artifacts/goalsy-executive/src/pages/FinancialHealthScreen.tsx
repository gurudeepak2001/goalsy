import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  PiggyBank,
  CreditCard,
  Lightbulb,
  ShieldCheck,
  ArrowRight,
  ArrowUpRight,
  Minus,
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
  trend,
  trendValue,
  icon: Icon,
}: {
  label: string;
  value: string;
  trend: 'up' | 'down' | 'neutral';
  trendValue: string;
  icon: React.ElementType;
}) {
  const trendColor = trend === 'up' ? 'text-[#22C55E]' : trend === 'down' ? 'text-[#EF4444]' : 'text-[#94A3B8]';
  const TrendIcon = trend === 'up' ? ArrowUpRight : trend === 'down' ? TrendingDown : Minus;

  return (
    <div className="bg-[#0F1625] border border-[#1A2238] rounded-xl p-3 flex-1 flex flex-col">
      <div className="flex items-center justify-between mb-2">
        <span className="text-[#64748B] text-[10px] uppercase tracking-wider font-bold">{label}</span>
        <Icon size={14} className="text-[#475569]" />
      </div>
      <div className="text-white text-lg font-black">{value}</div>
      <div className={`flex items-center gap-1 text-xs font-medium mt-1 ${trendColor}`}>
        <TrendIcon size={12} />
        {trendValue}
      </div>
    </div>
  );
}

export default function FinancialHealthScreen() {
  return (
    <AppShell activeTab="score" header={<AppHeader rightElement={<Avatar fallback="AL" />} />}>
      <div className="pt-2">
        <p className="text-[#94A3B8] text-sm">Financial Assessment</p>
        <h1 className="text-white font-black text-3xl leading-tight tracking-tight mt-1">Financial Health</h1>
        <p className="text-[#94A3B8] text-sm mt-2">Comprehensive analysis of your fiscal position.</p>
      </div>

      <div className="mt-6 flex flex-col items-center">
        <div className="bg-[#0F1625] border border-[#1A2238] rounded-2xl p-6 w-full flex flex-col items-center">
          <CircularScoreRing value={78} size={140} strokeWidth={10} color="#22C55E" label="78" sublabel="HEALTH SCORE" showGlow={false} />
          <div className="flex items-center gap-2 mt-4">
            <div className="w-2 h-2 bg-[#22C55E] rounded-full" />
            <span className="text-[#22C55E] text-sm font-semibold">Excellent Standing</span>
          </div>
        </div>
      </div>

      <div className="flex gap-3 mt-5">
        <MetricCard label="Income" value="$8.4k" trend="up" trendValue="+12%" icon={DollarSign} />
        <MetricCard label="Savings" value="$18.2k" trend="up" trendValue="+4.5%" icon={PiggyBank} />
        <MetricCard label="Debt" value="$4.1k" trend="down" trendValue="-8%" icon={CreditCard} />
      </div>

      <div className="mt-8">
        <SectionLabel text="BUDGET PERFORMANCE" accentBar />
        <div className="bg-[#0F1625] border border-[#1A2238] rounded-xl p-4 flex flex-col gap-5">
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
            icon={<Lightbulb size={18} />}
            title="Savings rate above target"
            subtitle="You're saving 24% of income vs. 20% goal."
          />
          <FeatureCard
            icon={<ShieldCheck size={18} />}
            title="Emergency fund secure"
            subtitle="Current runway covers 6.2 months of expenses."
          />
        </div>
      </div>

      <div className="mt-8">
        <SectionLabel text="RECOMMENDATIONS" accentBar />
        <div className="bg-[#0F1625] border border-[#1A2238] rounded-xl p-4 flex flex-col gap-4">
          {[
            { num: '01', text: 'Increase 401(k) contribution to capture full employer match.' },
            { num: '02', text: 'Refinance high-interest debt while rates stabilize.' },
            { num: '03', text: 'Diversify taxable investments into international index funds.' },
          ].map((item) => (
            <div key={item.num} className="flex items-start gap-3">
              <div className="w-1 h-full min-h-[24px] bg-[#2563EB] rounded-full flex-shrink-0 mt-0.5" />
              <div>
                <span className="text-[#2563EB] text-xs font-bold">{item.num}</span>
                <p className="text-white text-sm mt-0.5 leading-relaxed">{item.text}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-6 bg-[#0F1625] border border-[#1A2238] rounded-xl p-4 flex items-center justify-between">
        <div>
          <div className="text-white font-semibold text-sm">Download Full Report</div>
          <div className="text-[#64748B] text-xs">PDF · Updated today</div>
        </div>
        <button
          onClick={() => toast({ title: 'Report Downloaded', description: 'Your full financial report is ready.' })}
          className="bg-[#2563EB] hover:bg-[#1D4ED8] text-white rounded-xl p-2.5 transition-colors"
        >
          <ArrowRight size={18} />
        </button>
      </div>
    </AppShell>
  );
}
