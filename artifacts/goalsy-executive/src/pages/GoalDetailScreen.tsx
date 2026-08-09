import { useState } from 'react';
import { useParams, useLocation } from 'wouter';
import {
  TrendingUp, CheckCircle2, Clock, AlertTriangle,
  Trophy, Loader2, Trash2, Zap, DollarSign, Target,
} from 'lucide-react';
import AppHeader from '@/components/AppHeader';
import AppShell from '@/components/AppShell';
import ExecutiveButton from '@/components/ExecutiveButton';
import ExecutiveInput from '@/components/ExecutiveInput';
import { toast } from '@/hooks/use-toast';
import { useQueryClient } from '@tanstack/react-query';
import {
  useGetGoal,
  useUpdateGoal,
  useDeleteGoal,
  useGetFinancialProfile,
  getListGoalsQueryKey,
} from '@workspace/api-client-react';
import type { Goal, FinancialProfile } from '@workspace/api-client-react';

// ── Formatting helpers ───────────────────────────────────────────────────────

function formatDollars(n: number): string {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `$${Math.round(n / 1_000)}K`;
  return `$${n.toLocaleString()}`;
}

const TYPE_LABELS: Record<string, string> = {
  home_purchase: 'Home Purchase',
  retirement: 'Retirement',
  education: 'Education',
  emergency_fund: 'Emergency Fund',
  investment: 'Investment Portfolio',
  other: 'Other',
};

const TYPE_COLORS: Record<string, string> = {
  home_purchase: '#22C55E',
  retirement: '#3B82F6',
  education: '#F59E0B',
  emergency_fund: '#10B981',
  investment: '#8B5CF6',
  other: '#6B7280',
};

// ── Roadmap computation (deterministic, no LLM) ──────────────────────────────

type CheckpointStatus = 'reached' | 'behind' | 'upcoming';
type OverallStatus = 'ahead' | 'on_track' | 'behind' | 'complete' | 'no_data';

interface PlanStep {
  icon: 'save' | 'spend' | 'rate' | 'setup';
  label: string;
  description: string;
}

interface Checkpoint {
  pct: 25 | 50 | 75 | 100;
  requiredAmount: number;
  estimatedDate: string | null;
  status: CheckpointStatus;
}

interface RoadmapResult {
  overallStatus: OverallStatus;
  expectedByNow: number | null;
  plan: PlanStep[];
  checkpoints: Checkpoint[];
  estimatedCompletionDate: string | null;
  requiredMonthly: number | null;
}

function computeRoadmap(goal: Goal, fp: FinancialProfile | null | undefined): RoadmapResult {
  const gap = Math.max(0, goal.targetAmount - goal.currentAmount);
  const monthly = goal.monthlyContribution ?? 0;
  const now = new Date();
  const createdAt = new Date(goal.createdAt);
  const targetDate = goal.targetDate ? new Date(goal.targetDate) : null;

  // Months to target date from now
  const msPerMonth = 30.44 * 24 * 60 * 60 * 1000;
  const msToTarget = targetDate ? targetDate.getTime() - now.getTime() : null;
  const monthsToTarget = msToTarget && msToTarget > 0 ? msToTarget / msPerMonth : null;

  // What monthly contribution is needed to hit targetDate
  const requiredMonthly =
    monthsToTarget && gap > 0 ? Math.ceil(gap / monthsToTarget) : null;

  // Estimated months at current monthly pace
  const estimatedMonths = monthly > 0 && gap > 0 ? gap / monthly : null;

  // Estimated completion date
  let estimatedCompletionDate: string | null = null;
  if (goal.currentAmount >= goal.targetAmount) {
    estimatedCompletionDate = 'Complete';
  } else if (estimatedMonths) {
    const d = new Date(now.getTime() + estimatedMonths * msPerMonth);
    estimatedCompletionDate = d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
  }

  // ── Overall status vs target date ────────────────────────────────────────
  let overallStatus: OverallStatus = 'no_data';
  let expectedByNow: number | null = null;

  if (goal.currentAmount >= goal.targetAmount) {
    overallStatus = 'complete';
  } else if (targetDate && goal.targetAmount > 0) {
    const totalMs = targetDate.getTime() - createdAt.getTime();
    const elapsedMs = now.getTime() - createdAt.getTime();
    if (totalMs > 0) {
      const fraction = Math.min(1, Math.max(0, elapsedMs / totalMs));
      expectedByNow = Math.round(goal.targetAmount * fraction);
      if (goal.currentAmount >= expectedByNow * 1.05) {
        overallStatus = 'ahead';
      } else if (goal.currentAmount < expectedByNow * 0.9) {
        overallStatus = 'behind';
      } else {
        overallStatus = 'on_track';
      }
    }
  } else if (monthly > 0) {
    overallStatus = 'on_track';
  }

  // ── Financial context from profile ───────────────────────────────────────
  const monthlyIncome = fp?.annualIncome ? Math.round(fp.annualIncome / 12) : null;
  const monthlyExpenses = fp?.monthlyExpenses ?? null;
  const monthlySurplus =
    monthlyIncome !== null && monthlyExpenses !== null
      ? monthlyIncome - monthlyExpenses
      : null;

  // ── Plan steps ───────────────────────────────────────────────────────────
  const plan: PlanStep[] = [];
  const targetMonthly = requiredMonthly ?? (monthly > 0 ? monthly : null);

  if (targetMonthly && targetMonthly > 0) {
    plan.push({
      icon: 'save',
      label: `Save $${targetMonthly.toLocaleString()}/month`,
      description: targetDate
        ? `Needed to reach your goal by ${targetDate.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}`
        : `At this pace you'll reach your goal in ${estimatedMonths ? Math.ceil(estimatedMonths) : '?'} months`,
    });
  }

  if (monthlySurplus !== null && targetMonthly !== null) {
    const discretionary = monthlySurplus - targetMonthly;
    if (discretionary > 200) {
      const weeklyBudget = Math.floor(discretionary / 4.33);
      plan.push({
        icon: 'spend',
        label: `Spend under $${weeklyBudget.toLocaleString()}/week`,
        description: 'Discretionary budget to stay on track with your goal',
      });
    }
  }

  if (fp?.savingsRate && fp.savingsRate > 0) {
    plan.push({
      icon: 'rate',
      label: `Maintain ${fp.savingsRate}% savings rate`,
      description: 'Your current savings discipline keeps this goal on schedule',
    });
  }

  if (plan.length === 0) {
    plan.push({
      icon: 'setup',
      label: 'Add a monthly contribution',
      description: 'Set a contribution amount to generate your personalised roadmap',
    });
  }

  // ── Checkpoints ──────────────────────────────────────────────────────────
  const referenceEndDate =
    targetDate ??
    (estimatedMonths
      ? new Date(now.getTime() + estimatedMonths * msPerMonth)
      : null);

  const checkpoints: Checkpoint[] = ([25, 50, 75, 100] as const).map((pct) => {
    const requiredAmount = Math.round(goal.targetAmount * (pct / 100));
    const isReached = goal.currentAmount >= requiredAmount;

    if (isReached) {
      return { pct, requiredAmount, estimatedDate: 'Reached', status: 'reached' as const };
    }

    let estimatedDate: string | null = null;
    let status: CheckpointStatus = 'upcoming';

    const remaining = Math.max(0, requiredAmount - goal.currentAmount);
    const monthsToCheckpoint = monthly > 0 ? remaining / monthly : null;

    if (monthsToCheckpoint !== null) {
      const checkpointDate = new Date(now.getTime() + monthsToCheckpoint * msPerMonth);
      estimatedDate = checkpointDate.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });

      // Is this checkpoint behind the proportional schedule?
      if (targetDate) {
        const proportionalTarget = new Date(
          createdAt.getTime() +
            (pct / 100) * (targetDate.getTime() - createdAt.getTime()),
        );
        if (checkpointDate > proportionalTarget && now > proportionalTarget) {
          status = 'behind';
        }
      }
    } else if (referenceEndDate) {
      // No monthly contribution set — interpolate from end date
      const fraction = pct / 100;
      const d = new Date(
        createdAt.getTime() +
          fraction * (referenceEndDate.getTime() - createdAt.getTime()),
      );
      estimatedDate = d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
    }

    return { pct, requiredAmount, estimatedDate, status };
  });

  return {
    overallStatus,
    expectedByNow,
    plan,
    checkpoints,
    estimatedCompletionDate,
    requiredMonthly,
  };
}

// ── Status banner ────────────────────────────────────────────────────────────

function StatusBanner({
  status,
  onAdjust,
  dismissed,
  onDismiss,
}: {
  status: OverallStatus;
  onAdjust: () => void;
  dismissed: boolean;
  onDismiss: () => void;
}) {
  if (status === 'no_data' || status === 'on_track' || dismissed) return null;

  if (status === 'complete' || status === 'ahead') {
    return (
      <div className="bg-[#052E16] border border-[#22C55E]/30 rounded-2xl p-4 flex items-start gap-3">
        <div className="w-8 h-8 bg-[#22C55E]/20 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5">
          <Trophy size={16} className="text-[#22C55E]" />
        </div>
        <div className="flex-1">
          <p className="text-[#22C55E] font-bold text-sm leading-5">
            {status === 'complete' ? 'Goal Complete! 🎉' : "You're Ahead of Pace!"}
          </p>
          <p className="text-[#86EFAC] font-semibold text-xs leading-4 mt-0.5">
            {status === 'complete'
              ? "You've reached your target. Excellent work."
              : "Keep it up — you're saving faster than your plan requires."}
          </p>
        </div>
        <button
          onClick={onDismiss}
          className="text-[#22C55E]/50 hover:text-[#22C55E] text-xs font-bold leading-none mt-0.5"
        >
          ✕
        </button>
      </div>
    );
  }

  if (status === 'behind') {
    return (
      <div className="bg-[#2D1B0E] border border-[#F59E0B]/30 rounded-2xl p-4 flex flex-col gap-3">
        <div className="flex items-start gap-3">
          <div className="w-8 h-8 bg-[#F59E0B]/20 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5">
            <AlertTriangle size={16} className="text-[#F59E0B]" />
          </div>
          <div className="flex-1">
            <p className="text-[#F59E0B] font-bold text-sm leading-5">Behind Schedule</p>
            <p className="text-[#FDE68A] font-semibold text-xs leading-4 mt-0.5">
              You're behind on this goal. Would you like to adjust your plan?
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={onAdjust}
            className="flex-1 bg-[#F59E0B]/20 border border-[#F59E0B]/30 rounded-xl py-2 text-[#F59E0B] font-bold text-xs text-center"
          >
            Adjust Plan
          </button>
          <button
            onClick={onDismiss}
            className="flex-1 bg-white/5 border border-white/10 rounded-xl py-2 text-[#94A3B8] font-bold text-xs text-center"
          >
            Keep Original
          </button>
        </div>
      </div>
    );
  }

  return null;
}

// ── Plan step row ────────────────────────────────────────────────────────────

const PLAN_ICONS = {
  save: DollarSign,
  spend: Target,
  rate: TrendingUp,
  setup: Zap,
};

function PlanStepRow({ step, color }: { step: PlanStep; color: string }) {
  const Icon = PLAN_ICONS[step.icon];
  return (
    <div className="flex items-start gap-3 py-3 border-b border-white/5 last:border-0">
      <div
        className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5"
        style={{ backgroundColor: `${color}20` }}
      >
        <Icon size={15} style={{ color }} />
      </div>
      <div className="flex flex-col gap-0.5">
        <span className="text-white font-bold text-sm leading-5">{step.label}</span>
        <span className="text-[#808BA4] font-semibold text-xs leading-4">{step.description}</span>
      </div>
    </div>
  );
}

// ── Checkpoint row ───────────────────────────────────────────────────────────

function CheckpointRow({
  checkpoint,
  color,
}: {
  checkpoint: Checkpoint;
  color: string;
}) {
  const { pct, requiredAmount, estimatedDate, status } = checkpoint;

  const statusColor =
    status === 'reached' ? '#22C55E' : status === 'behind' ? '#F59E0B' : '#4B5563';
  const StatusIcon =
    status === 'reached' ? CheckCircle2 : status === 'behind' ? AlertTriangle : Clock;

  return (
    <div className="flex items-center gap-3 py-3 border-b border-white/5 last:border-0">
      {/* Diamond tick */}
      <div
        className="w-4 h-4 flex-shrink-0"
        style={{
          backgroundColor: status === 'reached' ? color : 'transparent',
          border: `1.5px solid ${status === 'reached' ? color : 'rgba(255,255,255,0.15)'}`,
          borderRadius: '3px',
          transform: 'rotate(45deg)',
        }}
      />
      <div className="flex-1 flex flex-col gap-0.5">
        <span className="text-white font-bold text-sm leading-5">
          {pct === 100 ? 'Goal Complete' : `${pct}% — ${formatDollars(requiredAmount)}`}
        </span>
        {estimatedDate && (
          <span className="font-semibold text-xs leading-4" style={{ color: statusColor }}>
            {estimatedDate}
          </span>
        )}
      </div>
      <StatusIcon size={14} style={{ color: statusColor }} />
    </div>
  );
}

// ── Main screen ──────────────────────────────────────────────────────────────

export default function GoalDetailScreen() {
  const { id } = useParams<{ id: string }>();
  const [, navigate] = useLocation();
  const queryClient = useQueryClient();

  const { data: goal, isLoading } = useGetGoal(id ?? '');
  const { data: fpData } = useGetFinancialProfile();
  const { mutateAsync: updateGoal, isPending: updating } = useUpdateGoal();
  const { mutateAsync: deleteGoal, isPending: deleting } = useDeleteGoal();

  const [isAdjusting, setIsAdjusting] = useState(false);
  const [adjustAmount, setAdjustAmount] = useState('');
  const [bannerDismissed, setBannerDismissed] = useState(false);

  if (isLoading || !goal) {
    return (
      <AppShell activeTab="goals" header={<AppHeader backTo="/goals" dashboardTitle="Goal Detail" />}>
        <div className="flex items-center justify-center py-24">
          <Loader2 size={28} className="animate-spin text-[#2563EB]" />
        </div>
      </AppShell>
    );
  }

  const fp = fpData?.profile ?? null;
  const roadmap = computeRoadmap(goal, fp);
  const color = TYPE_COLORS[goal.type] ?? '#6B7280';
  const progress =
    goal.targetAmount > 0
      ? Math.min(100, Math.round((goal.currentAmount / goal.targetAmount) * 100))
      : 0;
  const milestones = [25, 50, 75].map((pct) => ({ pct, reached: progress >= pct }));

  const labelCls = 'text-[#808BA4] text-[10px] font-bold uppercase tracking-[1.5px] mb-3 block';

  const handleSaveContribution = async () => {
    const amount = parseInt(adjustAmount.replace(/[^0-9]/g, ''), 10);
    if (!adjustAmount.trim() || isNaN(amount) || amount <= 0) {
      toast({ title: 'Enter an amount', description: 'Add a monthly contribution to continue.' });
      return;
    }
    try {
      await updateGoal({ id: goal.id, data: { monthlyContribution: amount } });
      await queryClient.invalidateQueries({ queryKey: getListGoalsQueryKey() });
      toast({ title: 'Contribution Updated', description: `Set to $${amount.toLocaleString()}/mo.` });
      setIsAdjusting(false);
      setAdjustAmount('');
    } catch {
      toast({ title: 'Failed to update', variant: 'destructive' });
    }
  };

  const handleDelete = async () => {
    try {
      await deleteGoal({ id: goal.id });
      await queryClient.invalidateQueries({ queryKey: getListGoalsQueryKey() });
      toast({ title: 'Goal Deleted', description: `"${goal.name}" removed.` });
      navigate('/goals');
    } catch {
      toast({ title: 'Failed to delete', variant: 'destructive' });
    }
  };

  const startAdjusting = () => {
    setAdjustAmount(String(goal.monthlyContribution ?? 0));
    setIsAdjusting(true);
  };

  return (
    <AppShell activeTab="goals" header={<AppHeader backTo="/goals" dashboardTitle={goal.name} />}>
      <div className="flex flex-col gap-6 pb-8">

        {/* ── Goal title + type ─────────────────────────────────────────── */}
        <div className="flex flex-col gap-2">
          <div
            className="self-start px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-[1.5px]"
            style={{ backgroundColor: `${color}20`, color }}
          >
            {TYPE_LABELS[goal.type] ?? goal.type}
          </div>
          <h1
            className="text-white font-bold text-[32px] leading-[38px]"
            style={{ letterSpacing: '-1px' }}
          >
            {goal.name}
          </h1>
        </div>

        {/* ── Status banner ─────────────────────────────────────────────── */}
        <StatusBanner
          status={roadmap.overallStatus}
          onAdjust={startAdjusting}
          dismissed={bannerDismissed}
          onDismiss={() => setBannerDismissed(true)}
        />

        {/* ── Progress card ─────────────────────────────────────────────── */}
        <div className="bg-[#111827] border border-white/5 rounded-2xl p-5 flex flex-col gap-4">
          <div className="flex items-end justify-between">
            <div className="flex flex-col gap-0.5">
              <span className={labelCls}>Progress</span>
              <span className="text-white font-bold text-3xl leading-9" style={{ letterSpacing: '-1px' }}>
                {formatDollars(goal.currentAmount)}
              </span>
            </div>
            <div className="flex flex-col items-end gap-0.5">
              <span className="text-[#808BA4] font-semibold text-xs">of {formatDollars(goal.targetAmount)}</span>
              <span className="font-bold text-lg leading-7" style={{ color }}>{progress}%</span>
            </div>
          </div>

          {/* Progress bar with milestone ticks */}
          <div className="relative h-2 bg-[#1F2937] rounded-full overflow-visible">
            <div
              className="h-full rounded-full transition-all duration-700"
              style={{ width: `${progress}%`, backgroundColor: color }}
            />
            {milestones.map((m) => (
              <div
                key={m.pct}
                className="absolute top-0 bottom-0 flex flex-col items-center pointer-events-none"
                style={{ left: `${m.pct}%`, transform: 'translateX(-50%)' }}
              >
                <div className="w-[2px] h-full rounded-full" style={{ backgroundColor: m.reached ? color : 'rgba(255,255,255,0.15)' }} />
                <div
                  className="absolute"
                  style={{
                    top: '-5px',
                    width: '5px',
                    height: '5px',
                    backgroundColor: m.reached ? color : '#374151',
                    border: `1.5px solid ${m.reached ? color : 'rgba(255,255,255,0.15)'}`,
                    borderRadius: '2px',
                    transform: 'rotate(45deg)',
                  }}
                />
              </div>
            ))}
          </div>

          {/* Stats row */}
          <div className="flex items-center justify-between pt-1 border-t border-white/5">
            <div className="flex items-center gap-2">
              <TrendingUp size={14} className="text-[#22C55E]" />
              <span className="text-[#CBD5E1] font-semibold text-xs">Monthly</span>
            </div>
            <span className="text-white font-bold text-sm">
              {goal.monthlyContribution > 0
                ? `$${goal.monthlyContribution.toLocaleString()}/mo`
                : 'None set'}
            </span>
          </div>

          {goal.targetDate && (
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Clock size={14} className="text-[#808BA4]" />
                <span className="text-[#CBD5E1] font-semibold text-xs">Target Date</span>
              </div>
              <span className="text-white font-bold text-sm">
                {new Date(goal.targetDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
              </span>
            </div>
          )}

          <div className="flex items-center justify-between">
            <span className="text-[#CBD5E1] font-semibold text-xs">Est. Completion</span>
            <span className="text-white font-bold text-sm">
              {roadmap.estimatedCompletionDate ?? 'TBD'}
            </span>
          </div>
        </div>

        {/* ── AI Roadmap ────────────────────────────────────────────────── */}
        <div>
          <span className={labelCls}>AI Roadmap</span>
          <div className="bg-[#111827] border border-white/5 rounded-2xl px-5 py-1">
            {roadmap.plan.map((step, i) => (
              <PlanStepRow key={i} step={step} color={color} />
            ))}
          </div>
        </div>

        {/* ── Checkpoints ───────────────────────────────────────────────── */}
        <div>
          <span className={labelCls}>Milestones</span>
          <div className="bg-[#111827] border border-white/5 rounded-2xl px-5 py-1">
            {roadmap.checkpoints.map((cp) => (
              <CheckpointRow key={cp.pct} checkpoint={cp} color={color} />
            ))}
          </div>
        </div>

        {/* ── Adjust Contribution ───────────────────────────────────────── */}
        <div>
          <span className={labelCls}>Contribution</span>
          {isAdjusting ? (
            <div className="flex flex-col gap-3">
              <ExecutiveInput
                label="New Monthly Contribution"
                leftIcon={<span className="font-bold">$</span>}
                inputMode="decimal"
                placeholder="e.g. 1500"
                value={adjustAmount}
                onChange={(e) => {
                  const raw = e.target.value.replace(/[^0-9.]/g, '');
                  const parts = raw.split('.');
                  setAdjustAmount(parts.length > 2 ? parts[0] + '.' + parts.slice(1).join('') : raw);
                }}
                autoFocus
              />
              <div className="flex gap-3">
                <ExecutiveButton
                  variant="outline"
                  text="Cancel"
                  className="flex-1"
                  onClick={() => { setIsAdjusting(false); setAdjustAmount(''); }}
                />
                <ExecutiveButton
                  text={updating ? 'Saving…' : 'Save'}
                  icon={updating ? <Loader2 size={16} className="animate-spin" /> : undefined}
                  className="flex-1"
                  disabled={updating}
                  onClick={handleSaveContribution}
                />
              </div>
            </div>
          ) : (
            <ExecutiveButton text="Adjust Contribution" onClick={startAdjusting} />
          )}
        </div>

        {/* ── Remove goal ───────────────────────────────────────────────── */}
        <button
          type="button"
          onClick={handleDelete}
          disabled={deleting}
          className="flex items-center justify-center gap-2 text-[#EF4444] text-sm font-semibold py-2 opacity-70 hover:opacity-100 transition-opacity disabled:opacity-40"
        >
          {deleting ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
          Remove Goal
        </button>
      </div>
    </AppShell>
  );
}
