import { ReactNode, useState } from 'react';
import {
  SlidersHorizontal,
  Wallet,
  ArrowRightLeft,
  FileText,
  Lightbulb,
  Loader2,
  CheckCircle2,
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
import { Switch } from '@/components/ui/switch';
import {
  useListBills,
  usePayBill,
  useListBriefings,
  useListGoals,
  getListBillsQueryKey,
} from '@workspace/api-client-react';
import type { Briefing } from '@workspace/api-client-react';

// ── Helpers ───────────────────────────────────────────────────────────────────

const GOAL_TYPE_COLORS: Record<string, string> = {
  home_purchase: '#22C55E',
  retirement: '#3B82F6',
  education: '#F59E0B',
  emergency_fund: '#10B981',
  investment: '#8B5CF6',
  other: '#6B7280',
};

function formatDollarsShort(n: number): string {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `$${Math.round(n / 1_000)}K`;
  return `$${n.toLocaleString()}`;
}

interface GoalCheckpoint {
  goalId: string;
  goalName: string;
  goalColor: string;
  pct: number;
  requiredAmount: number;
  estimatedDate: Date;
  dateLabel: string;
  status: 'behind' | 'upcoming';
}

function computeGoalCheckpoints(
  goals: ReturnType<typeof useListGoals>['data'],
): GoalCheckpoint[] {
  if (!goals) return [];
  const now = new Date();
  const msPerMonth = 30.44 * 24 * 60 * 60 * 1000;

  const items: GoalCheckpoint[] = [];

  for (const g of goals) {
    if (g.status === 'deleted' || g.targetAmount <= 0) continue;
    const monthly = g.monthlyContribution ?? 0;
    if (monthly <= 0) continue; // can't estimate without contribution

    const createdAt = new Date(g.createdAt);
    const targetDate = g.targetDate ? new Date(g.targetDate) : null;

    for (const pct of [25, 50, 75, 100]) {
      const requiredAmount = Math.round(g.targetAmount * (pct / 100));
      if (g.currentAmount >= requiredAmount) continue; // already reached

      const remaining = requiredAmount - g.currentAmount;
      const monthsToMilestone = remaining / monthly;
      const estimatedDate = new Date(now.getTime() + monthsToMilestone * msPerMonth);

      let status: GoalCheckpoint['status'] = 'upcoming';
      if (targetDate) {
        const totalMs = targetDate.getTime() - createdAt.getTime();
        const proportionalTarget = new Date(
          createdAt.getTime() + (pct / 100) * totalMs,
        );
        if (estimatedDate > proportionalTarget && now > proportionalTarget) {
          status = 'behind';
        }
      }

      items.push({
        goalId: g.id,
        goalName: g.name,
        goalColor: GOAL_TYPE_COLORS[g.type] ?? '#6B7280',
        pct,
        requiredAmount,
        estimatedDate,
        dateLabel: estimatedDate.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
        status,
      });
      break; // only show the NEXT upcoming milestone per goal
    }
  }

  return items
    .sort((a, b) => a.estimatedDate.getTime() - b.estimatedDate.getTime())
    .slice(0, 5);
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
  return (
    <div
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      className={`bg-[#111827] rounded-[20px] p-6 flex flex-col gap-4 ${dimmed ? 'opacity-60' : ''} ${
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

export default function CalendarScreen() {
  const [, navigate] = useLocation();
  const queryClient = useQueryClient();

  const { data: bills } = useListBills();
  const { data: briefings } = useListBriefings();
  const { data: goals } = useListGoals();
  const { mutateAsync: payBill, isPending: paying } = usePayBill();

  const goalCheckpoints = computeGoalCheckpoints(goals);

  const [settingsOpen, setSettingsOpen] = useState(false);
  const [autopay, setAutopay] = useState(false);
  const [selectedBriefing, setSelectedBriefing] = useState<Briefing | null>(null);

  // Upcoming: the next unpaid bill sorted by due date
  const upcomingBill = (bills ?? [])
    .filter((b) => !b.isPaid)
    .sort((a, b) => a.dueDate.localeCompare(b.dueDate))[0] ?? null;

  const handleInitiatePayment = async () => {
    if (!upcomingBill || paying) return;
    try {
      await payBill({ id: upcomingBill.id });
      await queryClient.invalidateQueries({ queryKey: getListBillsQueryKey() });
      toast({ title: 'Payment Successful', description: `${upcomingBill.name} bill of $${upcomingBill.amount.toLocaleString()} paid.` });
    } catch {
      toast({ title: 'Payment Failed', description: 'Could not process payment. Please try again.', variant: 'destructive' });
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
          <AccentCard dimmed>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 flex items-center justify-center">
                <div className="w-2 h-2 rounded-full bg-[#22C55E]" />
              </div>
              <span className="text-[#22C55E] font-bold text-xs uppercase tracking-[0.6px]">
                Mission Accomplished
              </span>
            </div>
            <h3 className="text-white font-bold text-lg leading-[22px] -mt-1">Optimize Debt Interest</h3>
            <div className="flex items-center gap-2">
              <SlidersHorizontal size={16} className="text-[#808BA4]" />
              <span className="text-[#808BA4] font-semibold text-[13px]">Interest rate reduced by 1.2%</span>
            </div>
          </AccentCard>
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
                  onClick={handleInitiatePayment}
                  disabled={paying}
                  className="flex-1 h-12 bg-white rounded-xl text-[#05070A] font-bold text-sm active:scale-95 transition-transform disabled:opacity-70 flex items-center justify-center gap-2"
                >
                  {paying ? (
                    <><Loader2 size={16} className="animate-spin" /> Processing</>
                  ) : (
                    'Initiate Payment'
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => setSettingsOpen(true)}
                  className="w-12 h-12 border border-white/10 rounded-xl flex items-center justify-center text-white active:scale-95 transition-transform flex-shrink-0"
                >
                  <SlidersHorizontal size={16} />
                </button>
              </div>
            </AccentCard>
          </div>
        )}

        {/* Automated savings (static — Plaid/investment integration out of scope) */}
        <div className="flex flex-col gap-4">
          <DayDivider text="Scheduled" />
          <AccentCard accentColor="#3B82F6">
            <div className="flex items-center gap-2">
              <ArrowRightLeft size={16} className="text-[#3B82F6]" />
              <span className="text-[#3B82F6] font-bold text-xs uppercase tracking-[0.6px]">Automated Savings</span>
            </div>
            <div className="flex items-end justify-between">
              <div className="flex flex-col gap-1">
                <h3 className="text-white font-bold text-lg leading-[27px]">Wealthfront Transfer</h3>
                <span className="text-[#808BA4] font-semibold text-sm leading-[21px]">From Checking (4012)</span>
              </div>
              <span className="text-[#3B82F6] font-bold text-2xl leading-9">$2,500</span>
            </div>
          </AccentCard>
        </div>

        {/* Goal Checkpoints */}
        {goalCheckpoints.length > 0 && (
          <div className="flex flex-col gap-4">
            <DayDivider text="Goal Milestones" />
            <div className="flex flex-col gap-3">
              {goalCheckpoints.map((cp) => (
                <AccentCard
                  key={`${cp.goalId}-${cp.pct}`}
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
                          {cp.status === 'behind' ? 'Behind Schedule' : `${cp.pct}% Milestone`}
                        </span>
                      </div>
                      <h3 className="text-white font-bold text-base leading-5 truncate">{cp.goalName}</h3>
                      <span className="text-[#808BA4] font-semibold text-[13px]">
                        {formatDollarsShort(cp.requiredAmount)} target
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

      {/* Bill settings modal */}
      <AppModal open={settingsOpen} onOpenChange={setSettingsOpen} title="Bill Settings">
        <div className="flex flex-col gap-5 pb-4">
          <div className="bg-[#111827] border border-white/5 rounded-2xl p-5 flex items-center justify-between">
            <div className="flex flex-col gap-1">
              <span className="text-white font-bold text-[15px]">Autopay</span>
              <span className="text-[#808BA4] font-semibold text-[13px]">
                Automatically pay {upcomingBill?.name ?? 'this bill'} on the due date
              </span>
            </div>
            <Switch
              checked={autopay}
              onCheckedChange={(next) => {
                setAutopay(next);
                toast({
                  title: next ? 'Autopay Enabled' : 'Autopay Disabled',
                  description: next
                    ? `${upcomingBill?.name ?? 'Bill'} will be paid automatically each cycle.`
                    : `You'll need to pay ${upcomingBill?.name ?? 'this bill'} manually.`,
                });
              }}
            />
          </div>
          <div className="bg-[#111827] border border-white/5 rounded-2xl p-5 flex items-center justify-between">
            <span className="text-white font-bold text-[15px]">Reminder</span>
            <span className="text-[#808BA4] font-semibold text-[13px]">24h before due</span>
          </div>
        </div>
      </AppModal>

      {/* Briefing detail modal */}
      <AppModal
        open={!!selectedBriefing}
        onOpenChange={(open) => !open && setSelectedBriefing(null)}
        title={selectedBriefing?.title ?? ''}
      >
        {selectedBriefing && (
          <div className="flex flex-col gap-4 pb-4">
            <span className="text-[#808BA4] font-bold text-xs uppercase tracking-[1.5px]">
              {formatDateLabel(selectedBriefing.scheduledDate)} &bull; {selectedBriefing.type ?? 'Briefing'}
            </span>
            <p className="text-[#E5E7EB] font-semibold text-base leading-6">
              {selectedBriefing.summary ?? 'No additional details available.'}
            </p>
          </div>
        )}
      </AppModal>
    </AppShell>
  );
}
