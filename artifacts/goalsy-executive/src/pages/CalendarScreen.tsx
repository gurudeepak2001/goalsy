import { useState } from 'react';
import { ChevronLeft, ChevronRight, Plus, Bell, Wallet, ArrowUpRight, ArrowDownRight, AlertCircle, Search, ChevronRight as ChevronRightIcon } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import AppHeader from '@/components/AppHeader';
import AppShell from '@/components/AppShell';
import Avatar from '@/components/Avatar';
import SectionLabel from '@/components/SectionLabel';

const dayLetters = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

const octoberEvents: Record<number, string[]> = {
  3: ['green'],
  7: ['amber'],
  10: ['red'],
  14: ['green', 'amber'],
  18: ['amber'],
  22: ['green'],
  27: ['red'],
};

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfMonth(year: number, month: number) {
  return new Date(year, month, 1).getDay();
}

function generateCalendarDays(year: number, month: number) {
  const daysInMonth = getDaysInMonth(year, month);
  const firstDay = getFirstDayOfMonth(year, month);
  const daysInPrevMonth = getDaysInMonth(year, month - 1);

  const days: Array<{ day: number; prev?: boolean; next?: boolean; events?: string[] }> = [];

  for (let i = firstDay - 1; i >= 0; i--) {
    days.push({ day: daysInPrevMonth - i, prev: true });
  }

  for (let i = 1; i <= daysInMonth; i++) {
    const events = year === 2024 && month === 9 ? octoberEvents[i] : undefined;
    days.push({ day: i, events });
  }

  const remaining = 42 - days.length;
  for (let i = 1; i <= remaining; i++) {
    days.push({ day: i, next: true });
  }

  return days;
}

const months = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

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
  const [monthIndex, setMonthIndex] = useState(9);
  const [year, setYear] = useState(2024);
  const [selectedDay, setSelectedDay] = useState(14);

  const prevMonth = () => {
    if (monthIndex === 0) {
      setMonthIndex(11);
      setYear((y) => y - 1);
    } else {
      setMonthIndex((m) => m - 1);
    }
  };

  const nextMonth = () => {
    if (monthIndex === 11) {
      setMonthIndex(0);
      setYear((y) => y + 1);
    } else {
      setMonthIndex((m) => m + 1);
    }
  };

  const calendarDays = generateCalendarDays(year, monthIndex);

  return (
    <AppShell activeTab="calendar" header={<AppHeader showSecureMode rightElement={<Avatar fallback="AL" />} />}>
      <div className="pt-2">
        <p className="text-[#64748B] text-[13px] font-bold tracking-wide uppercase">Planning</p>
        <h1 className="text-white font-black text-[32px] leading-9 tracking-tight mt-1">Financial Calendar</h1>
        <p className="text-[#94A3B8] text-sm mt-2">Upcoming obligations and opportunities.</p>
      </div>

      <div className="mt-8 bg-[#0F1625] border border-[#1A2238] rounded-2xl p-5">
        <div className="flex items-center justify-between mb-5">
          <button onClick={prevMonth} className="w-8 h-8 flex items-center justify-center bg-[#131E35] border border-[#1A2238] text-[#94A3B8] hover:text-white transition-colors rounded-lg" aria-label="Previous month">
            <ChevronLeft size={18} />
          </button>
          <span className="text-white font-bold text-[15px] tracking-wide">{months[monthIndex]} {year}</span>
          <button onClick={nextMonth} className="w-8 h-8 flex items-center justify-center bg-[#131E35] border border-[#1A2238] text-[#94A3B8] hover:text-white transition-colors rounded-lg" aria-label="Next month">
            <ChevronRight size={18} />
          </button>
        </div>

        <div className="grid grid-cols-7 mb-2">
          {dayLetters.map((letter, index) => (
            <div key={`day-letter-${index}`} className="text-center text-[#64748B] text-xs font-bold tracking-[0.1em] py-2">
              {letter}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-y-2 gap-x-1">
          {calendarDays.map((d, i) => {
            const isSelected = d.day === selectedDay && !d.prev && !d.next;
            return (
              <button
                key={i}
                onClick={() => !d.prev && !d.next && setSelectedDay(d.day)}
                className={`aspect-square flex flex-col items-center justify-center rounded-xl text-[15px] font-bold relative transition-colors ${
                  d.prev || d.next
                    ? 'text-[#334155]'
                    : isSelected
                    ? 'bg-[#2563EB] text-white shadow-[0_0_12px_rgba(37,99,235,0.4)]'
                    : 'text-white bg-transparent hover:bg-[#1A2238]'
                }`}
                aria-label={d.prev || d.next ? undefined : `Day ${d.day}`}
              >
                <span className={d.events && d.events.length > 0 ? "mb-1.5" : ""}>{d.day}</span>
                {d.events && d.events.length > 0 && (
                  <div className="flex items-center gap-[3px] absolute bottom-2">
                    {d.events.map((c, idx) => (
                      <EventDot key={idx} color={c} />
                    ))}
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>

      <div className="mt-8 flex items-center justify-between">
        <SectionLabel text="UPCOMING" accentBar className="mb-0" />
        <button className="w-8 h-8 bg-[#0F1625] border border-[#1A2238] rounded-lg flex items-center justify-center text-[#64748B] hover:text-white transition-colors" aria-label="Search events">
          <Search size={14} />
        </button>
      </div>

      <div className="flex items-center justify-start gap-4 mt-3 mb-4">
        <div className="flex items-center gap-1.5">
          <EventDot color="green" />
          <span className="text-[#64748B] text-[10px] uppercase tracking-[0.05em] font-bold">Income</span>
        </div>
        <div className="flex items-center gap-1.5">
          <EventDot color="amber" />
          <span className="text-[#64748B] text-[10px] uppercase tracking-[0.05em] font-bold">Bill</span>
        </div>
        <div className="flex items-center gap-1.5">
          <EventDot color="red" />
          <span className="text-[#64748B] text-[10px] uppercase tracking-[0.05em] font-bold">Due</span>
        </div>
      </div>

      <div className="flex flex-col gap-3">
        {events.map((event, index) => (
          <button
            key={index}
            onClick={() => toast({ title: event.title, description: 'Event details coming soon.' })}
            className="bg-[#0F1625] border border-[#1A2238] rounded-2xl p-3.5 flex items-stretch gap-4 text-left hover:bg-[#131E35] transition-colors w-full group"
          >
            <div className="bg-[#131E35] border border-[#1A2238] rounded-xl p-3 flex flex-col items-center justify-center min-w-[60px]">
              <span className="text-white text-[20px] font-black leading-none">{event.day}</span>
              <span className="text-[#64748B] text-[10px] font-bold tracking-[0.1em] mt-1">{event.month}</span>
            </div>
            <div className="flex-1 flex flex-col justify-center min-w-0">
              <div className="flex items-center justify-between">
                <h4 className="text-white font-bold text-[15px] truncate pr-2">{event.title}</h4>
                <span
                  className={`text-[13px] font-bold flex-shrink-0 ${
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
              <p className="text-[#94A3B8] text-[13px] truncate mt-0.5">{event.subtitle}</p>
              <div className="flex items-center gap-2 mt-2">
                <div className="flex items-center gap-1 text-[#64748B] text-[11px] uppercase tracking-[0.05em] font-bold">
                  <EventIcon type={event.type} />
                  {event.status}
                </div>
              </div>
            </div>
            <div className="flex items-center justify-center">
              <ChevronRightIcon size={18} className="text-[#475569] group-hover:text-[#94A3B8] transition-colors flex-shrink-0" />
            </div>
          </button>
        ))}
      </div>

      <div className="mt-4 mb-2 bg-[#0F1625] border border-[#1A2238] rounded-2xl p-4 flex items-center gap-4">
        <div className="w-10 h-10 bg-[#131E35] border border-[#1A2238] rounded-full flex items-center justify-center flex-shrink-0">
          <Bell size={18} className="text-[#2563EB]" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-white text-[15px] font-bold truncate">Reminders enabled</div>
          <div className="text-[#94A3B8] text-[13px] mt-0.5 truncate">3 days before each due date</div>
        </div>
        <button
          onClick={() => toast({ title: 'New Event', description: 'Event creation form coming soon.' })}
          className="w-10 h-10 bg-[#2563EB] hover:bg-[#1D4ED8] text-white rounded-full flex items-center justify-center flex-shrink-0 transition-colors shadow-[0_0_12px_rgba(37,99,235,0.4)]"
          aria-label="Add new event"
        >
          <Plus size={20} />
        </button>
      </div>
    </AppShell>
  );
}
