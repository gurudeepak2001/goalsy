import { useState, useId } from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  ResponsiveContainer,
  Tooltip,
  ReferenceDot,
} from 'recharts';
import { Flame, CheckCircle, Trophy, Target, TrendingUp, ShieldCheck, Database, Zap, Clock, ArrowUpRight, Loader2, CheckCircle2 } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { simulateAsync } from '@/lib/mockData';
import { getScoreTier } from '@/lib/scoreUtils';
import AppHeader from '@/components/AppHeader';
import AppShell from '@/components/AppShell';

const scoreData90D = [
  { month: 'May', score: 828 },
  { month: 'Jun', score: 836 },
  { month: 'Jul', score: 842, milestoneLabel: 'Major Milestone: Jul 24' },
];

const scoreData1Y = [
  { month: 'Jan', score: 812 },
  { month: 'Feb', score: 818 },
  { month: 'Mar', score: 815 },
  { month: 'Apr', score: 824 },
  { month: 'May', score: 828 },
  { month: 'Jun', score: 836 },
  { month: 'Jul', score: 842, milestoneLabel: 'Major Milestone: Jul 24' },
];

const scoreDataAll = [
  { month: 'Q1', score: 780 },
  { month: 'Q2', score: 798 },
  { month: 'Q3', score: 815 },
  { month: 'Q4', score: 824 },
  { month: 'Q5', score: 836 },
  { month: 'Q6', score: 842, milestoneLabel: 'Major Milestone: Jul 24' },
];

const drivers = [
  { label: 'Savings', value: '$12.4k', change: '+1.2%', color: '#2563EB', progress: 75 },
  { label: 'Debt Ratio', value: '14%', change: '-2.1%', color: '#3B82F6', progress: 25 },
  { label: 'Cash Flow', value: 'Strong', change: '0%', color: '#F59E0B', progress: 83.33 },
  { label: 'Discipline', value: '98/100', change: 'Peak', color: '#22C55E', progress: 98 },
];

const recommendations = [
  {
    id: 'pay-discover',
    title: 'Pay Discover before Friday',
    points: '+2',
    tag: 'Priority',
    tagColor: '#EF4444',
    time: '5 mins',
    impact: 'High Impact',
    actionLabel: 'Pay Now',
    doneLabel: 'Payment Sent',
    successTitle: 'Payment Scheduled',
    successDescription: 'Discover payment queued before Friday\'s due date.',
  },
  {
    id: 'cancel-apple-one',
    title: 'Cancel Apple One Subscription',
    points: '+1',
    tag: 'Med',
    tagColor: '#F59E0B',
    time: '2 mins',
    impact: 'Mid Impact',
    actionLabel: 'Cancel Subscription',
    doneLabel: 'Cancelled',
    successTitle: 'Subscription Cancelled',
    successDescription: 'Apple One will no longer renew.',
  },
];

const changes = [
  { text: 'Paid Capital One before statement date', value: '+2' },
  { text: 'Stayed under today\'s spending target', value: '+1' },
  { text: 'Added $100 to emergency savings', value: '+1' },
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
          <span className="text-[#22C55E] font-bold text-xs uppercase tracking-[1px]">{getScoreTier(value)}</span>
        </div>
      </div>
      <div className="absolute bottom-2 left-1/2 -translate-x-1/2 bg-[#05070A] px-4 z-10">
        <span className="text-[#808BA4] font-bold text-xs uppercase tracking-[2px]">Goalsy Score</span>
      </div>
    </div>
  );
}

type ActionStatus = 'idle' | 'processing' | 'done';

export default function ScoreScreen() {
  const [filter, setFilter] = useState<'90D' | '1Y' | 'ALL'>('90D');
  const [actionStatus, setActionStatus] = useState<Record<string, ActionStatus>>({});

  const chartData =
    filter === '90D' ? scoreData90D : filter === '1Y' ? scoreData1Y : scoreDataAll;

  const milestonePoint = chartData.find((point) => 'milestoneLabel' in point);

  const handleRecommendationAction = async (rec: (typeof recommendations)[number]) => {
    if ((actionStatus[rec.id] ?? 'idle') !== 'idle') return;
    setActionStatus((prev) => ({ ...prev, [rec.id]: 'processing' }));
    // MOCK DATA - replace with a real payment/subscription-management API call
    await simulateAsync(true, 1500);
    setActionStatus((prev) => ({ ...prev, [rec.id]: 'done' }));
    toast({ title: rec.successTitle, description: rec.successDescription });
  };

  return (
    <AppShell activeTab="profile" header={<AppHeader dashboard dashboardTitle="Goalsy Score" />}>
      <div className="pt-4 flex flex-col gap-12">
        {/* Score Gauge */}
        <div className="flex flex-col items-center gap-4">
          <ScoreGauge value={842} />
          <div className="flex items-center gap-1.5 bg-[rgba(34,197,94,0.1)] border border-[rgba(34,197,94,0.2)] rounded-full px-3 py-1.5">
            <TrendingUp size={12} className="text-[#22C55E]" />
            <span className="text-[#22C55E] font-bold text-xs leading-4">+4 This Week</span>
          </div>
          <p className="text-[#444444] font-semibold text-[11px] text-center leading-4 max-w-[260px]">
            Goalsy Score is a proprietary financial readiness measure, not a credit score.
          </p>
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
          <div className="flex items-center gap-4 pt-4 border-t border-white/5">
            <div className="flex items-center gap-1.5">
              <ShieldCheck size={14} className="text-[#808BA4]" />
              <span className="text-[#808BA4] font-semibold text-xs leading-4">High Confidence</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Database size={14} className="text-[#808BA4]" />
              <span className="text-[#808BA4] font-semibold text-xs leading-4">Data Backed</span>
            </div>
          </div>
        </div>

        {/* Fastest Ways to Increase Your Score */}
        <div className="flex flex-col gap-4">
          <div className="flex items-center gap-2">
            <Zap size={20} className="text-[#F59E0B]" />
            <h2 className="text-white font-bold text-2xl leading-9">Fastest Ways to Increase Your Score</h2>
          </div>
          <div className="flex flex-col gap-3">
            {recommendations.map((rec) => {
              const status = actionStatus[rec.id] ?? 'idle';
              return (
                <div
                  key={rec.id}
                  className="bg-[#111827] border border-white/5 rounded-3xl p-5 flex flex-col gap-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <span
                        className="text-[10px] font-bold uppercase tracking-[0.5px] px-2 py-1 rounded-full"
                        style={{ color: rec.tagColor, backgroundColor: `${rec.tagColor}1A` }}
                      >
                        {rec.tag}
                      </span>
                    </div>
                    <span className="text-[#22C55E] font-bold text-sm whitespace-nowrap">
                      {rec.points} Goalsy Score
                    </span>
                  </div>
                  <h3 className="text-white font-bold text-lg leading-[25px]">{rec.title}</h3>
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-1.5">
                      <Clock size={13} className="text-[#808BA4]" />
                      <span className="text-[#808BA4] font-semibold text-xs leading-4">{rec.time}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <ArrowUpRight size={13} className="text-[#808BA4]" />
                      <span className="text-[#808BA4] font-semibold text-xs leading-4">{rec.impact}</span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleRecommendationAction(rec)}
                    disabled={status !== 'idle'}
                    className={`h-11 rounded-xl font-bold text-sm active:scale-95 transition-transform disabled:opacity-70 flex items-center justify-center gap-2 ${
                      status === 'done' ? 'bg-[rgba(34,197,94,0.15)] text-[#22C55E]' : 'bg-white text-[#05070A]'
                    }`}
                  >
                    {status === 'processing' ? (
                      <>
                        <Loader2 size={16} className="animate-spin" /> Processing
                      </>
                    ) : status === 'done' ? (
                      <>
                        <CheckCircle2 size={16} /> {rec.doneLabel}
                      </>
                    ) : (
                      rec.actionLabel
                    )}
                  </button>
                </div>
              );
            })}
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
                  className={`px-3 py-2 rounded-md text-[11px] font-bold leading-4 transition-colors ${
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
              <AreaChart data={chartData} margin={{ top: 10, right: 0, left: -20, bottom: 0 }}>
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
                {milestonePoint && (
                  <ReferenceDot
                    x={milestonePoint.month}
                    y={milestonePoint.score}
                    r={6}
                    fill="#F59E0B"
                    stroke="#05070A"
                    strokeWidth={2}
                    isFront
                    label={{
                      value: milestonePoint.milestoneLabel,
                      position: 'top',
                      fill: '#F59E0B',
                      fontSize: 10,
                      fontWeight: 700,
                      dy: -4,
                    }}
                  />
                )}
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

        {/* Achievements */}
        <div className="flex flex-col gap-6">
          <h2 className="text-white font-bold text-2xl leading-9">Achievements</h2>
          <div className="flex gap-4 overflow-x-auto pb-2 -mx-6 px-6">
            {[
              { icon: Flame, label: '7-Day Streak', color: '#F59E0B' },
              { icon: CheckCircle, label: 'Funded', color: '#22C55E' },
              { icon: Trophy, label: 'Top 1%', color: '#3B82F6' },
            ].map((achievement) => (
              <div
                key={achievement.label}
                className="bg-[#111827] border border-white/5 rounded-3xl p-5 flex flex-col items-center gap-3 min-w-[140px]"
              >
                <div className="w-12 h-12 bg-white/5 rounded-2xl flex items-center justify-center">
                  <achievement.icon size={24} style={{ color: achievement.color }} />
                </div>
                <span className="text-white font-bold text-xs leading-4 text-center">{achievement.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Projected Future */}
        <div className="flex flex-col gap-6">
          <div className="flex items-center gap-2">
            <Target size={16} className="text-[#3B82F6]" />
            <h2 className="text-white font-bold text-2xl leading-9">Projected Future</h2>
          </div>
          <div className="bg-[#111827] border border-white/5 rounded-3xl p-6 flex flex-col">
            {[
              { label: '30 Days', value: '855', change: '+13 pts', confidence: '95% Conf.' },
              { label: '90 Days', value: '872', change: '+30 pts', confidence: '82% Conf.' },
              { label: '180 Days', value: '910', change: '+68 pts', confidence: '65% Conf.' },
            ].map((row, index, arr) => (
              <div
                key={row.label}
                className={`flex items-center justify-between py-4 ${
                  index !== arr.length - 1 ? 'border-b border-white/5' : ''
                } ${index === 0 ? 'pt-0' : ''} ${index === arr.length - 1 ? 'pb-0' : ''}`}
              >
                <div className="flex flex-col gap-1">
                  <span className="text-[#808BA4] font-bold text-[11px] uppercase tracking-[1.1px]">
                    {row.label}
                  </span>
                  <span className="text-white font-bold text-2xl leading-8">{row.value}</span>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <span className="text-[#22C55E] font-bold text-xs leading-4">{row.change}</span>
                  <span className="text-[#444444] font-bold text-[10px] leading-[15px]">{row.confidence}</span>
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
