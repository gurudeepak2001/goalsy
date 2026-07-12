import { useState } from 'react';
import { ChevronLeft, ChevronRight, Plus, Bell, Wallet, ArrowUpRight, ArrowDownRight, AlertCircle } from 'lucide-react';
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
    <AppShell activeTab="calendar" header={<AppHeader rightElement={<Avatar fallback="AL" />} />}>
      <div className="pt-2">
        <p className="text-[#94A3B8] text-sm">Planning</p>
        <h1 className="text-white font-black text-3xl leading-tight tracking-tight mt-1">Financial Calendar</h1>
        <p className="text-[#94A3B8] text-sm mt-2">Upcoming obligations and opportunities.</p>
      </div>

      <div className="mt-6 bg-[#0F1625] border border-[#1A2238] rounded-xl p-4">
        <div className="flex items-center justify-between mb-4">
          <button onClick={prevMonth} className="text-[#94A3B8] hover:text-white transition-colors p-1">
            <ChevronLeft size={20} />
          </button>
          <span className="text-white font-bold text-base">{months[monthIndex]} {year}</span>
          <button onClick={nextMonth} className="text-[#94A3B8] hover:text-white transition-colors p-1">
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
          {calendarDays.map((d, i) => {
            const isSelected = d.day === selectedDay && !d.prev && !d.next;
            return (
              <button
                key={i}
                onClick={() => !d.prev && !d.next && setSelectedDay(d.day)}
                className={`aspect-square flex flex-col items-center justify-center rounded-xl text-sm font-semibold relative ${
                  d.prev || d.next
                    ? 'text-[#475569]'
                    : isSelected
                    ? 'bg-[#2563EB] text-white'
                    : 'text-white bg-[#131E35]/50 hover:bg-[#1A2238]'
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
              </button>
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
        <button
          onClick={() => toast({ title: 'New Event', description: 'Event creation form coming soon.' })}
          className="bg-[#2563EB] hover:bg-[#1D4ED8] text-white rounded-full p-2 transition-colors"
        >
          <Plus size={16} />
        </button>
      </div>
    </AppShell>
  );
}
