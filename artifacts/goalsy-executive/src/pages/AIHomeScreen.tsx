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
  TrendingDown,
} from 'lucide-react';
import { useLocation } from 'wouter';
import { toast } from '@/hooks/use-toast';
import AppHeader from '@/components/AppHeader';
import AppShell from '@/components/AppShell';
import { simulateAsync } from '@/lib/mockData';
import {
  useListGoals,
  useGetFinancialProfile,
  useGetScore,
} from '@workspace/api-client-react';

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatDollars(n: number): string {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  return `$${Math.round(n).toLocaleString()}`;
}

const GOAL_TYPE_COLORS: Record<string, string> = {
  home_purchase: '#22C55E',
  retirement: '#3B82F6',
  education: '#F59E0B',
  emergency_fund: '#10B981',
  investment: '#8B5CF6',
  auto_purchase: '#F97316',
  other: '#6B7280',
};

// ── Types ─────────────────────────────────────────────────────────────────────

type FP = {
  annualIncome: number | null;
  monthlyExpenses: number | null;
  netWorth: number | null;
  savingsRate: number | null; // monthly $ amount since the field rename
  riskTolerance: string | null;
  primaryGoalType: string | null;
} | null;

type GoalRow = {
  id: string;
  name: string;
  type: string;
  targetAmount: number;
  currentAmount: number;
  monthlyContribution: number;
  status: string;
  targetDate?: string | null;
  createdAt: string;
  priority?: number;
};

// ── Priority-goal picker ──────────────────────────────────────────────────────

type PriorityItem = {
  goal: GoalRow;
  progress: number;
  status: 'behind' | 'on_track' | 'no_data';
  estimatedMonths: number | null;
};

function pickPriorityGoal(goals: GoalRow[] | undefined): PriorityItem | null {
  const active = (goals ?? []).filter((g) => g.status !== 'deleted' && g.targetAmount > 0);
  if (!active.length) return null;

  const pinned = active.filter((g) => (g.priority ?? 1) > 1);
  if (pinned.length > 0) {
    const g = pinned.reduce((best, cur) => (cur.priority ?? 1) > (best.priority ?? 1) ? cur : best);
    const progress = Math.min(1, g.currentAmount / g.targetAmount);
    const estimatedMonths =
      g.monthlyContribution > 0 && g.targetAmount > g.currentAmount
        ? Math.ceil((g.targetAmount - g.currentAmount) / g.monthlyContribution)
        : null;
    const nowP = new Date();
    let status: PriorityItem['status'] = 'no_data';
    if (g.targetDate) {
      const totalMs = new Date(g.targetDate).getTime() - new Date(g.createdAt).getTime();
      const elapsedMs = nowP.getTime() - new Date(g.createdAt).getTime();
      if (totalMs > 0) {
        const expectedAmount = g.targetAmount * Math.min(1, Math.max(0, elapsedMs / totalMs));
        status = g.currentAmount < expectedAmount * 0.9 ? 'behind' : 'on_track';
      }
    }
    return { goal: g, progress, status, estimatedMonths };
  }

  const now = new Date();
  const MS_PER_MONTH = 30.44 * 24 * 60 * 60 * 1000;

  const scored = active.map((g) => {
    const progress = Math.min(1, g.currentAmount / g.targetAmount);
    const targetDate = g.targetDate ? new Date(g.targetDate) : null;
    let status: PriorityItem['status'] = 'no_data';
    let urgency = 0;

    if (targetDate) {
      const totalMs = targetDate.getTime() - new Date(g.createdAt).getTime();
      const elapsedMs = now.getTime() - new Date(g.createdAt).getTime();
      if (totalMs > 0) {
        const expectedAmount = g.targetAmount * Math.min(1, Math.max(0, elapsedMs / totalMs));
        if (g.currentAmount < expectedAmount * 0.9) {
          status = 'behind';
          urgency = 200 + (expectedAmount - g.currentAmount);
        } else {
          urgency = 100 - (targetDate.getTime() - now.getTime()) / MS_PER_MONTH;
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

// ── Intelligence computations ─────────────────────────────────────────────────

/** Derive the single most impactful action from the user's real data. */
function computeStrategicRec(fp: FP, goals: GoalRow[], priorityItem: PriorityItem | null) {
  const active = goals.filter((g) => g.status === 'active' && g.targetAmount > 0);

  // 1. Behind on priority goal with a target date → show required boost
  if (priorityItem?.status === 'behind' && priorityItem.goal.monthlyContribution > 0 && priorityItem.goal.targetDate) {
    const g = priorityItem.goal;
    const remaining = g.targetAmount - g.currentAmount;
    const monthsLeft = (new Date(g.targetDate!).getTime() - Date.now()) / (30.44 * 24 * 60 * 60 * 1000);
    if (monthsLeft > 0) {
      const needed = Math.ceil(remaining / monthsLeft);
      const boost = needed - g.monthlyContribution;
      if (boost > 0) {
        return {
          title: `Boost ${g.name}`,
          subtitle: `+${formatDollars(boost)}/mo gets you back on schedule`,
          subtitleColor: '#F59E0B',
          confidence: 87,
        };
      }
    }
  }

  // 2. Expense ratio too high (> 75% of income)
  if (fp?.annualIncome && fp.monthlyExpenses) {
    const monthlyIncome = fp.annualIncome / 12;
    const ratio = fp.monthlyExpenses / monthlyIncome;
    if (ratio > 0.75) {
      const savingsOpp = Math.round((fp.monthlyExpenses - monthlyIncome * 0.65) / 50) * 50;
      return {
        title: 'Trim Monthly Expenses',
        subtitle: `Cutting ${formatDollars(savingsOpp)}/mo brings ratio to 65%`,
        subtitleColor: '#22C55E',
        confidence: Math.min(97, Math.round(78 + ratio * 20)),
      };
    }
  }

  // 3. Active goal with zero contribution
  const unfundedGoal = active.find((g) => g.monthlyContribution === 0);
  if (unfundedGoal) {
    const monthlyIncome = fp?.annualIncome ? fp.annualIncome / 12 : 0;
    const suggested = monthlyIncome > 0
      ? Math.max(100, Math.round(monthlyIncome * 0.05 / 100) * 100)
      : 200;
    return {
      title: `Fund ${unfundedGoal.name}`,
      subtitle: `Start at ${formatDollars(suggested)}/mo to build momentum`,
      subtitleColor: '#22C55E',
      confidence: 83,
    };
  }

  // 4. Savings rate below 10% of income
  if (fp?.annualIncome && fp.annualIncome > 0) {
    const monthlyIncome = fp.annualIncome / 12;
    const currentSavings = fp.savingsRate ?? 0;
    if (currentSavings / monthlyIncome < 0.10) {
      const target = Math.max(100, Math.round(monthlyIncome * 0.10 / 50) * 50);
      return {
        title: 'Grow Your Savings',
        subtitle: `${formatDollars(target)}/mo saved reaches a 10% savings rate`,
        subtitleColor: '#22C55E',
        confidence: 79,
      };
    }
  }

  // 5. All signals healthy → reinforce momentum
  const totalContribs = active.reduce((s, g) => s + g.monthlyContribution, 0);
  return {
    title: 'Maintain Momentum',
    subtitle: totalContribs > 0
      ? `${formatDollars(totalContribs)}/mo working across ${active.length} goal${active.length !== 1 ? 's' : ''}`
      : 'Add monthly contributions to start building wealth',
    subtitleColor: '#22C55E',
    confidence: 91,
  };
}

/** Project net worth to year-end using contributions + monthly savings. */
function computeForecast(fp: FP, goals: GoalRow[]) {
  const now = new Date();
  const yearEnd = now.getFullYear();
  // Remaining months this year (fractional)
  const monthsLeft = 12 - now.getMonth() - 1 + (1 - (now.getDate() - 1) / 31);
  const currentNetWorth = fp?.netWorth ?? null;
  const monthlySavings = fp?.savingsRate ?? 0;
  const active = goals.filter((g) => g.status === 'active');
  const totalContribs = active.reduce((s, g) => s + g.monthlyContribution, 0);

  if (currentNetWorth === null) {
    return { projectedNetWorth: null, currentNetWorth: null, growthPct: null, yearEnd, hasData: false };
  }

  const monthlyGrowth = monthlySavings + totalContribs;
  const projected = currentNetWorth + monthlyGrowth * monthsLeft;
  const growthPct = currentNetWorth !== 0
    ? ((projected - currentNetWorth) / Math.abs(currentNetWorth)) * 100
    : null;

  return { projectedNetWorth: projected, currentNetWorth, growthPct, yearEnd, hasData: true };
}

/** Show the impact of a modest contribution boost on the goal that benefits most. */
function computeScenario(fp: FP, goals: GoalRow[], priorityItem: PriorityItem | null) {
  const active = goals.filter(
    (g) => g.status === 'active' && g.monthlyContribution > 0 && g.targetAmount > g.currentAmount,
  );
  if (!active.length) return { hasData: false, goalName: '', boostAmount: 0, monthsSaved: 0 };

  // Prefer the priority goal if it has a contribution; otherwise pick the biggest remaining balance
  const targetGoal =
    (priorityItem && active.find((g) => g.id === priorityItem.goal.id)) ??
    active.sort((a, b) => (b.targetAmount - b.currentAmount) - (a.targetAmount - a.currentAmount))[0];

  // Boost = 10% of monthly surplus (capped $50–$500), or 10% of current contribution
  const monthlyIncome = fp?.annualIncome ? fp.annualIncome / 12 : 0;
  const totalContribs = active.reduce((s, g) => s + g.monthlyContribution, 0);
  const surplus = monthlyIncome > 0
    ? Math.max(0, monthlyIncome - (fp?.monthlyExpenses ?? 0) - totalContribs - (fp?.savingsRate ?? 0))
    : 0;
  const rawBoost = surplus > 0
    ? Math.round(surplus * 0.10 / 50) * 50
    : Math.round(targetGoal.monthlyContribution * 0.10 / 50) * 50;
  const boostAmount = Math.max(50, Math.min(500, rawBoost));

  const remaining = targetGoal.targetAmount - targetGoal.currentAmount;
  const currentMonths = remaining / targetGoal.monthlyContribution;
  const boostedMonths = remaining / (targetGoal.monthlyContribution + boostAmount);
  const monthsSaved = Math.max(1, Math.round(currentMonths - boostedMonths));

  return { hasData: true, goalName: targetGoal.name, boostAmount, monthsSaved };
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

// ── Skeleton loader ───────────────────────────────────────────────────────────

function CardSkeleton() {
  return (
    <div className="bg-[#111827] border border-white/5 rounded-3xl p-8 flex flex-col gap-6 animate-pulse">
      <div className="flex items-center gap-3">
        <div className="w-5 h-5 rounded bg-[#1F2937]" />
        <div className="h-3 w-36 rounded bg-[#1F2937]" />
      </div>
      <div className="flex flex-col gap-2">
        <div className="h-8 w-48 rounded bg-[#1F2937]" />
        <div className="h-4 w-32 rounded bg-[#1F2937]" />
      </div>
    </div>
  );
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function AIHomeScreen() {
  const [, navigate] = useLocation();
  const [transferStatus, setTransferStatus] = useState<'idle' | 'processing' | 'done'>('idle');
  const [movedToSavings, setMovedToSavings] = useState(0);

  const { data: goalsData, isLoading: goalsLoading } = useListGoals();
  const { data: fpData, isLoading: fpLoading } = useGetFinancialProfile();
  const { isLoading: scoreLoading } = useGetScore();

  const goals = (goalsData ?? []) as GoalRow[];
  const fp: FP = (fpData as { profile?: FP } | undefined)?.profile ?? null;
  const isLoading = goalsLoading || fpLoading || scoreLoading;

  const priorityItem = pickPriorityGoal(goals);
  const rec = computeStrategicRec(fp, goals, priorityItem);
  const forecast = computeForecast(fp, goals);
  const scenario = computeScenario(fp, goals, priorityItem);

  // Daily Analysis — real cash flow numbers
  const activeGoals = goals.filter((g) => g.status === 'active');
  const monthlyIncome = fp?.annualIncome ? fp.annualIncome / 12 : 0;
  const totalActiveContribs = activeGoals.reduce((s, g) => s + g.monthlyContribution, 0);
  const monthlySavings = fp?.savingsRate ?? 0;
  const totalOutflows = (fp?.monthlyExpenses ?? 0) + totalActiveContribs + monthlySavings;
  const surplus = monthlyIncome > 0 ? monthlyIncome - totalOutflows : 0;
  const surplusPct = monthlyIncome > 0 ? Math.round((surplus / monthlyIncome) * 100) : null;
  const recommendedTransfer = Math.max(0, Math.round(surplus * 0.4 / 100) * 100);

  const handleExecuteTransfer = async () => {
    if (transferStatus !== 'idle') return;
    setTransferStatus('processing');
    const amount = recommendedTransfer > 0 ? recommendedTransfer : 2400;
    await simulateAsync(amount, 1500);
    setTransferStatus('done');
    setMovedToSavings((prev) => prev + amount);
    toast({ title: 'Transfer Complete', description: `${formatDollars(amount)} moved to High-Yield Savings.` });
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

        {/* ── Top Priority Goal ────────────────────────────────────────── */}
        {priorityItem && (
          <TopGoalCard item={priorityItem} onPress={() => navigate(`/goals/${priorityItem.goal.id}`)} />
        )}

        {/* ── Strategic Recommendation ─────────────────────────────────── */}
        {isLoading ? <CardSkeleton /> : (
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
                {rec.title}
              </h2>
              <span className="font-bold text-base leading-6" style={{ color: rec.subtitleColor }}>
                {rec.subtitle}
              </span>
            </div>
            <div className="flex items-center justify-between pt-4 border-t border-white/5">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: rec.confidence >= 85 ? '#22C55E' : '#F59E0B' }} />
                <span className="text-[#CBD5E1] font-semibold text-sm leading-[21px]">Confidence</span>
              </div>
              <span className="text-white font-bold text-base leading-6">{rec.confidence}%</span>
            </div>
          </div>
        )}

        {/* ── Financial Forecast ───────────────────────────────────────── */}
        {isLoading ? <CardSkeleton /> : (
          <div className="bg-[#111827] border border-white/5 rounded-3xl p-8 flex flex-col gap-6">
            <div className="flex items-center gap-3">
              <div className="w-5 h-5 flex items-center justify-center">
                <TrendingUp size={20} className="text-white" strokeWidth={2} />
              </div>
              <span className="text-[#808BA4] font-bold text-xs uppercase tracking-[1.5px]">
                Financial Forecast
              </span>
              <span className="ml-auto text-[#374151] font-bold text-[9px] uppercase tracking-[0.8px] border border-[#1F2937] rounded px-1.5 py-px flex-shrink-0">
                Projected
              </span>
            </div>
            {forecast.hasData ? (
              <div className="flex flex-col gap-1">
                <span className="text-[#CBD5E1] font-semibold text-sm leading-[21px]">
                  Projected Net Worth (Dec {forecast.yearEnd})
                </span>
                <div className="flex items-end gap-3">
                  <span className="text-white font-bold text-[36px] leading-9">
                    {formatDollars(forecast.projectedNetWorth!)}
                  </span>
                  {forecast.growthPct !== null && (
                    <span
                      className="font-bold text-base leading-6 mb-1"
                      style={{ color: forecast.growthPct >= 0 ? '#22C55E' : '#EF4444' }}
                    >
                      {forecast.growthPct >= 0 ? '+' : ''}{forecast.growthPct.toFixed(1)}%
                    </span>
                  )}
                </div>
                <span className="text-[#4B5563] font-semibold text-xs mt-1">
                  Based on current net worth + contributions + monthly savings
                </span>
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                <span className="text-[#CBD5E1] font-semibold text-base leading-6">
                  Complete your financial profile to see your year-end forecast.
                </span>
                <button
                  type="button"
                  onClick={() => navigate('/financial-connection?mode=edit')}
                  className="self-start text-[#2563EB] font-bold text-sm underline"
                >
                  Update Profile →
                </button>
              </div>
            )}
          </div>
        )}

        {/* ── Scenario Simulator ───────────────────────────────────────── */}
        {isLoading ? <CardSkeleton /> : (
          <div className="bg-[#111827] border border-white/5 rounded-3xl p-8 flex flex-col gap-6">
            <div className="flex items-center gap-3">
              <div className="w-5 h-5 flex items-center justify-center">
                <BarChart3 size={20} className="text-white" strokeWidth={2} />
              </div>
              <span className="text-[#808BA4] font-bold text-xs uppercase tracking-[1.5px]">
                Scenario Simulator
              </span>
              {scenario.hasData && (
                <span className="ml-auto text-[#374151] font-bold text-[9px] uppercase tracking-[0.8px] border border-[#1F2937] rounded px-1.5 py-px flex-shrink-0">
                  Estimated
                </span>
              )}
            </div>
            {scenario.hasData ? (
              <div className="bg-[#1F2937] border border-white/5 rounded-xl p-5 flex flex-col gap-4">
                <span className="text-[#E5E7EB] font-semibold text-base leading-[26px]">
                  If you add {formatDollars(scenario.boostAmount)}/mo to {scenario.goalName}:
                </span>
                <div className="flex items-center gap-3">
                  <span className="bg-[#22C55E]/20 border border-[#22C55E]/30 rounded px-3 py-1 text-[#22C55E] font-bold text-sm leading-[21px]">
                    -{scenario.monthsSaved} Month{scenario.monthsSaved !== 1 ? 's' : ''}
                  </span>
                  <span className="text-[#CBD5E1] font-semibold text-sm leading-[21px]">
                    to reach your goal
                  </span>
                </div>
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                <span className="text-[#CBD5E1] font-semibold text-base leading-6">
                  Set up an active goal with a monthly contribution to run scenarios.
                </span>
                <button
                  type="button"
                  onClick={() => navigate('/goals')}
                  className="self-start text-[#2563EB] font-bold text-sm underline"
                >
                  Go to Goals →
                </button>
              </div>
            )}
          </div>
        )}

        {/* ── Daily Analysis ───────────────────────────────────────────── */}
        <div className="bg-[#111827] border border-white/5 rounded-3xl p-8 flex flex-col gap-6">
          <div className="flex items-center gap-3">
            <div className="w-5 h-5 flex items-center justify-center">
              <Zap size={20} className="text-white" strokeWidth={2} />
            </div>
            <span className="text-[#808BA4] font-bold text-xs uppercase tracking-[1.5px]">
              Daily Analysis
            </span>
          </div>

          {isLoading ? (
            <div className="h-12 w-full rounded bg-[#1F2937] animate-pulse" />
          ) : surplusPct !== null ? (
            <>
              <div className="flex flex-col gap-1">
                {movedToSavings > 0 ? (
                  <p className="text-[#E5E7EB] font-bold text-lg leading-[25px]">
                    {formatDollars(movedToSavings)} moved to savings today.{' '}
                    {surplus > 0
                      ? `Monthly surplus is ${formatDollars(surplus)}.`
                      : 'Keep up the discipline.'}
                  </p>
                ) : surplus > 0 ? (
                  <p className="text-[#E5E7EB] font-bold text-lg leading-[25px]">
                    Cash flow is{' '}
                    <span className="text-[#22C55E]">{surplusPct}% above outflows</span>
                    {recommendedTransfer > 0
                      ? `. Consider moving ${formatDollars(recommendedTransfer)} to High-Yield Savings.`
                      : '.'}
                  </p>
                ) : (
                  <div className="flex items-start gap-2">
                    <TrendingDown size={18} className="text-[#EF4444] flex-shrink-0 mt-0.5" />
                    <p className="text-[#E5E7EB] font-bold text-lg leading-[25px]">
                      Monthly outflows exceed income by{' '}
                      <span className="text-[#EF4444]">{formatDollars(Math.abs(surplus))}</span>. Review expenses or reduce contributions temporarily.
                    </p>
                  </div>
                )}
              </div>
              {surplus > 0 && recommendedTransfer > 0 && (
                <button
                  type="button"
                  onClick={handleExecuteTransfer}
                  disabled={transferStatus !== 'idle'}
                  className="w-full h-14 bg-[#2563EB] shadow-[0_0_20px_rgba(37,99,235,0.15)] rounded-xl flex items-center justify-center gap-3 text-white font-bold text-base active:scale-95 transition-transform disabled:opacity-80"
                >
                  {transferStatus === 'processing' ? (
                    <><span>Processing Transfer</span><Loader2 size={16} className="animate-spin" /></>
                  ) : transferStatus === 'done' ? (
                    <><span>Transfer Complete</span><CheckCircle2 size={16} /></>
                  ) : (
                    <><span>Move {formatDollars(recommendedTransfer)} to Savings</span><ArrowRight size={16} /></>
                  )}
                </button>
              )}
            </>
          ) : (
            <p className="text-[#CBD5E1] font-semibold text-base leading-[26px]">
              Add your income and expenses in your financial profile to see your daily cash flow analysis.
            </p>
          )}
        </div>

      </div>
    </AppShell>
  );
}
