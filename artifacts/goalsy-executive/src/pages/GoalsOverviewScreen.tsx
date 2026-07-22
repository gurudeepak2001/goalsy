import { useState } from 'react';
import { Plus, ArrowRight, TrendingUp, Target } from 'lucide-react';
import { useLocation } from 'wouter';
import { toast } from '@/hooks/use-toast';
import AppHeader from '@/components/AppHeader';
import AppShell from '@/components/AppShell';
import GoalCard from '@/components/GoalCard';
import ExecutiveButton from '@/components/ExecutiveButton';
import AppModal from '@/components/AppModal';
import ExecutiveInput from '@/components/ExecutiveInput';
import { mockGoals, estimateCompletionDate, type MockGoal } from '@/lib/mockData';

export default function GoalsOverviewScreen() {
  const [, navigate] = useLocation();
  const [goals, setGoals] = useState<MockGoal[]>(mockGoals);
  const [selectedGoal, setSelectedGoal] = useState<MockGoal | null>(null);
  const [isAdjusting, setIsAdjusting] = useState(false);
  const [adjustAmount, setAdjustAmount] = useState('');
  const [createOpen, setCreateOpen] = useState(false);
  const [newGoalTitle, setNewGoalTitle] = useState('');
  const [newGoalTarget, setNewGoalTarget] = useState('');

  const closeGoalDetail = () => {
    setSelectedGoal(null);
    setIsAdjusting(false);
    setAdjustAmount('');
  };

  const startAdjustingContribution = () => {
    if (!selectedGoal) return;
    // Prefill with the current numeric contribution so the user is editing, not starting blank.
    setAdjustAmount(selectedGoal.monthlyContribution.replace(/[^0-9.]/g, ''));
    setIsAdjusting(true);
  };

  const handleSaveContribution = () => {
    if (!selectedGoal) return;
    const trimmed = adjustAmount.trim();
    if (!trimmed) {
      toast({ title: 'Enter an amount', description: 'Add a monthly contribution amount to continue.' });
      return;
    }
    const numeric = Number(trimmed.replace(/[^0-9.]/g, ''));
    const formatted = Number.isFinite(numeric) && numeric > 0
      ? `${numeric.toLocaleString()}/mo`
      : `${trimmed}/mo`;
    // MOCK DATA - replace with a real "update contribution" API call
    setGoals((prev) =>
      prev.map((g) =>
        g.id === selectedGoal.id
          ? {
              ...g,
              monthlyContribution: formatted,
              // Re-estimate the completion date so it reflects the new contribution
              // rather than staying pinned to the old, now-stale projection.
              projectedDate: estimateCompletionDate(g.current, g.target, formatted),
            }
          : g,
      ),
    );
    toast({
      title: 'Contribution Updated',
      description: `Monthly contribution toward ${selectedGoal.title} set to ${formatted}.`,
    });
    closeGoalDetail();
  };

  const handleCreateGoal = () => {
    if (!newGoalTitle.trim() || !newGoalTarget.trim()) {
      toast({ title: 'Missing details', description: 'Give your goal a name and a target amount.' });
      return;
    }
    // MOCK DATA - replace with a real "create goal" API call
    const newGoal: MockGoal = {
      id: `goal-${Date.now()}`,
      title: newGoalTitle.trim(),
      subtitle: 'New Strategic Goal',
      progress: 0,
      current: '$0',
      target: newGoalTarget.trim(),
      projectedDate: 'TBD',
      color: '#3B82F6',
      description: 'Freshly created goal. Goalsy AI will refine your projected timeline as data comes in.',
      monthlyContribution: '$0/mo',
    };
    setGoals((prev) => [newGoal, ...prev]);
    setNewGoalTitle('');
    setNewGoalTarget('');
    setCreateOpen(false);
    toast({ title: 'Goal Created', description: `"${newGoal.title}" added to your roadmap.` });
  };

  return (
    <AppShell activeTab="goals" header={<AppHeader dashboard />}>
      <div className="flex flex-col gap-8">
        <div className="flex flex-col gap-1">
          <span
            className="text-[#808BA4] font-semibold text-sm uppercase"
            style={{ letterSpacing: '2px' }}
          >
            Master Roadmap
          </span>
          <h1
            className="text-white font-bold text-[36px] leading-[54px]"
            style={{ letterSpacing: '-0.9px' }}
          >
            Strategic Goals
          </h1>
        </div>

        <button
          type="button"
          onClick={() => navigate('/financial-health')}
          className="w-full bg-[#111827] border border-white/5 rounded-2xl p-4 flex items-center justify-between text-left active:scale-95 transition-transform"
        >
          <div className="flex flex-col gap-1">
            <span className="text-[#808BA4] font-bold text-xs uppercase tracking-[1.5px]">
              Financial Health
            </span>
            <span className="text-white font-semibold text-sm">Review your financial status</span>
          </div>
          <ArrowRight size={18} className="text-[#94A3B8]" />
        </button>

        <div className="flex flex-col gap-8 pb-24">
          {goals.length === 0 ? (
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
            goals.map((goal) => (
              <GoalCard
                key={goal.id}
                title={goal.title}
                subtitle={goal.subtitle}
                progress={goal.progress}
                current={goal.current}
                target={goal.target}
                projectedDate={goal.projectedDate}
                color={goal.color}
                onClick={() => setSelectedGoal(goal)}
              />
            ))
          )}
        </div>
      </div>

      {/* Position the FAB above the full nav + safe-area stack so it never
          slides behind the home indicator on iPhone. The nav is h-[84px] with
          pb-safe, so: 84px (nav) + var(--safe-bottom) (home indicator) + 16px
          (breathing room) = correct clearance on every device. */}
      <div className="fixed left-0 right-0 max-w-md mx-auto px-6 z-40" style={{ bottom: 'calc(84px + var(--safe-bottom) + 16px)' }}>
        <ExecutiveButton
          text="Create New Goal"
          icon={<Plus size={20} />}
          iconPosition="left"
          onClick={() => setCreateOpen(true)}
          style={{
            boxShadow: '0px 12px 24px -8px rgba(37, 99, 235, 0.4)',
            letterSpacing: '-0.000976562em',
          }}
        />
      </div>

      {/* Goal detail modal */}
      <AppModal
        open={!!selectedGoal}
        onOpenChange={(open) => !open && closeGoalDetail()}
        title={selectedGoal?.title ?? ''}
      >
        {selectedGoal && (
          <div className="flex flex-col gap-6 pb-4">
            <span className="text-[#808BA4] font-semibold text-sm">{selectedGoal.subtitle}</span>
            <p className="text-[#E5E7EB] font-semibold text-base leading-6">{selectedGoal.description}</p>
            <div className="bg-[#111827] border border-white/5 rounded-2xl p-5 flex flex-col gap-4">
              <div className="flex items-end justify-between">
                <span className="text-white font-bold text-2xl leading-8">{selectedGoal.current}</span>
                <span className="text-[#808BA4] font-semibold text-sm">of {selectedGoal.target}</span>
              </div>
              <div className="h-2 bg-[#1F2937] rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full"
                  style={{ width: `${selectedGoal.progress}%`, backgroundColor: selectedGoal.color }}
                />
              </div>
              <div className="flex items-center justify-between pt-2 border-t border-white/5">
                <div className="flex items-center gap-2">
                  <TrendingUp size={16} className="text-[#22C55E]" />
                  <span className="text-[#CBD5E1] font-semibold text-sm">Monthly Contribution</span>
                </div>
                <span className="text-white font-bold text-sm">{selectedGoal.monthlyContribution}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[#CBD5E1] font-semibold text-sm">Estimated Completion</span>
                <span className="text-white font-bold text-sm">{selectedGoal.projectedDate}</span>
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
                    // Strip anything that isn't a digit or a single decimal point
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
                    onClick={() => {
                      setIsAdjusting(false);
                      setAdjustAmount('');
                    }}
                  />
                  <ExecutiveButton
                    text="Save"
                    icon={null}
                    className="flex-1"
                    onClick={handleSaveContribution}
                  />
                </div>
              </div>
            ) : (
              <ExecutiveButton text="Adjust Contribution" onClick={startAdjustingContribution} />
            )}
          </div>
        )}
      </AppModal>

      {/* Create goal modal */}
      <AppModal open={createOpen} onOpenChange={setCreateOpen} title="Create New Goal">
        <div className="flex flex-col gap-5 pb-4">
          <ExecutiveInput
            label="Goal Name"
            placeholder="e.g. Vacation Fund"
            value={newGoalTitle}
            onChange={(e) => setNewGoalTitle(e.target.value)}
          />
          <ExecutiveInput
            label="Target Amount"
            leftIcon={<span className="font-bold">$</span>}
            inputMode="decimal"
            placeholder="e.g. 10000"
            value={newGoalTarget}
            onChange={(e) => {
              const raw = e.target.value.replace(/[^0-9.]/g, '');
              const parts = raw.split('.');
              setNewGoalTarget(parts.length > 2 ? parts[0] + '.' + parts.slice(1).join('') : raw);
            }}
          />
          <ExecutiveButton text="Add Goal" onClick={handleCreateGoal} />
        </div>
      </AppModal>
    </AppShell>
  );
}
