import { ReactNode, useState } from 'react';
import {
  SlidersHorizontal,
  Wallet,
  ArrowRightLeft,
  FileText,
  Lightbulb,
  Loader2,
  CheckCircle2,
} from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import AppHeader from '@/components/AppHeader';
import AppShell from '@/components/AppShell';
import AppModal from '@/components/AppModal';
import { Switch } from '@/components/ui/switch';
import { mockUpcomingBill, mockBriefings, simulateAsync, type MockBriefing } from '@/lib/mockData';

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

export default function CalendarScreen() {
  const [billStatus, setBillStatus] = useState<'unpaid' | 'processing' | 'paid'>('unpaid');
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [autopay, setAutopay] = useState(false);
  const [selectedBriefing, setSelectedBriefing] = useState<MockBriefing | null>(null);

  const handleInitiatePayment = async () => {
    if (billStatus !== 'unpaid') return;
    setBillStatus('processing');
    // MOCK DATA - replace with a real bill-pay API call
    await simulateAsync(true, 1500);
    setBillStatus('paid');
    toast({ title: 'Payment Successful', description: `${mockUpcomingBill.merchant} bill of ${mockUpcomingBill.amount} paid.` });
  };

  return (
    <AppShell
      activeTab="calendar"
      headerClassName="h-[80px] px-8 bg-[#05070A]/90 backdrop-blur-[12px]"
      contentClassName="pt-[112px]"
      header={<AppHeader dashboard dashboardTitle="Financial Schedule" />}
    >
      <div className="flex flex-col gap-10">
        {/* Today */}
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

        {/* Tomorrow */}
        <div className="flex flex-col gap-4">
          <DayDivider text="Tomorrow" color="#CBD5E1" />
          <AccentCard accentColor="rgba(255,255,255,0.05)">
            <div className="flex items-start justify-between">
              <div className="flex flex-col gap-1">
                <div className="flex items-center gap-2">
                  <Wallet size={16} className="text-[#EF4444]" />
                  <span className="text-[#EF4444] font-bold text-xs uppercase tracking-[0.6px]">Upcoming Bill</span>
                </div>
                <h3 className="text-white font-bold text-xl leading-[30px]">Amex Gold</h3>
              </div>
              <div className="flex flex-col items-end">
                <span className="text-white font-bold text-2xl leading-9">{mockUpcomingBill.amount}</span>
                <span className="text-[#808BA4] font-semibold text-xs">
                  {billStatus === 'paid' ? 'Paid' : mockUpcomingBill.dueLabel}
                </span>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={handleInitiatePayment}
                disabled={billStatus !== 'unpaid'}
                className="flex-1 h-12 bg-white rounded-xl text-[#05070A] font-bold text-sm active:scale-95 transition-transform disabled:opacity-70 flex items-center justify-center gap-2"
              >
                {billStatus === 'processing' ? (
                  <>
                    <Loader2 size={16} className="animate-spin" /> Processing
                  </>
                ) : billStatus === 'paid' ? (
                  <>
                    <CheckCircle2 size={16} /> Payment Sent
                  </>
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

        {/* Oct 14 */}
        <div className="flex flex-col gap-4">
          <DayDivider text="Oct 14" />
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

        {/* Future Briefings */}
        <div className="flex flex-col gap-4">
          <DayDivider text="Future Briefings" />
          <div className="flex flex-col gap-4">
            {mockBriefings.map((briefing) => (
              <AccentCard key={briefing.id} onClick={() => setSelectedBriefing(briefing)}>
                <div className="flex items-center justify-between">
                  <div className="flex flex-col gap-0.5">
                    <span className="text-[#808BA4] font-bold text-xs uppercase tracking-[1.5px]">
                      {briefing.dateLabel} &bull; {briefing.category}
                    </span>
                    <h3 className="text-white font-bold text-lg leading-[27px]">{briefing.title}</h3>
                  </div>
                  {briefing.id === 'credit-chase' ? (
                    <FileText size={24} className="text-white flex-shrink-0" />
                  ) : (
                    <Lightbulb size={24} className="text-white flex-shrink-0" />
                  )}
                </div>
              </AccentCard>
            ))}
          </div>
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
                Automatically pay {mockUpcomingBill.merchant} on the due date
              </span>
            </div>
            <Switch
              checked={autopay}
              onCheckedChange={(next) => {
                setAutopay(next);
                toast({
                  title: next ? 'Autopay Enabled' : 'Autopay Disabled',
                  description: next
                    ? `${mockUpcomingBill.merchant} will be paid automatically each cycle.`
                    : `You'll need to pay ${mockUpcomingBill.merchant} manually.`,
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
              {selectedBriefing.dateLabel} &bull; {selectedBriefing.category}
            </span>
            <p className="text-[#E5E7EB] font-semibold text-base leading-6">{selectedBriefing.detail}</p>
          </div>
        )}
      </AppModal>
    </AppShell>
  );
}
