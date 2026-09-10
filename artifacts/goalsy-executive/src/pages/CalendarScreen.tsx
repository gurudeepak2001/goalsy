import { ReactNode, useState } from 'react';
import {
  Wallet,
  FileText,
  Lightbulb,
  Loader2,
  Flag,
  AlertTriangle,
  Clock,
} from 'lucide-react';
import { useLocation } from 'wouter';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from '@/hooks/use-toast';
import AppHeader from '@/components/AppHeader';
import AppShell from '@/components/AppShell';
import AppModal from '@/components/AppModal';
import { computeGoalSchedule } from '@/lib/goalSchedule';
import {
  useListBills,
  usePayBill,
  useListBriefings,
  useListGoals,
  useGetTodayMission,
  getListBillsQueryKey,
} from '@workspace/api-client-react';
import type { Briefing, Goal } from '@workspace/api-client-react';

// ── Helpers ───────────────────────────────────────────────────────────────────

const GOAL_TYPE_COLORS: Record<string, string> = {
  home_purchase: '#22C55E',
  retirement: '#3B82F6',
  education: '#F59E0B',
  emergency_fund: '#10B981',
  investment: '#8B5CF6',
  auto_purchase: '#F97316',
  other: '#6B7280',
};

function formatDollarsShort(n: number): string {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  return `$${n.toLocaleString()}`;
}

interface GoalCheckpoint {
  goalId: string;
  goalName: string;
  goalColor: string;
  weekIndex: number;
  expectedAmount: number;
  weekDate: Date;
  dateLabel: string;
  status: 'behind' | 'upcoming';
}

function computeGoalCheckpoints(
  goals: Goal[] | undefined,
): GoalCheckpoint[] {
  if (!goals) return [];
  const now = new Date();
  const items: GoalCheckpoint[] = [];

  for (const g of goals) {
    if (g.status === 'deleted' || g.targetAmount <= 0) continue;
    if (g.currentAmount >= g.targetAmount) continue; // complete

    const schedule = computeGoalSchedule(g, now);
    const next = schedule.find((milestone) => !milestone.isPast && g.currentAmount < milestone.expectedAmount);
    if (!next) continue;

    // Status: compare the current balance to the previous shared milestone.
    let status: GoalCheckpoint['status'] = 'upcoming';
    if (g.targetDate) {
      const previous = schedule.find((milestone) => milestone.weekIndex === next.weekIndex - 1);
      if (previous?.isPast && g.currentAmount < previous.expectedAmount * 0.9) {
        status = 'behind';
      }
    }

    items.push({
      goalId: g.id,
      goalName: g.name,
      goalColor: GOAL_TYPE_COLORS[g.type] ?? '#6B7280',
      weekIndex: next.weekIndex,
      expectedAmount: next.expectedAmount,
      weekDate: next.weekDate,
      dateLabel: next.weekDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      status,
    });
  }

  return items
    .sort((a, b) => a.weekDate.getTime() - b.weekDate.getTime())
    .slice(0, 4); // show next 4 upcoming across all goals
}

function DayDivider({ text, color = '#808BA4' }: { text: string; color?: string }) {
  return (
    <div className="flex items-center gap-3 w-full">
      <span className="font-bold text-xs uppercase tracking-[1.5px] flex-shrink-0" style={{ color }}>
        {text}
      </span>
      <div className="h-px flex-1 bg-white/5" />
    </div>
  );
}

function AccentCard({
  accentColor,
  children,
  dimmed = false,
  onClick,
}: {
  accentColor?: string;
  children: ReactNode;
  dimmed?: boolean;
  onClick?: () => void;
}) {
  const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (!onClick || (event.key !== 'Enter' && event.key !== ' ')) return;
    event.preventDefault();
    onClick();
  };

  return (
    <div
      onClick={onClick}
      onKeyDown={handleKeyDown}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      className={`bg-[#111827] rounded-[20px] p-6 flex flex-col gap-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#3B82F6] ${dimmed ? 'opacity-60' : ''} ${
        onClick ? 'cursor-pointer hover:bg-[#161F2E] transition-colors active:scale-[0.98]' : ''
      }`}
      style={{
        borderWidth: accentColor ? '1px 1px 1px 4px' : '1px',
        borderStyle: 'solid',
        borderColor: accentColor || 'rgba(255,255,255,0.05)',
      }}
    >
      {children}
    </div>
  );
}

function formatDateLabel(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function briefingTypeLabel(type: string | null | undefined): string {
  if (type === 'goal_review') return 'Goal Review';
  if (type === 'monthly_summary') return 'Monthly Financial Check-In';
  if (type === 'market_update') return 'Market Update';
  return 'Financial Briefing';
}

function briefingAccent(type: string | null | undefined): string {
  if (type === 'goal_review') return '#22C55E';
  if (type === 'market_update') return '#8B5CF6';
  return '#3B82F6';
}

export function splitBriefingSummary(summary: string | null | undefined): string[] {
  if (!summary?.trim()) return ['No additional details are available yet.'];
  return summary
    .trim()
    .split(/(?<=[.!?])\s+/)
    .map((sentence) => sentence.replace(/[.!?]+$/, '').trim())
    .filter(Boolean);
}

export default function CalendarScreen() {
  const [, navigate] = useLocation();
  const queryClient = useQueryClient();

  const { data: bills } = useListBills();
  const { data: briefings } = useListBriefings();
  const { data: goals } = useListGoals();
  const { data: todayMission } = useGetTodayMission();
  const { mutateAsync: payBill, isPending: paying } = usePayBill();

  const goalCheckpoints = computeGoalCheckpoints(goals);

  const [selectedBriefing, setSelectedBriefing] = useState<Briefing | null>(null);

  // Upcoming: the next unpaid bill sorted by due date
  const upcomingBill = (bills ?? [])
    .filter((b) => !b.isPaid)
    .sort((a, b) => a.dueDate.localeCompare(b.dueDate))[0] ?? null;

  const handleRecordManualPayment = async () => {
    if (!upcomingBill || paying) return;
    try {
      await payBill({ id: upcomingBill.id });
      await queryClient.invalidateQueries({ queryKey: getListBillsQueryKey() });
      toast({
        title: 'Manual payment recorded',
        description: `${upcomingBill.name} was marked paid in Goalsy. No external payment was made.`,
      });
    } catch {
      toast({
        title: 'Could not record manual payment',
        description: 'The bill was not marked paid. Please try again.',
        variant: 'destructive',
      });
    }
  };

  return (
    <AppShell
      activeTab="calendar"
      headerHeight={80}
      headerClassName="px-8 bg-[#05070A]/90 backdrop-blur-[12px]"
      header={<AppHeader dashboard dashboardTitle="Financial Schedule" />}
    >
      <div className="flex flex-col gap-10">
        {/* Today — mission status */}
        <div className="flex flex-col gap-4">
          <DayDivider text="Today" color="#3B82F6" />
          {todayMission ? (
            <AccentCard
              accentColor={todayMission.status === 'completed' ? '#22C55E' : '#3B82F6'}
              dimmed={todayMission.status === 'skipped'}
              onClick={() => navigate('/today')}
            >
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 flex items-center justify-center">
                  <div className={`w-2 h-2 rounded-full ${
                    todayMission.status === 'completed' ? 'bg-[#22C55E]' : 'bg-[#3B82F6]'
                  }`} />
                </div>
                <span className={`font-bold text-xs uppercase tracking-[0.6px] ${
                  todayMission.status === 'completed' ? 'text-[#22C55E]' : 'text-[#3B82F6]'
                }`}>
                  {todayMission.status === 'completed'
                    ? 'Mission Accomplished'
                    : todayMission.status === 'skipped'
                      ? 'Mission Skipped'
                      : "Today's Mission"}
                </span>
              </div>
              <h3 className="text-white font-bold text-lg leading-[22px] -mt-1">{todayMission.title}</h3>
              {todayMission.description && (
                <p className="text-[#808BA4] font-semibold text-[13px] leading-5">
                  {todayMission.description}
                </p>
              )}
            </AccentCard>
          ) : (
            <AccentCard dimmed>
              <h3 className="text-white font-bold text-base">No mission scheduled today</h3>
              <p className="text-[#808BA4] font-semibold text-[13px]">Your next Goalsy mission will appear here.</p>
            </AccentCard>
          )}
        </div>

        {/* Upcoming bill */}
        {upcomingBill && (
          <div className="flex flex-col gap-4">
            <DayDivider text={`Due ${formatDateLabel(upcomingBill.dueDate)}`} color="#CBD5E1" />
            <AccentCard accentColor="rgba(255,255,255,0.05)">
              <div className="flex items-start justify-between">
                <div className="flex flex-col gap-1">
                  <div className="flex items-center gap-2">
                    <Wallet size={16} className="text-[#EF4444]" />
                    <span className="text-[#EF4444] font-bold text-xs uppercase tracking-[0.6px]">Upcoming Bill</span>
                  </div>
                  <h3 className="text-white font-bold text-xl leading-[30px]">{upcomingBill.name}</h3>
                </div>
                <div className="flex flex-col items-end">
                  <span className="text-white font-bold text-2xl leading-9">${upcomingBill.amount.toLocaleString()}</span>
                  <span className="text-[#808BA4] font-semibold text-xs">
                    Due {formatDateLabel(upcomingBill.dueDate)}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={handleRecordManualPayment}
                  disabled={paying}
                  className="flex-1 h-12 bg-white rounded-xl text-[#05070A] font-bold text-sm active:scale-95 transition-transform disabled:opacity-70 flex items-center justify-center gap-2"
                >
                  {paying ? (
                    <><Loader2 size={16} className="animate-spin" /> Recording</>
                  ) : (
                    'Record manual payment'
                  )}
                </button>
              </div>
            </AccentCard>
          </div>
        )}

        {/* Goal Checkpoints */}
        {goalCheckpoints.length > 0 && (
          <div className="flex flex-col gap-4">
            <DayDivider text="Goal Milestones" />
            <div className="flex flex-col gap-3">
              {goalCheckpoints.map((cp) => (
                <AccentCard
                  key={`${cp.goalId}-w${cp.weekIndex}`}
                  accentColor={cp.status === 'behind' ? '#F59E0B' : cp.goalColor}
                  onClick={() => navigate(`/goals/${cp.goalId}`)}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex flex-col gap-1 flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        {cp.status === 'behind' ? (
                          <AlertTriangle size={14} className="text-[#F59E0B] flex-shrink-0" />
                        ) : (
                          <Flag size={14} style={{ color: cp.goalColor }} className="flex-shrink-0" />
                        )}
                        <span
                          className="font-bold text-xs uppercase tracking-[0.6px]"
                          style={{ color: cp.status === 'behind' ? '#F59E0B' : cp.goalColor }}
                        >
                          {cp.status === 'behind' ? 'Behind Schedule' : `Week ${cp.weekIndex} Milestone`}
                        </span>
                      </div>
                      <h3 className="text-white font-bold text-base leading-5 truncate">{cp.goalName}</h3>
                      <span className="text-[#808BA4] font-semibold text-[13px]">
                        {formatDollarsShort(cp.expectedAmount)} target
                      </span>
                    </div>
                    <div className="flex flex-col items-end flex-shrink-0">
                      <div className="flex items-center gap-1.5">
                        <Clock size={12} className="text-[#808BA4]" />
                        <span className="text-[#CBD5E1] font-bold text-sm">{cp.dateLabel}</span>
                      </div>
                    </div>
                  </div>
                </AccentCard>
              ))}
            </div>
          </div>
        )}

        {/* Future Briefings */}
        <div className="flex flex-col gap-4">
          <DayDivider text="Future Briefings" />
          {!briefings || briefings.length === 0 ? (
            <AccentCard>
              <div className="flex flex-col items-center gap-3 py-4 text-center">
                <div className="w-12 h-12 bg-white/5 rounded-2xl flex items-center justify-center">
                  <FileText size={22} className="text-[#808BA4]" />
                </div>
                <div className="flex flex-col gap-1">
                  <h3 className="text-white font-bold text-base">No Upcoming Briefings</h3>
                  <p className="text-[#808BA4] font-semibold text-sm leading-5">
                    Strategic briefings will appear here as your schedule fills in.
                  </p>
                </div>
              </div>
            </AccentCard>
          ) : (
            <div className="flex flex-col gap-4">
              {briefings.map((briefing) => (
                <AccentCard key={briefing.id} onClick={() => setSelectedBriefing(briefing)}>
                  <div className="flex items-center justify-between">
                    <div className="flex flex-col gap-0.5">
                      <span className="text-[#808BA4] font-bold text-xs uppercase tracking-[1.5px]">
                        {formatDateLabel(briefing.scheduledDate)} &bull; {briefing.type ?? 'Briefing'}
                      </span>
                      <h3 className="text-white font-bold text-lg leading-[27px]">{briefing.title}</h3>
                    </div>
                    {briefing.type === 'goal_review' ? (
                      <FileText size={24} className="text-white flex-shrink-0" />
                    ) : (
                      <Lightbulb size={24} className="text-white flex-shrink-0" />
                    )}
                  </div>
                </AccentCard>
              ))}
            </div>
          )}
        </div>

        <div className="h-4" />
      </div>

      {/* Briefing detail modal */}
      <AppModal
        open={!!selectedBriefing}
        onOpenChange={(open) => !open && setSelectedBriefing(null)}
        title={selectedBriefing?.title ?? ''}
      >
        {selectedBriefing && (
          <div className="flex flex-col gap-5 pb-4">
            <div
              className="rounded-2xl border p-4 flex items-center gap-3"
              style={{
                backgroundColor: `${briefingAccent(selectedBriefing.type)}12`,
                borderColor: `${briefingAccent(selectedBriefing.type)}35`,
              }}
            >
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{ backgroundColor: `${briefingAccent(selectedBriefing.type)}20` }}
              >
                {selectedBriefing.type === 'goal_review' ? (
                  <Flag size={18} style={{ color: briefingAccent(selectedBriefing.type) }} />
                ) : selectedBriefing.type === 'market_update' ? (
                  <Lightbulb size={18} style={{ color: briefingAccent(selectedBriefing.type) }} />
                ) : (
                  <Wallet size={18} style={{ color: briefingAccent(selectedBriefing.type) }} />
                )}
              </div>
              <div className="min-w-0">
                <div
                  className="font-bold text-[10px] uppercase tracking-[1.2px]"
                  style={{ color: briefingAccent(selectedBriefing.type) }}
                >
                  {briefingTypeLabel(selectedBriefing.type)}
                </div>
                <div className="text-white font-bold text-sm mt-0.5">
                  Scheduled for {new Date(`${selectedBriefing.scheduledDate}T12:00:00`).toLocaleDateString('en-US', {
                    weekday: 'long',
                    month: 'long',
                    day: 'numeric',
                  })}
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-2.5">
              {splitBriefingSummary(selectedBriefing.summary).map((point, index) => (
                <div
                  key={`${index}-${point}`}
                  className="bg-[#111827] border border-white/5 rounded-2xl px-4 py-3.5 flex items-start gap-3"
                >
                  <div
                    className="w-2 h-2 rounded-full flex-shrink-0 mt-1.5"
                    style={{ backgroundColor: briefingAccent(selectedBriefing.type) }}
                  />
                  <p className="text-[#E5E7EB] font-semibold text-sm leading-5">{point}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </AppModal>
    </AppShell>
  );
}
