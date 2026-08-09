import { useState } from 'react';
import { Plus, ArrowRight, Target, Loader2 } from 'lucide-react';
import { useLocation } from 'wouter';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from '@/hooks/use-toast';
import AppHeader from '@/components/AppHeader';
import AppShell from '@/components/AppShell';
import GoalCard from '@/components/GoalCard';
import ExecutiveButton from '@/components/ExecutiveButton';
import AppModal from '@/components/AppModal';
import ExecutiveInput from '@/components/ExecutiveInput';
import {
  useListGoals,
  useCreateGoal,
  getListGoalsQueryKey,
} from '@workspace/api-client-react';

// ── Helper functions ─────────────────────────────────────────────────────────

function formatDollars(n: number): string {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `$${Math.round(n / 1_000)}K`;
  return `$${n.toLocaleString()}`;
}

function computeProjectedDate(current: number, target: number, monthly: number): string {
  if (current >= target) return 'Complete';
  if (monthly <= 0) return 'TBD';
  const months = Math.ceil((target - current) / monthly);
  const date = new Date();
  date.setMonth(date.getMonth() + months);
  return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
}

const TYPE_COLORS: Record<string, string> = {
  home_purchase: '#22C55E',
  retirement: '#3B82F6',
  education: '#F59E0B',
  emergency_fund: '#10B981',
  investment: '#8B5CF6',
  other: '#6B7280',
};

const TYPE_LABELS: Record<string, string> = {
  home_purchase: 'Home Purchase',
  retirement: 'Retirement',
  education: 'Education',
  emergency_fund: 'Emergency Fund',
  investment: 'Investment Portfolio',
  other: 'Other',
};

const GOAL_TYPE_OPTIONS = [
  { value: 'home_purchase', label: 'Home Purchase' },
  { value: 'retirement', label: 'Retirement' },
  { value: 'education', label: 'Education' },
  { value: 'emergency_fund', label: 'Emergency Fund' },
  { value: 'investment', label: 'Investment Portfolio' },
  { value: 'other', label: 'Other' },
];

/** Returns milestone marks at 25/50/75 for a given progress percentage */
function buildMilestones(progress: number) {
  return [25, 50, 75].map((pct) => ({ pct, reached: progress >= pct }));
}

function goalToCard(g: Goal) {
  const progress = g.targetAmount > 0
    ? Math.min(100, Math.round((g.currentAmount / g.targetAmount) * 100))
    : 0;
  return {
    id: g.id,
    title: g.name,
    subtitle: TYPE_LABELS[g.type] ?? g.type,
    progress,
    current: formatDollars(g.currentAmount),
    target: formatDollars(g.targetAmount),
    projectedDate: computeProjectedDate(g.currentAmount, g.targetAmount, g.monthlyContribution),
    color: TYPE_COLORS[g.type] ?? '#6B7280',
    monthlyContribution: g.monthlyContribution,
    milestones: buildMilestones(progress),
  };
}

// ── Main component ───────────────────────────────────────────────────────────
export default function GoalsOverviewScreen() {
  const [, navigate] = useLocation();
  const queryClient = useQueryClient();

  // ── API hooks ──────────────────────────────────────────────────────────────
  const { data: goalsData, isLoading } = useListGoals();
  const { mutateAsync: createGoal, isPending: creating } = useCreateGoal();

  const invalidateGoals = () => queryClient.invalidateQueries({ queryKey: getListGoalsQueryKey() });

  // ── UI state ───────────────────────────────────────────────────────────────
  const [createOpen, setCreateOpen] = useState(false);

  // Create form state
  const [newGoalName, setNewGoalName] = useState('');
  const [newGoalType, setNewGoalType] = useState('home_purchase');
  const [newGoalTarget, setNewGoalTarget] = useState('');
  const [newGoalCurrent, setNewGoalCurrent] = useState('');
  const [newGoalContrib, setNewGoalContrib] = useState('');
  const [newGoalTargetDate, setNewGoalTargetDate] = useState('');

  const goals = goalsData ?? [];

  // ── Handlers ───────────────────────────────────────────────────────────────
  const handleCreateGoal = async () => {
    const name = newGoalName.trim();
    const target = parseInt(newGoalTarget.replace(/[^0-9]/g, ''), 10);
    if (!name || isNaN(target) || target <= 0) {
      toast({ title: 'Missing details', description: 'Give your goal a name and a target amount.' });
      return;
    }
    const currentAmount = newGoalCurrent ? parseInt(newGoalCurrent.replace(/[^0-9]/g, ''), 10) : 0;
    const monthlyContribution = newGoalContrib ? parseInt(newGoalContrib.replace(/[^0-9]/g, ''), 10) : 0;

    try {
      await createGoal({
        data: {
          name,
          type: newGoalType,
          targetAmount: target,
          currentAmount: isNaN(currentAmount) ? 0 : currentAmount,
          monthlyContribution: isNaN(monthlyContribution) ? 0 : monthlyContribution,
          targetDate: newGoalTargetDate || null,
          status: 'active',
          priority: 1,
        },
      });
      await invalidateGoals();
      setNewGoalName('');
      setNewGoalType('home_purchase');
      setNewGoalTarget('');
      setNewGoalCurrent('');
      setNewGoalContrib('');
      setNewGoalTargetDate('');
      setCreateOpen(false);
      toast({ title: 'Goal Created', description: `"${name}" added to your roadmap.` });
    } catch {
      toast({ title: 'Failed to create goal', variant: 'destructive' });
    }
  };

  const selectCls =
    'w-full bg-[#111827] border border-[#2D3748] rounded-xl px-4 py-3 text-white text-sm font-semibold appearance-none focus:outline-none focus:border-[#2563EB]/60 transition-colors cursor-pointer';
  const labelCls = 'text-[#808BA4] text-[10px] font-bold uppercase tracking-[1.5px] mb-1.5 block';

  return (
    <AppShell activeTab="goals" header={<AppHeader dashboard />}>
      <div className="flex flex-col gap-8">
        <div className="flex flex-col gap-1">
          <span className="text-[#808BA4] font-semibold text-sm uppercase" style={{ letterSpacing: '2px' }}>
            Master Roadmap
          </span>
          <h1 className="text-white font-bold text-[36px] leading-[54px]" style={{ letterSpacing: '-0.9px' }}>
            Strategic Goals
          </h1>
        </div>

        <button
          type="button"
          onClick={() => navigate('/financial-health')}
          className="w-full bg-[#111827] border border-white/5 rounded-2xl p-4 flex items-center justify-between text-left active:scale-95 transition-transform"
        >
          <div className="flex flex-col gap-1">
            <span className="text-[#808BA4] font-bold text-xs uppercase tracking-[1.5px]">Financial Health</span>
            <span className="text-white font-semibold text-sm">Review your financial status</span>
          </div>
          <ArrowRight size={18} className="text-[#94A3B8]" />
        </button>

        <div className="flex flex-col gap-8 pb-24">
          {isLoading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 size={28} className="animate-spin text-[#2563EB]" />
            </div>
          ) : goals.length === 0 ? (
            <div className="bg-[#111827] border border-white/5 rounded-3xl p-8 flex flex-col items-center gap-5 text-center">
              <div className="w-14 h-14 bg-[#2563EB]/10 border border-[#2563EB]/20 rounded-2xl flex items-center justify-center">
                <Target size={28} className="text-[#2563EB]" />
              </div>
              <div className="flex flex-col gap-2">
                <h3 className="text-white font-bold text-lg leading-6">No Goals Yet</h3>
                <p className="text-[#808BA4] font-semibold text-sm leading-5">
                  Create your first strategic goal to begin your financial roadmap.
                </p>
              </div>
            </div>
          ) : (
            goals.filter((g) => g.status !== 'deleted').map((goal) => {
              const card = goalToCard(goal);
              return (
                <GoalCard
                  key={goal.id}
                  title={card.title}
                  subtitle={card.subtitle}
                  progress={card.progress}
                  current={card.current}
                  target={card.target}
                  projectedDate={card.projectedDate}
                  color={card.color}
                  milestones={card.milestones}
                  onClick={() => navigate(`/goals/${goal.id}`)}
                />
              );
            })
          )}
        </div>
      </div>

      {/* FAB */}
      <div className="fixed left-0 right-0 max-w-md mx-auto px-6 z-40" style={{ bottom: 'calc(84px + var(--safe-bottom) + 16px)' }}>
        <ExecutiveButton
          text="Create New Goal"
          icon={<Plus size={20} />}
          iconPosition="left"
          onClick={() => setCreateOpen(true)}
          style={{ boxShadow: '0px 12px 24px -8px rgba(37, 99, 235, 0.4)', letterSpacing: '-0.000976562em' }}
        />
      </div>

      {/* ── Create goal modal ─────────────────────────────────────────────── */}
      <AppModal open={createOpen} onOpenChange={setCreateOpen} title="Create New Goal">
        <div className="flex flex-col gap-5 pb-4">
          <ExecutiveInput
            label="Goal Name"
            placeholder="e.g. Vacation Fund"
            value={newGoalName}
            onChange={(e) => setNewGoalName(e.target.value)}
          />

          <div>
            <label className={labelCls}>Goal Type</label>
            <select value={newGoalType} onChange={(e) => setNewGoalType(e.target.value)} className={selectCls}>
              {GOAL_TYPE_OPTIONS.map((o) => (
                <option key={o.value} value={o.value} className="bg-[#111827]">{o.label}</option>
              ))}
            </select>
          </div>

          <ExecutiveInput
            label="Target Amount"
            leftIcon={<span className="font-bold">$</span>}
            inputMode="decimal"
            placeholder="e.g. 250000"
            value={newGoalTarget}
            onChange={(e) => { const raw = e.target.value.replace(/[^0-9.]/g, ''); setNewGoalTarget(raw); }}
          />

          <div className="flex gap-3">
            <div className="flex-1">
              <ExecutiveInput
                label="Current Amount Towards Goal"
                leftIcon={<span className="font-bold">$</span>}
                inputMode="decimal"
                placeholder="0"
                value={newGoalCurrent}
                onChange={(e) => setNewGoalCurrent(e.target.value.replace(/[^0-9.]/g, ''))}
              />
            </div>
            <div className="flex-1">
              <ExecutiveInput
                label="Monthly Contribution Towards Goal"
                leftIcon={<span className="font-bold">$</span>}
                inputMode="decimal"
                placeholder="0"
                value={newGoalContrib}
                onChange={(e) => setNewGoalContrib(e.target.value.replace(/[^0-9.]/g, ''))}
              />
            </div>
          </div>

          {/* Target completion date */}
          <div>
            <label className={labelCls}>Target Completion Date</label>
            <input
              type="date"
              value={newGoalTargetDate}
              min={new Date().toISOString().split('T')[0]}
              onChange={(e) => setNewGoalTargetDate(e.target.value)}
              className={selectCls}
              style={{ colorScheme: 'dark' }}
            />
          </div>

          <ExecutiveButton
            text={creating ? 'Creating…' : 'Add Goal'}
            icon={creating ? <Loader2 size={16} className="animate-spin" /> : undefined}
            disabled={creating}
            onClick={handleCreateGoal}
          />
        </div>
      </AppModal>
    </AppShell>
  );
}
