import { ChevronLeft, ChevronRight, Plus, Bell, Wallet, ArrowUpRight, ArrowDownRight, AlertCircle } from 'lucide-react';
import AppHeader from '@/components/AppHeader';
import AppShell from '@/components/AppShell';
import Avatar from '@/components/Avatar';
import SectionLabel from '@/components/SectionLabel';

const days = [
  { day: 29, prev: true },
  { day: 30, prev: true },
  { day: 1 },
  { day: 2 },
  { day: 3, events: ['green'] },
  { day: 4 },
  { day: 5 },
  { day: 6 },
  { day: 7, events: ['amber'] },
  { day: 8 },
  { day: 9 },
  { day: 10, events: ['red'] },
  { day: 11 },
  { day: 12 },
  { day: 13 },
  { day: 14, events: ['green', 'amber'] },
  { day: 15 },
  { day: 16 },
  { day: 17 },
  { day: 18, events: ['amber'] },
  { day: 19 },
  { day: 20 },
  { day: 21 },
  { day: 22, events: ['green'] },
  { day: 23 },
  { day: 24 },
  { day: 25 },
  { day: 26 },
  { day: 27, events: ['red'] },
  { day: 28 },
  { day: 29 },
  { day: 30 },
  { day: 31 },
  { day: 1, next: true },
  { day: 2, next: true },
];

const dayLetters = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

const events = [
  {
    day: '14',
    month: 'OCT',
    title: 'Q3 Investment Dividend',
    subtitle: 'Fidelity brokerage account',
    amount: '+$1,240.00',
    type: 'income',
    status: 'Confirmed',
  },
  {
    day: '18',
    month: 'OCT',
    title: 'Mortgage Payment',
    subtitle: 'Chase Home Lending',
    amount: '-$2,850.00',
    type: 'bill',
    status: 'Scheduled',
  },
  {
    day: '27',
    month: 'OCT',
    title: 'Credit Card Due',
    subtitle: 'Amex Platinum',
    amount: '$4,120.00',
    type: 'deadline',
    status: 'Due Soon',
  },
  {
    day: '03',
    month: 'NOV',
    title: 'Auto-Save Transfer',
    subtitle: 'High-yield savings',
    amount: '+$500.00',
    type: 'income',
    status: 'Recurring',
  },
];

function EventDot({ color }: { color: string }) {
  const colorClass =
    color === 'green' ? 'bg-[#22C55E]' : color === 'amber' ? 'bg-[#F59E0B]' : 'bg-[#EF4444]';
  return <div className={`w-1.5 h-1.5 rounded-full ${colorClass}`} />;
}

function EventIcon({ type }: { type: string }) {
  if (type === 'income') return <ArrowUpRight size={14} className="text-[#22C55E]" />;
  if (type === 'bill') return <Wallet size={14} className="text-[#F59E0B]" />;
  return <AlertCircle size={14} className="text-[#EF4444]" />;
}

export default function CalendarScreen() {
  return (
    <AppShell activeTab="calendar" header={<AppHeader rightElement={<Avatar fallback="AL" />} />}>
      <div className="pt-2">
        <p className="text-[#94A3B8] text-sm">Planning</p>
        <h1 className="text-white font-black text-3xl leading-tight tracking-tight mt-1">Financial Calendar</h1>
        <p className="text-[#94A3B8] text-sm mt-2">Upcoming obligations and opportunities.</p>
      </div>

      <div className="mt-6 bg-[#0F1625] border border-[#1A2238] rounded-xl p-4">
        <div className="flex items-center justify-between mb-4">
          <button className="text-[#94A3B8] hover:text-white transition-colors p-1">
            <ChevronLeft size={20} />
          </button>
          <span className="text-white font-bold text-base">October 2024</span>
          <button className="text-[#94A3B8] hover:text-white transition-colors p-1">
            <ChevronRight size={20} />
          </button>
        </div>

        <div className="grid grid-cols-7 mb-2">
          {dayLetters.map((letter, index) => (
            <div key={`day-letter-${index}`} className="text-center text-[#64748B] text-xs font-bold tracking-wider py-2">
              {letter}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-1">
          {days.map((d, i) => {
            const isSelected = d.day === 14 && !d.prev && !d.next;
            return (
              <div
                key={i}
                className={`aspect-square flex flex-col items-center justify-center rounded-xl text-sm font-semibold relative ${
                  d.prev || d.next
                    ? 'text-[#475569]'
                    : isSelected
                    ? 'bg-[#2563EB] text-white'
                    : 'text-white bg-[#131E35]/50'
                }`}
              >
                <span>{d.day}</span>
                {d.events && d.events.length > 0 && (
                  <div className="flex items-center gap-0.5 mt-1">
                    {d.events.map((c, idx) => (
                      <EventDot key={idx} color={c} />
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <div className="mt-6 flex items-center justify-between">
        <SectionLabel text="UPCOMING" accentBar />
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5">
            <EventDot color="green" />
            <span className="text-[#64748B] text-[10px] uppercase tracking-wider">Income</span>
          </div>
          <div className="flex items-center gap-1.5">
            <EventDot color="amber" />
            <span className="text-[#64748B] text-[10px] uppercase tracking-wider">Bill</span>
          </div>
          <div className="flex items-center gap-1.5">
            <EventDot color="red" />
            <span className="text-[#64748B] text-[10px] uppercase tracking-wider">Due</span>
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-3">
        {events.map((event, index) => (
          <div
            key={index}
            className="bg-[#0F1625] border border-[#1A2238] rounded-xl p-4 flex items-center gap-4"
          >
            <div className="bg-[#131E35] rounded-xl p-3 flex flex-col items-center justify-center min-w-[56px]">
              <span className="text-white text-lg font-black leading-none">{event.day}</span>
              <span className="text-[#64748B] text-[10px] font-bold tracking-wider mt-0.5">{event.month}</span>
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <h4 className="text-white font-semibold text-sm truncate">{event.title}</h4>
                <span
                  className={`text-xs font-semibold flex-shrink-0 ${
                    event.type === 'income'
                      ? 'text-[#22C55E]'
                      : event.type === 'bill'
                      ? 'text-[#F59E0B]'
                      : 'text-[#EF4444]'
                  }`}
                >
                  {event.amount}
                </span>
              </div>
              <p className="text-[#64748B] text-xs truncate mt-0.5">{event.subtitle}</p>
              <div className="flex items-center gap-2 mt-2">
                <div className="flex items-center gap-1 text-[#64748B] text-[10px] uppercase tracking-wider">
                  <EventIcon type={event.type} />
                  {event.status}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-6 bg-[#0F1625] border border-[#1A2238] rounded-xl p-4 flex items-center gap-3">
        <div className="bg-[#2563EB]/10 rounded-full p-2">
          <Bell size={18} className="text-[#2563EB]" />
        </div>
        <div className="flex-1">
          <div className="text-white text-sm font-semibold">Reminders enabled</div>
          <div className="text-[#64748B] text-xs">3 days before each due date</div>
        </div>
        <button className="bg-[#2563EB] hover:bg-[#1D4ED8] text-white rounded-full p-2 transition-colors">
          <Plus size={16} />
        </button>
      </div>
    </AppShell>
  );
}
