import { Plus } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import AppHeader from '@/components/AppHeader';
import AppShell from '@/components/AppShell';
import GoalCard from '@/components/GoalCard';
import ExecutiveButton from '@/components/ExecutiveButton';

export default function GoalsOverviewScreen() {
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

        <div className="flex flex-col gap-8">
          <GoalCard
            title="Home Purchase"
            subtitle="Primary Residence"
            progress={48}
            current="$120,000"
            target="$250,000"
            projectedDate="Oct 2025"
          />
          <GoalCard
            title="Debt Elimination"
            subtitle="Student Loans & Credit"
            progress={27}
            current="$12,400"
            target="$45,000"
            projectedDate="Jan 2026"
          />
          <GoalCard
            title="Retirement"
            subtitle="Long-term Alpha"
            progress={24}
            current="$1.2M"
            target="$5M"
            projectedDate="2045"
          />
        </div>
      </div>

      <div className="fixed bottom-24 left-0 right-0 max-w-md mx-auto px-6 z-40">
        <ExecutiveButton
          text="Create New Goal"
          icon={<Plus size={20} />}
          iconPosition="left"
          onClick={() => toast({ title: 'New Goal', description: 'Goal creation form coming soon.' })}
          style={{
            boxShadow: '0px 12px 24px -8px rgba(37, 99, 235, 0.4)',
            letterSpacing: '-0.000976562em',
          }}
        />
      </div>
    </AppShell>
  );
}
