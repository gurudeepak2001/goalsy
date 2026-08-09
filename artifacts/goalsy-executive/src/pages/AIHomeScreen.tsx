import { useState } from 'react';
import {
  ArrowRight,
  Lightbulb,
  TrendingUp,
  BarChart3,
  Zap,
  Loader2,
  CheckCircle2,
  Target,
  AlertTriangle,
} from 'lucide-react';
import { useLocation } from 'wouter';
import { toast } from '@/hooks/use-toast';
import AppHeader from '@/components/AppHeader';
import AppShell from '@/components/AppShell';
import { simulateAsync } from '@/lib/mockData';
import { useListGoals } from '@workspace/api-client-react';

// ── Helpers (duplicated from GoalDetailScreen to avoid a shared-util dep) ────

function formatDollars(n: number): string {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `$${Math.round(n / 1_000)}K`;
  return `$${n.toLocaleString()}`;
}

const GOAL_TYPE_COLORS: Record<string, string> = {
  home_purchase: '#22C55E',
  retirement: '#3B82F6',
  education: '#F59E0B',
  emergency_fund: '#10B981',
  investment: '#8B5CF6',
  other: '#6B7280',
};

// ── Priority-goal picker ──────────────────────────────────────────────────────

type PriorityItem = {
  goal: { id: string; name: string; type: string; targetAmount: number; currentAmount: number; monthlyContribution: number; createdAt: string; targetDate?: string | null; status: string };
  progress: number;
  status: 'behind' | 'on_track' | 'no_data';
  estimatedMonths: number | null;
};

function pickPriorityGoal(goals: { id: string; name: string; type: string; targetAmount: number; currentAmount: number; monthlyContribution: number; createdAt: string; targetDate?: string | null; status: string }[] | undefined): PriorityItem | null {
  const active = (goals ?? []).filter((g) => g.status !== 'deleted' && g.targetAmount > 0);
  if (!active.length) return null;

  const now = new Date();
  const msPerMonth = 30.44 * 24 * 60 * 60 * 1000;

  const scored = active.map((g) => {
    const progress = Math.min(1, g.currentAmount / g.targetAmount);
    const createdAt = new Date(g.createdAt);
    const targetDate = g.targetDate ? new Date(g.targetDate) : null;
    let status: 'behind' | 'on_track' | 'no_data' = 'no_data';
    let urgency = 0;

    if (targetDate) {
      const totalMs = targetDate.getTime() - createdAt.getTime();
      const elapsedMs = now.getTime() - createdAt.getTime();
      if (totalMs > 0) {
        const expectedFraction = Math.min(1, Math.max(0, elapsedMs / totalMs));
        const expectedAmount = g.targetAmount * expectedFraction;
        if (g.currentAmount < expectedAmount * 0.9) {
          status = 'behind';
          urgency = 200 + (expectedAmount - g.currentAmount);
        } else {
          urgency = 100 - (targetDate.getTime() - now.getTime()) / msPerMonth;
        }
      }
    } else {
      urgency = (1 - progress) * 10;
    }

    const estimatedMonths =
      g.monthlyContribution > 0 && g.targetAmount > g.currentAmount
        ? Math.ceil((g.targetAmount - g.currentAmount) / g.monthlyContribution)
        : null;

    return { goal: g, progress, status, urgency, estimatedMonths };
  });

  scored.sort((a, b) => b.urgency - a.urgency);
  const top = scored[0];
  return { goal: top.goal, progress: top.progress, status: top.status, estimatedMonths: top.estimatedMonths };
}

// ── Top Priority Goal Card ────────────────────────────────────────────────────

function TopGoalCard({ item, onPress }: { item: PriorityItem; onPress: () => void }) {
  const { goal, progress, status, estimatedMonths } = item;
  const color = GOAL_TYPE_COLORS[goal.type] ?? '#6B7280';
  const pct = Math.round(progress * 100);

  return (
    <button
      type="button"
      onClick={onPress}
      className="w-full bg-[#111827] border border-white/5 rounded-3xl p-8 flex flex-col gap-5 text-left active:scale-[0.98] transition-transform"
      style={{ borderLeftWidth: '4px', borderLeftColor: color }}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Target size={18} style={{ color }} />
          <span className="text-[#808BA4] font-bold text-xs uppercase tracking-[1.5px]">
            Top Priority Goal
          </span>
        </div>
        <ArrowRight size={18} className="text-[#808BA4]" />
      </div>

      <div className="flex flex-col gap-1">
        <h2 className="text-white font-bold text-[26px] leading-[33px]">{goal.name}</h2>
        {status === 'behind' ? (
          <div className="flex items-center gap-2">
            <AlertTriangle size={14} className="text-[#F59E0B]" />
            <span className="text-[#F59E0B] font-bold text-sm">Behind Schedule — tap to adjust</span>
          </div>
        ) : estimatedMonths ? (
          <span className="font-bold text-sm" style={{ color }}>
            On track — est. {estimatedMonths} month{estimatedMonths === 1 ? '' : 's'} to go
          </span>
        ) : (
          <span className="text-[#808BA4] font-bold text-sm">{pct}% complete</span>
        )}
      </div>

      <div className="relative h-1.5 bg-[#1F2937] rounded-full">
        <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: color }} />
      </div>

      <div className="flex items-center justify-between border-t border-white/5 pt-3">
        <span className="text-[#808BA4] font-semibold text-sm">
          {formatDollars(goal.currentAmount)} of {formatDollars(goal.targetAmount)}
        </span>
        <span className="text-[#808BA4] font-semibold text-sm">
          {goal.monthlyContribution > 0
            ? `$${goal.monthlyContribution.toLocaleString()}/mo`
            : 'No contribution set'}
        </span>
      </div>
    </button>
  );
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function AIHomeScreen() {
  const [, navigate] = useLocation();
  const [transferStatus, setTransferStatus] = useState<'idle' | 'processing' | 'done'>('idle');
  const [movedToSavings, setMovedToSavings] = useState(0);

  const { data: goalsData } = useListGoals();
  const priorityItem = pickPriorityGoal(goalsData as Parameters<typeof pickPriorityGoal>[0]);

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
      headerHeight={80}
      headerClassName="px-8 bg-[#05070A]/90 backdrop-blur-[12px]"
      header={<AppHeader dashboard dashboardTitle="Strategic Intelligence" showNotification={false} />}
    >
      <div className="flex flex-col gap-6">

        {/* ── Top Priority Goal insight card ──────────────────────────── */}
        {priorityItem && (
          <TopGoalCard item={priorityItem} onPress={() => navigate(`/goals/${priorityItem.goal.id}`)} />
        )}

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
