import { useState, useId } from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  ResponsiveContainer,
  Tooltip,
} from 'recharts';
import { toast } from '@/hooks/use-toast';
import AppHeader from '@/components/AppHeader';
import AppShell from '@/components/AppShell';

const scoreData = [
  { month: 'Jan', score: 812 },
  { month: 'Feb', score: 818 },
  { month: 'Mar', score: 815 },
  { month: 'Apr', score: 824 },
  { month: 'May', score: 828 },
  { month: 'Jun', score: 836 },
  { month: 'Jul', score: 842 },
];

const drivers = [
  { label: 'Savings', value: '$12.4k', change: '+1.2%', color: '#2563EB', progress: 75 },
  { label: 'Debt Ratio', value: '14%', change: '-2.1%', color: '#3B82F6', progress: 25 },
  { label: 'Cash Flow', value: 'Strong', change: '0%', color: '#F59E0B', progress: 83.33 },
  { label: 'Discipline', value: '98/100', change: 'Peak', color: '#22C55E', progress: 98 },
];

const changes = [
  { text: 'Paid Capital One before statement date', value: '+2' },
  { text: 'Stayed under today\'s spending target', value: '+1' },
];

function ScoreGauge({ value }: { value: number }) {
  const gradientId = useId().replace(/:/g, '');
  const size = 288;
  const strokeWidth = 16;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (value / 1000) * circumference;

  return (
    <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <defs>
          <linearGradient id={`${gradientId}-arc`} x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#2563EB" />
            <stop offset="100%" stopColor="#3B82F6" />
          </linearGradient>
        </defs>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="#1F2937"
          strokeWidth={strokeWidth}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={`url(#${gradientId}-arc)`}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className="transition-all duration-1000 ease-out"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center z-10">
        <span className="text-white font-extrabold text-[96px] leading-[96px]" style={{ letterSpacing: '-4.8px' }}>
          842
        </span>
        <div className="mt-2 bg-[rgba(34,197,94,0.2)] border border-[rgba(34,197,94,0.3)] rounded-full px-3 py-1.5">
          <span className="text-[#22C55E] font-bold text-xs uppercase tracking-[1px]">Optimal</span>
        </div>
      </div>
      <div className="absolute bottom-2 left-1/2 -translate-x-1/2 bg-[#05070A] px-4 z-10">
        <span className="text-[#808BA4] font-bold text-xs uppercase tracking-[2px]">Goalsy Score</span>
      </div>
    </div>
  );
}

export default function ScoreScreen() {
  const [filter, setFilter] = useState<'90D' | '1Y' | 'ALL'>('90D');

  return (
    <AppShell showBottomNav={false} header={<AppHeader dashboard />}>
      <div className="pt-4 flex flex-col gap-12">
        {/* Score Gauge */}
        <div className="flex flex-col items-center gap-4">
          <ScoreGauge value={842} />
        </div>

        {/* Why Your Score Changed */}
        <div className="bg-[#111827] border border-white/5 rounded-3xl p-6 flex flex-col gap-6 relative overflow-hidden">
          <div className="absolute right-1 top-1 opacity-5 p-4">
            <div className="w-24 h-24 bg-[#3B82F6] rounded-full" />
          </div>
          <h2 className="text-white font-bold text-2xl leading-[30px]">Why Your Score Changed</h2>
          <p className="text-[#E5E7EB] font-semibold text-base leading-[26px]">
            Executive Summary: High capital discipline and reduced interest drag.
          </p>
          <div className="flex flex-col gap-3">
            {changes.map((change, index) => (
              <div key={index} className="flex items-center justify-between">
                <span className="text-[#CBD5E1] text-sm leading-5">{change.text}</span>
                <span className="text-[#22C55E] font-bold text-sm">{change.value}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Score History */}
        <div className="flex flex-col gap-6">
          <div className="flex items-center justify-between">
            <h2 className="text-white font-bold text-2xl leading-9">Score History</h2>
            <div className="bg-[#111827] rounded-lg p-1 flex gap-1">
              {(['90D', '1Y', 'ALL'] as const).map((f) => (
                <button
                  key={f}
                  type="button"
                  onClick={() => setFilter(f)}
                  className={`px-3 py-1 rounded-md text-[11px] font-bold leading-4 transition-colors ${
                    filter === f
                      ? 'bg-[#2563EB] text-white'
                      : 'text-[#808BA4]'
                  }`}
                >
                  {f}
                </button>
              ))}
            </div>
          </div>
          <div className="bg-[#111827] border border-white/5 rounded-3xl p-4 h-[295px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={scoreData} margin={{ top: 10, right: 0, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="scoreGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#2563EB" stopOpacity={0.3} />
                    <stop offset="100%" stopColor="#2563EB" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis
                  dataKey="month"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: '#64748B', fontSize: 10, fontWeight: 600 }}
                  dy={10}
                />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: '#64748B', fontSize: 10, fontWeight: 600 }}
                  domain={['dataMin - 10', 'dataMax + 10']}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#1F2937',
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: '8px',
                    color: '#fff',
                  }}
                  itemStyle={{ color: '#fff', fontWeight: 700 }}
                  labelStyle={{ color: '#94A3B8' }}
                />
                <Area
                  type="monotone"
                  dataKey="score"
                  stroke="#2563EB"
                  strokeWidth={3}
                  fill="url(#scoreGradient)"
                  dot={{ fill: '#2563EB', strokeWidth: 0, r: 4 }}
                  activeDot={{ r: 6, fill: '#3B82F6' }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Goalsy Drivers */}
        <div className="flex flex-col gap-4">
          <h2 className="text-[#CBD5E1] font-bold text-sm uppercase tracking-[1.5px]">Goalsy Drivers</h2>
          <div className="grid grid-cols-2 gap-4">
            {drivers.map((driver) => (
              <div
                key={driver.label}
                className="bg-[#111827] border border-white/5 rounded-3xl p-5 flex flex-col gap-3"
              >
                <span className="text-[#808BA4] font-bold text-[11px] uppercase tracking-[0.55px]">
                  {driver.label}
                </span>
                <div className="flex items-end justify-between">
                  <span className="text-white font-bold text-xl leading-7">{driver.value}</span>
                  <span className="text-[#22C55E] font-bold text-xs leading-4">{driver.change}</span>
                </div>
                <div className="h-1 w-full bg-white/5 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full"
                    style={{ width: `${driver.progress}%`, backgroundColor: driver.color }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="h-8" />
      </div>
    </AppShell>
  );
}
