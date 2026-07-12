import { useState } from 'react';
import { Plus, ArrowRight, TrendingUp } from 'lucide-react';
import { useLocation } from 'wouter';
import { toast } from '@/hooks/use-toast';
import AppHeader from '@/components/AppHeader';
import AppShell from '@/components/AppShell';
import GoalCard from '@/components/GoalCard';
import ExecutiveButton from '@/components/ExecutiveButton';
import AppModal from '@/components/AppModal';
import ExecutiveInput from '@/components/ExecutiveInput';
import { mockGoals, type MockGoal } from '@/lib/mockData';

export default function GoalsOverviewScreen() {
  const [, navigate] = useLocation();
  const [goals, setGoals] = useState<MockGoal[]>(mockGoals);
  const [selectedGoal, setSelectedGoal] = useState<MockGoal | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [newGoalTitle, setNewGoalTitle] = useState('');
  const [newGoalTarget, setNewGoalTarget] = useState('');

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
          {goals.map((goal) => (
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
          ))}
        </div>
      </div>

      <div className="fixed bottom-24 left-0 right-0 max-w-md mx-auto px-6 z-40">
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
        onOpenChange={(open) => !open && setSelectedGoal(null)}
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
                <span className="text-[#CBD5E1] font-semibold text-sm">Projected Completion</span>
                <span className="text-white font-bold text-sm">{selectedGoal.projectedDate}</span>
              </div>
            </div>
            <ExecutiveButton
              text="Adjust Contribution"
              onClick={() => {
                setSelectedGoal(null);
                toast({ title: 'Contribution Updated', description: `Increased monthly contribution toward ${selectedGoal.title}.` });
              }}
            />
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
            placeholder="e.g. $10,000"
            value={newGoalTarget}
            onChange={(e) => setNewGoalTarget(e.target.value)}
          />
          <ExecutiveButton text="Add Goal" onClick={handleCreateGoal} />
        </div>
      </AppModal>
    </AppShell>
  );
}
