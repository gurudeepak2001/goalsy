import { useState } from 'react';
import { Plus, ArrowRight, TrendingUp, Target, Trash2, Loader2 } from 'lucide-react';
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
  useUpdateGoal,
  useDeleteGoal,
  getListGoalsQueryKey,
} from '@workspace/api-client-react';
import type { Goal } from '@workspace/api-client-react';

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
  const { mutateAsync: updateGoal, isPending: updating } = useUpdateGoal();
  const { mutateAsync: deleteGoal, isPending: deleting } = useDeleteGoal();

  const invalidateGoals = () => queryClient.invalidateQueries({ queryKey: getListGoalsQueryKey() });

  // ── UI state ───────────────────────────────────────────────────────────────
  const [selectedGoalId, setSelectedGoalId] = useState<string | null>(null);
  const [isAdjusting, setIsAdjusting] = useState(false);
  const [adjustAmount, setAdjustAmount] = useState('');
  const [createOpen, setCreateOpen] = useState(false);

  // Create form state
  const [newGoalName, setNewGoalName] = useState('');
  const [newGoalType, setNewGoalType] = useState('home_purchase');
  const [newGoalTarget, setNewGoalTarget] = useState('');
  const [newGoalCurrent, setNewGoalCurrent] = useState('');
  const [newGoalContrib, setNewGoalContrib] = useState('');

  const goals = goalsData ?? [];
  const selectedGoal = selectedGoalId ? goals.find((g) => g.id === selectedGoalId) ?? null : null;
  const selectedCard = selectedGoal ? goalToCard(selectedGoal) : null;

  // ── Handlers ───────────────────────────────────────────────────────────────
  const closeGoalDetail = () => {
    setSelectedGoalId(null);
    setIsAdjusting(false);
    setAdjustAmount('');
  };

  const startAdjusting = () => {
    if (!selectedGoal) return;
    setAdjustAmount(String(selectedGoal.monthlyContribution ?? 0));
    setIsAdjusting(true);
  };

  const handleSaveContribution = async () => {
    if (!selectedGoal) return;
    const amount = parseInt(adjustAmount.replace(/[^0-9]/g, ''), 10);
    if (!adjustAmount.trim() || isNaN(amount)) {
      toast({ title: 'Enter an amount', description: 'Add a monthly contribution to continue.' });
      return;
    }
    try {
      await updateGoal({ id: selectedGoal.id, data: { monthlyContribution: amount } });
      await invalidateGoals();
      toast({ title: 'Contribution Updated', description: `Set to $${amount.toLocaleString()}/mo.` });
      closeGoalDetail();
    } catch {
      toast({ title: 'Failed to update', variant: 'destructive' });
    }
  };

  const handleDeleteGoal = async () => {
    if (!selectedGoal) return;
    try {
      await deleteGoal({ id: selectedGoal.id });
      await invalidateGoals();
      toast({ title: 'Goal Deleted', description: `"${selectedGoal.name}" removed.` });
      closeGoalDetail();
    } catch {
      toast({ title: 'Failed to delete', variant: 'destructive' });
    }
  };

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
                  onClick={() => setSelectedGoalId(goal.id)}
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

      {/* ── Goal detail modal ─────────────────────────────────────────────── */}
      <AppModal open={!!selectedGoal} onOpenChange={(open) => !open && closeGoalDetail()} title={selectedCard?.title ?? ''}>
        {selectedGoal && selectedCard && (
          <div className="flex flex-col gap-6 pb-4">
            <span className="text-[#808BA4] font-semibold text-sm">{selectedCard.subtitle}</span>

            {/* Stats card */}
            <div className="bg-[#111827] border border-white/5 rounded-2xl p-5 flex flex-col gap-4">
              <div className="flex items-end justify-between">
                <span className="text-white font-bold text-2xl leading-8">{selectedCard.current}</span>
                <span className="text-[#808BA4] font-semibold text-sm">of {selectedCard.target}</span>
              </div>

              {/* Progress bar with milestone ticks */}
              <div className="relative h-2 bg-[#1F2937] rounded-full overflow-visible">
                <div className="h-full rounded-full" style={{ width: `${Math.min(100, selectedCard.progress)}%`, backgroundColor: selectedCard.color }} />
                {selectedCard.milestones.map((m) => (
                  <div key={m.pct} className="absolute top-0 bottom-0 flex flex-col items-center pointer-events-none" style={{ left: `${m.pct}%`, transform: 'translateX(-50%)' }}>
                    <div className="w-[2px] h-full rounded-full" style={{ backgroundColor: m.reached ? selectedCard.color : 'rgba(255,255,255,0.15)' }} />
                    <div className="absolute" style={{ top: '-5px', width: '5px', height: '5px', backgroundColor: m.reached ? selectedCard.color : '#374151', border: `1.5px solid ${m.reached ? selectedCard.color : 'rgba(255,255,255,0.15)'}`, borderRadius: '2px', transform: 'rotate(45deg)' }} />
                  </div>
                ))}
              </div>

              {/* Milestone labels */}
              <div className="relative h-4">
                {selectedCard.milestones.map((m) => (
                  <span key={m.pct} className="absolute text-[9px] font-bold uppercase" style={{ left: `${m.pct}%`, transform: 'translateX(-50%)', color: m.reached ? selectedCard.color : 'rgba(255,255,255,0.2)', letterSpacing: '0.5px' }}>
                    {m.pct}%
                  </span>
                ))}
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-white/5">
                <div className="flex items-center gap-2">
                  <TrendingUp size={16} className="text-[#22C55E]" />
                  <span className="text-[#CBD5E1] font-semibold text-sm">Monthly Contribution</span>
                </div>
                <span className="text-white font-bold text-sm">
                  {selectedGoal.monthlyContribution > 0 ? `$${selectedGoal.monthlyContribution.toLocaleString()}/mo` : 'None set'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[#CBD5E1] font-semibold text-sm">Estimated Completion</span>
                <span className="text-white font-bold text-sm">{selectedCard.projectedDate}</span>
              </div>
            </div>

            {isAdjusting ? (
              <div className="flex flex-col gap-4">
                <ExecutiveInput
                  label="New Monthly Contribution"
                  leftIcon={<span className="font-bold">$</span>}
                  inputMode="decimal"
                  placeholder="e.g. 3500"
                  value={adjustAmount}
                  onChange={(e) => {
                    const raw = e.target.value.replace(/[^0-9.]/g, '');
                    const parts = raw.split('.');
                    setAdjustAmount(parts.length > 2 ? parts[0] + '.' + parts.slice(1).join('') : raw);
                  }}
                  autoFocus
                />
                <div className="flex gap-3">
                  <ExecutiveButton variant="outline" text="Cancel" className="flex-1" onClick={() => { setIsAdjusting(false); setAdjustAmount(''); }} />
                  <ExecutiveButton
                    text={updating ? 'Saving…' : 'Save'}
                    icon={updating ? <Loader2 size={16} className="animate-spin" /> : null}
                    className="flex-1"
                    disabled={updating}
                    onClick={handleSaveContribution}
                  />
                </div>
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                <ExecutiveButton text="Adjust Contribution" onClick={startAdjusting} />
                <button
                  type="button"
                  onClick={handleDeleteGoal}
                  disabled={deleting}
                  className="flex items-center justify-center gap-2 text-[#EF4444] text-sm font-semibold py-2 opacity-70 hover:opacity-100 transition-opacity disabled:opacity-40"
                >
                  {deleting ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                  Remove Goal
                </button>
              </div>
            )}
          </div>
        )}
      </AppModal>

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
                label="Current Amount"
                leftIcon={<span className="font-bold">$</span>}
                inputMode="decimal"
                placeholder="0"
                value={newGoalCurrent}
                onChange={(e) => setNewGoalCurrent(e.target.value.replace(/[^0-9.]/g, ''))}
              />
            </div>
            <div className="flex-1">
              <ExecutiveInput
                label="Monthly Contribution"
                leftIcon={<span className="font-bold">$</span>}
                inputMode="decimal"
                placeholder="0"
                value={newGoalContrib}
                onChange={(e) => setNewGoalContrib(e.target.value.replace(/[^0-9.]/g, ''))}
              />
            </div>
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
