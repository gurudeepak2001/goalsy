import { useState } from 'react';
import { useLocation } from 'wouter';
import {
  Sparkles,
  Wallet,
  CalendarClock,
  ChevronRight,
  Target,
  HeartPulse,
  Loader2,
  CheckCircle2,
  Zap,
  SkipForward,
} from 'lucide-react';
import { useUser } from '@clerk/react';
import { toast } from '@/hooks/use-toast';
import AppHeader from '@/components/AppHeader';
import AppModal from '@/components/AppModal';
import AppShell from '@/components/AppShell';
import {
  mockConnectedAccounts,
  mockUpcomingBill,
  mockBriefings,
  mockGoals,
  simulateAsync,
} from '@/lib/mockData';

function parseBalance(balance: string): number {
  return Number(balance.replace(/[^0-9.-]/g, ''));
}

const totalBalance = mockConnectedAccounts.reduce((sum, acc) => sum + parseBalance(acc.balance), 0);
const avgGoalProgress = Math.round(
  mockGoals.reduce((sum, goal) => sum + goal.progress, 0) / mockGoals.length,
);

export default function TodayScreen() {
  const [, navigate] = useLocation();
  const { user } = useUser();
  const [actionStatus, setActionStatus] = useState<'idle' | 'processing' | 'done'>('idle');
  const [missionActive, setMissionActive] = useState(true);
  const [skipOpen, setSkipOpen] = useState(false);
  const [skipReason, setSkipReason] = useState<string | null>(null);

  const skipReasons = [
    'Not enough funds right now',
    'Already handled this',
    'Will do it later',
    'Not relevant to me',
  ];

  const handleConfirmSkip = () => {
    setMissionActive(false);
    setSkipOpen(false);
    setSkipReason(null);
    toast({ title: 'Mission Skipped', description: 'Your next mission will appear tomorrow.' });
  };

  const metadataName = typeof user?.unsafeMetadata?.fullName === 'string' ? user.unsafeMetadata.fullName : undefined;
  const firstName = (metadataName || user?.fullName || '').trim().split(' ')[0] || 'there';

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';
  const dateLabel = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });

  const handleTopAction = async () => {
    if (actionStatus !== 'idle') return;
    setActionStatus('processing');
    // MOCK DATA - replace with a real payment API call
    await simulateAsync(true, 1500);
    setActionStatus('done');
    toast({ title: 'Payment Scheduled', description: `${mockUpcomingBill.merchant} payment queued before ${mockUpcomingBill.dueLabel.toLowerCase()}.` });
  };

  const pulseCards = [
    { label: 'Goalsy Score', value: '842', trend: '+4 wk', color: '#22C55E', icon: Sparkles, path: '/score' },
    { label: 'Goals', value: `${avgGoalProgress}%`, trend: `${mockGoals.length} active`, color: '#3B82F6', icon: Target, path: '/goals' },
    { label: 'Cash Flow', value: '+$4.2k', trend: 'mo. surplus', color: '#F59E0B', icon: HeartPulse, path: '/financial-health' },
  ];

  return (
    <AppShell activeTab="today" header={<AppHeader dashboard dashboardTitle="Today" />}>
      <div className="flex flex-col gap-8">
        {/* Greeting */}
        <div className="flex flex-col gap-1">
          <span className="text-[#808BA4] font-semibold text-sm uppercase" style={{ letterSpacing: '2px' }}>
            {dateLabel}
          </span>
          <h1 className="text-white font-bold text-[32px] leading-[42px]" style={{ letterSpacing: '-0.8px' }}>
            {greeting}, {firstName}.
          </h1>
        </div>

        {/* Hero: Total Balance */}
        <div className="bg-[#111827] border border-white/5 rounded-3xl p-6 flex flex-col gap-3 relative overflow-hidden">
          <div className="absolute right-1 top-1 opacity-5 p-4">
            <div className="w-24 h-24 bg-[#2563EB] rounded-full" />
          </div>
          <div className="flex items-center gap-2">
            <Wallet size={16} className="text-[#808BA4]" />
            <span className="text-[#808BA4] font-bold text-xs uppercase tracking-[1.5px]">Total Balance</span>
          </div>
          <div className="flex items-end gap-3">
            <span className="text-white font-bold text-[40px] leading-[44px]" style={{ letterSpacing: '-1.5px' }}>
              ${totalBalance.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
            </span>
            <span className="text-[#22C55E] font-bold text-sm leading-5 mb-1.5 whitespace-nowrap">+2.1% wk</span>
          </div>
        </div>

        {/* AI Daily Summary */}
        <div className="bg-[#111827] border border-white/5 rounded-3xl p-6 flex items-start gap-4">
          <div className="w-10 h-10 bg-[#2563EB]/10 rounded-xl flex items-center justify-center flex-shrink-0">
            <Zap size={18} className="text-[#2563EB]" />
          </div>
          <p className="text-[#E5E7EB] font-semibold text-sm leading-6 pt-1.5">
            No bills are overdue and spending is 12% under target this week — you're on track.
          </p>
        </div>

        {/* Pulse row */}
        <div className="grid grid-cols-3 gap-3">
          {pulseCards.map((card) => (
            <button
              key={card.label}
              type="button"
              onClick={() => navigate(card.path)}
              className="bg-[#111827] border border-white/5 rounded-2xl p-4 flex flex-col items-start gap-2 text-left active:scale-95 transition-transform"
            >
              <card.icon size={16} style={{ color: card.color }} />
              <span className="text-white font-bold text-lg leading-6">{card.value}</span>
              <div className="flex flex-col gap-0.5">
                <span className="text-[#808BA4] font-bold text-[10px] uppercase tracking-[0.5px] leading-3">
                  {card.label}
                </span>
                <span className="text-[#808BA4] font-semibold text-[10px] leading-3">{card.trend}</span>
              </div>
            </button>
          ))}
        </div>

        {/* Today's Agenda */}
        <div className="flex flex-col gap-4">
          <h2 className="text-[#CBD5E1] font-bold text-sm uppercase tracking-[1.5px]">Today's Agenda</h2>
          <button
            type="button"
            onClick={() => navigate('/calendar')}
            className="bg-[#111827] border border-white/5 rounded-2xl p-5 flex items-center justify-between text-left active:scale-95 transition-transform"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-[#EF4444]/10 rounded-xl flex items-center justify-center flex-shrink-0">
                <Wallet size={16} className="text-[#EF4444]" />
              </div>
              <div className="flex flex-col gap-0.5">
                <span className="text-white font-semibold text-sm leading-5">{mockUpcomingBill.merchant} bill</span>
                <span className="text-[#808BA4] font-semibold text-xs leading-4">{mockUpcomingBill.dueLabel}</span>
              </div>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <span className="text-white font-bold text-sm">{mockUpcomingBill.amount}</span>
              <ChevronRight size={16} className="text-[#808BA4]" />
            </div>
          </button>
          <button
            type="button"
            onClick={() => navigate('/calendar')}
            className="bg-[#111827] border border-white/5 rounded-2xl p-5 flex items-center justify-between text-left active:scale-95 transition-transform"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-[#3B82F6]/10 rounded-xl flex items-center justify-center flex-shrink-0">
                <CalendarClock size={16} className="text-[#3B82F6]" />
              </div>
              <div className="flex flex-col gap-0.5">
                <span className="text-white font-semibold text-sm leading-5">{mockBriefings[0].title}</span>
                <span className="text-[#808BA4] font-semibold text-xs leading-4">{mockBriefings[0].dateLabel}</span>
              </div>
            </div>
            <ChevronRight size={16} className="text-[#808BA4] flex-shrink-0" />
          </button>
        </div>

        {/* Top Recommended Action */}
        <div className="flex flex-col gap-4">
          <h2 className="text-[#CBD5E1] font-bold text-sm uppercase tracking-[1.5px]">Top Recommended Action</h2>
          {missionActive ? (
            <div className="bg-[#111827] border border-white/5 rounded-3xl p-5 flex flex-col gap-4">
              <div className="flex items-start justify-between gap-3">
                <span className="text-[10px] font-bold uppercase tracking-[0.5px] px-2 py-1 rounded-full text-[#EF4444] bg-[#EF4444]/10">
                  Priority
                </span>
                <span className="text-[#22C55E] font-bold text-sm whitespace-nowrap">+2 Goalsy Score</span>
              </div>
              <h3 className="text-white font-bold text-lg leading-[25px]">
                Pay {mockUpcomingBill.merchant} bill — {mockUpcomingBill.dueLabel.toLowerCase()}
              </h3>
              <button
                type="button"
                onClick={handleTopAction}
                disabled={actionStatus !== 'idle'}
                className={`h-11 rounded-xl font-bold text-sm active:scale-95 transition-transform disabled:opacity-70 flex items-center justify-center gap-2 ${
                  actionStatus === 'done' ? 'bg-[rgba(34,197,94,0.15)] text-[#22C55E]' : 'bg-white text-[#05070A]'
                }`}
              >
                {actionStatus === 'processing' ? (
                  <>
                    <Loader2 size={16} className="animate-spin" /> Processing
                  </>
                ) : actionStatus === 'done' ? (
                  <>
                    <CheckCircle2 size={16} /> Payment Scheduled
                  </>
                ) : (
                  'Pay Now'
                )}
              </button>
              {actionStatus === 'idle' && (
                <button
                  type="button"
                  onClick={() => setSkipOpen(true)}
                  className="flex items-center justify-center gap-1.5 text-[#808BA4] font-semibold text-sm py-1 active:opacity-60 transition-opacity"
                >
                  <SkipForward size={14} />
                  Skip this mission
                </button>
              )}
            </div>
          ) : (
            <div className="bg-[#111827] border border-white/5 rounded-3xl p-8 flex flex-col items-center gap-4 text-center">
              <div className="w-12 h-12 bg-[rgba(34,197,94,0.1)] border border-[rgba(34,197,94,0.2)] rounded-2xl flex items-center justify-center">
                <CheckCircle2 size={24} className="text-[#22C55E]" />
              </div>
              <div className="flex flex-col gap-1">
                <h3 className="text-white font-bold text-base">All Clear for Now</h3>
                <p className="text-[#808BA4] font-semibold text-sm leading-5">
                  You've skipped today's mission. Your next mission will appear tomorrow.
                </p>
              </div>
            </div>
          )}
        </div>

        <div className="h-8" />
      </div>

      {/* Skip mission modal */}
      <AppModal open={skipOpen} onOpenChange={setSkipOpen} title="Skip Today's Mission">
        <div className="flex flex-col gap-5 pb-4">
          <p className="text-[#808BA4] font-semibold text-sm leading-5">
            Let us know why you're skipping so we can refine future recommendations.
          </p>
          <div className="flex flex-col gap-3">
            {skipReasons.map((reason) => (
              <button
                key={reason}
                type="button"
                onClick={() => setSkipReason(reason)}
                className={`px-4 py-3.5 rounded-2xl border text-left font-semibold text-sm transition-colors ${
                  skipReason === reason
                    ? 'border-[#2563EB] bg-[#2563EB]/10 text-white'
                    : 'border-white/10 bg-[#111827] text-[#CBD5E1]'
                }`}
              >
                {reason}
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={handleConfirmSkip}
            disabled={!skipReason}
            className="h-12 rounded-xl bg-white text-[#05070A] font-bold text-sm active:scale-95 transition-transform disabled:opacity-40"
          >
            Confirm Skip
          </button>
        </div>
      </AppModal>
    </AppShell>
  );
}
