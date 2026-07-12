import {
  TrendingUp,
  ShieldAlert,
  Sparkles,
  Wallet,
  ArrowRight,
  ChevronRight,
  Activity,
  PieChart,
  BarChart3,
  ArrowUpRight,
  ArrowDownRight,
} from 'lucide-react';
import { useLocation } from 'wouter';
import { toast } from '@/hooks/use-toast';
import AppHeader from '@/components/AppHeader';
import AppShell from '@/components/AppShell';
import Avatar from '@/components/Avatar';
import SectionLabel from '@/components/SectionLabel';
import InsightCard from '@/components/InsightCard';

interface AIHomeScreenProps {
  activeTab?: 'today' | 'ai';
}

export default function AIHomeScreen({ activeTab = 'ai' }: AIHomeScreenProps) {
  const [, navigate] = useLocation();

  return (
    <AppShell activeTab={activeTab} header={<AppHeader showSecureMode rightElement={<Avatar fallback="AL" />} />}>
      <div className="pt-2">
        <p className="text-[#64748B] text-xs font-bold tracking-[0.25em] uppercase">Executive Briefing</p>
        <h1 className="text-white font-black text-[32px] leading-9 tracking-tight mt-1">
          Good morning, Alexander
        </h1>
      </div>

      <div className="grid grid-cols-2 gap-3 mt-6">
        <InsightCard
          title="Financial Pulse"
          icon={<Activity size={18} />}
          stat="92.4"
          statLabel="HEALTH"
          accent="text-[#22C55E]"
        />
        <InsightCard
          title="Risk Radar"
          icon={<ShieldAlert size={18} />}
          stat="LOW"
          statLabel="RISK LEVEL"
          accent="text-[#22C55E]"
        />
        <InsightCard
          title="Opportunity Engine"
          icon={<Sparkles size={18} />}
          stat="+$4.2k"
          statLabel="THIS MONTH"
          accent="text-[#22C55E]"
        />
        <InsightCard
          title="Cash Flow"
          icon={<Wallet size={18} />}
          stat="$12.8k"
          statLabel="RUNWAY"
          accent="text-white"
        />
      </div>

      <div className="mt-8">
        <SectionLabel
          text="RECOMMENDATIONS"
          accentBar
          rightElement={
            <button
              onClick={() => navigate('/goals')}
              className="text-[#2563EB] text-xs font-bold tracking-wider flex items-center gap-1"
            >
              View All <ArrowRight size={12} />
            </button>
          }
        />
        <div className="flex flex-col gap-3">
          <InsightCard
            variant="row"
            title="Reallocate savings to high-yield account"
            subtitle="Potential +$180 monthly interest"
            icon={<TrendingUp size={18} />}
            stat="HIGH"
            statLabel="PRIORITY"
            accent="text-[#F59E0B]"
          />
          <InsightCard
            variant="row"
            title="Reduce discretionary spending by 12%"
            subtitle="Dining & entertainment trending up"
            icon={<BarChart3 size={18} />}
            stat="MEDIUM"
            statLabel="PRIORITY"
            accent="text-[#2563EB]"
          />
        </div>
      </div>

      <div className="mt-8">
        <SectionLabel text="MARKET INTELLIGENCE" accentBar />
        <div className="flex flex-col gap-3">
          <div className="bg-[#0F1625] border border-[#1A2238] rounded-2xl p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[#2563EB] text-[10px] font-bold tracking-[0.15em] uppercase bg-[#2563EB]/10 px-3 py-1 rounded-full">
                MARKET
              </span>
              <div className="flex items-center gap-1 text-[#22C55E] text-xs font-bold">
                <ArrowUpRight size={12} /> +1.8%
              </div>
            </div>
            <h4 className="text-white font-bold text-sm">S&P 500 reaches quarterly high</h4>
            <p className="text-[#64748B] text-xs mt-1 leading-relaxed">
              Broad market momentum suggests favorable conditions for index exposure.
            </p>
          </div>

          <div className="bg-[#0F1625] border border-[#1A2238] rounded-2xl p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[#F59E0B] text-[10px] font-bold tracking-[0.15em] uppercase bg-[#F59E0B]/10 px-3 py-1 rounded-full">
                RATES
              </span>
              <div className="flex items-center gap-1 text-[#EF4444] text-xs font-bold">
                <ArrowUpRight size={12} /> +0.25%
              </div>
            </div>
            <h4 className="text-white font-bold text-sm">Fed signals higher for longer</h4>
            <p className="text-[#64748B] text-xs mt-1 leading-relaxed">
              Consider locking in fixed-rate liabilities before next cycle.
            </p>
          </div>
        </div>
      </div>

      <div className="mt-8">
        <SectionLabel text="QUICK ACTIONS" accentBar />
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={() => navigate('/financial-health')}
            className="bg-[#0F1625] border border-[#1A2238] rounded-2xl p-4 flex items-center justify-between hover:bg-[#131E35] transition-colors text-left"
          >
            <span className="text-white text-sm font-bold">Review Budget</span>
            <ChevronRight size={16} className="text-[#64748B]" />
          </button>
          <button
            onClick={() => navigate('/goals')}
            className="bg-[#0F1625] border border-[#1A2238] rounded-2xl p-4 flex items-center justify-between hover:bg-[#131E35] transition-colors text-left"
          >
            <span className="text-white text-sm font-bold">Invest Now</span>
            <ChevronRight size={16} className="text-[#64748B]" />
          </button>
          <button
            onClick={() => navigate('/calendar')}
            className="bg-[#0F1625] border border-[#1A2238] rounded-2xl p-4 flex items-center justify-between hover:bg-[#131E35] transition-colors text-left"
          >
            <span className="text-white text-sm font-bold">Transfer Funds</span>
            <ChevronRight size={16} className="text-[#64748B]" />
          </button>
          <button
            onClick={() => navigate('/score')}
            className="bg-[#0F1625] border border-[#1A2238] rounded-2xl p-4 flex items-center justify-between hover:bg-[#131E35] transition-colors text-left"
          >
            <span className="text-white text-sm font-bold">Credit Report</span>
            <PieChart size={16} className="text-[#64748B]" />
          </button>
        </div>
      </div>

      <div className="mt-8 bg-[#0F1625] border border-[#1A2238] rounded-2xl p-5">
        <div className="flex items-center gap-3 mb-4">
          <div className="bg-[#2563EB] rounded-xl p-2.5 text-white">
            <Sparkles size={18} />
          </div>
          <div>
            <div className="text-white font-bold text-sm">Ask Goalsy AI</div>
            <div className="text-[#64748B] text-xs mt-0.5">Get personalized financial guidance</div>
          </div>
        </div>
        <button
          onClick={() => toast({ title: 'Goalsy AI', description: 'AI assistant is ready to help.' })}
          className="w-full bg-[#05070A] border border-[#1A2238] rounded-xl px-4 py-3 flex items-center justify-between hover:bg-[#0A0E17] transition-colors"
        >
          <span className="text-[#475569] text-sm">How can I optimize my portfolio?</span>
          <ArrowRight size={16} className="text-[#2563EB]" />
        </button>
      </div>
    </AppShell>
  );
}
