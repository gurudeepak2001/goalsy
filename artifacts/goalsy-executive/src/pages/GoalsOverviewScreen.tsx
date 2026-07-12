import { Target, Shield, Plane, TrendingUp, Plus, CheckCircle2 } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import AppHeader from '@/components/AppHeader';
import AppShell from '@/components/AppShell';
import Avatar from '@/components/Avatar';
import SectionLabel from '@/components/SectionLabel';
import GoalCard from '@/components/GoalCard';

function SummaryCard({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent: string;
}) {
  return (
    <div className="bg-gradient-to-b from-[#111827] to-[#0F1625] border border-[#1A2238] rounded-2xl p-4 flex-1 flex flex-col shadow-lg shadow-black/40">
      <div className={`text-[26px] font-black leading-7 ${accent}`}>{value}</div>
      <div className="text-[#64748B] text-[10px] uppercase tracking-[0.15em] font-bold mt-2">{label}</div>
    </div>
  );
}

export default function GoalsOverviewScreen() {
  return (
    <AppShell activeTab="goals" header={<AppHeader showSecureMode rightElement={<Avatar fallback="AL" />} />}>
      <div className="pt-2">
        <p className="text-[#64748B] text-sm font-medium">Financial Targets</p>
        <h1 className="text-white font-black text-[32px] leading-9 tracking-tight mt-1">Goals</h1>
      </div>

      <div className="flex gap-3 mt-6">
        <SummaryCard label="Total Goals" value="6" accent="text-white" />
        <SummaryCard label="Completed" value="2" accent="text-[#22C55E]" />
        <SummaryCard label="In Progress" value="4" accent="text-[#2563EB]" />
      </div>

      <div className="mt-8">
        <div className="flex items-center justify-between mb-3">
          <SectionLabel text="ACTIVE GOALS" accentBar className="mb-0" />
          <button
            onClick={() => toast({ title: 'New Goal', description: 'Goal creation form coming soon.' })}
            className="bg-[#2563EB] hover:bg-[#1D4ED8] text-white rounded-full p-2.5 transition-colors shadow-[0_0_12px_rgba(37,99,235,0.35)]"
            aria-label="Add new goal"
          >
            <Plus size={18} />
          </button>
        </div>

        <div className="flex flex-col gap-3">
          <GoalCard
            icon={<Shield size={18} />}
            title="Emergency Fund"
            subtitle="6 months of expenses secured"
            progress={74}
            current="$18,420"
            target="$25,000"
            color="#22C55E"
            status="On Track"
          />
          <GoalCard
            icon={<TrendingUp size={18} />}
            title="Investment Portfolio"
            subtitle="Diversified long-term growth"
            progress={68}
            current="$67,500"
            target="$100,000"
            color="#2563EB"
            status="On Track"
          />
          <GoalCard
            icon={<Plane size={18} />}
            title="Vacation Fund"
            subtitle="Annual travel reserve"
            progress={40}
            current="$3,200"
            target="$8,000"
            color="#F59E0B"
            status="Needs Attention"
          />
        </div>
      </div>

      <div className="mt-8">
        <SectionLabel text="COMPLETED GOALS" accentBar />
        <div className="bg-[#0F1625] border border-[#1A2238] rounded-2xl p-5 flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="bg-[#22C55E]/10 rounded-xl p-2.5 text-[#22C55E]">
                <Target size={18} />
              </div>
              <div>
                <div className="text-white font-bold text-sm">Pay off student loans</div>
                <div className="text-[#64748B] text-xs mt-0.5">$32,000 eliminated</div>
              </div>
            </div>
            <div className="text-[#22C55E] text-[10px] font-bold tracking-[0.15em] uppercase bg-[#22C55E]/10 px-2.5 py-1 rounded-full border border-[#22C55E]/20">
              DONE
            </div>
          </div>
          <div className="h-px bg-[#1A2238]" />
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="bg-[#22C55E]/10 rounded-xl p-2.5 text-[#22C55E]">
                <Target size={18} />
              </div>
              <div>
                <div className="text-white font-bold text-sm">Build $10k starter emergency fund</div>
                <div className="text-[#64748B] text-xs mt-0.5">Completed in March 2024</div>
              </div>
            </div>
            <div className="text-[#22C55E] text-[10px] font-bold tracking-[0.15em] uppercase bg-[#22C55E]/10 px-2.5 py-1 rounded-full border border-[#22C55E]/20">
              DONE
            </div>
          </div>
        </div>
      </div>

      <div className="mt-6 bg-[#0F1625] border border-[#1A2238] rounded-2xl p-5 mb-6">
        <div className="flex items-center gap-3">
          <div className="bg-[#2563EB] rounded-xl p-2.5 text-white">
            <Target size={18} />
          </div>
          <div className="flex-1">
            <div className="text-white font-bold text-sm">Create a new goal</div>
            <div className="text-[#64748B] text-xs mt-0.5">Define a target and timeline</div>
          </div>
          <button
            onClick={() => toast({ title: 'New Goal', description: 'Goal creation form coming soon.' })}
            className="text-[#2563EB] text-sm font-bold"
          >
            Add
          </button>
        </div>
      </div>
    </AppShell>
  );
}
