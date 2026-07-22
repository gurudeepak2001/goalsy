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
import { Flame, CheckCircle, Trophy, Target, TrendingUp, ShieldCheck, Database, Zap, Clock, ArrowUpRight, Loader2 } from 'lucide-react';
import { getScoreTier } from '@/lib/scoreUtils';
import AppHeader from '@/components/AppHeader';
import AppShell from '@/components/AppShell';
import { useGetScore, useGetScoreHistory } from '@workspace/api-client-react';

// ── Score Gauge ──────────────────────────────────────────────────────────────
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
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="#1F2937" strokeWidth={strokeWidth} />
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
          {value}
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

// ── Driver color helper ──────────────────────────────────────────────────────
function driverColor(trend: string): string {
  if (trend === 'up') return '#22C55E';
  if (trend === 'neutral') return '#3B82F6';
  return '#EF4444';
}

// ── Chart data helpers ───────────────────────────────────────────────────────
function formatMonth(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short' });
}

function buildChartData(snapshots: { score: number; computedAt: string }[]) {
  // snapshots come newest-first from API; reverse for chart (oldest → newest)
  return [...snapshots].reverse().map((s) => ({
    month: formatMonth(s.computedAt),
    score: s.score,
  }));
}

export default function ScoreScreen() {
  const [filter, setFilter] = useState<'90D' | '1Y' | 'ALL'>('90D');

  const { data: scoreResult, isLoading: scoreLoading } = useGetScore();
  const { data: historyRaw } = useGetScoreHistory();

  const score = scoreResult?.score ?? 0;
  const drivers = scoreResult?.drivers ?? [];

  // Build chart data from real history
  const allHistory = historyRaw ?? [];
  const chartData = filter === '90D'
    ? buildChartData(allHistory.slice(0, 90))
    : filter === '1Y'
    ? buildChartData(allHistory.slice(0, 365))
    : buildChartData(allHistory);

  // Fall back to a single point when history is empty
  const displayData = chartData.length > 0
    ? chartData
    : [{ month: 'Now', score }];

  const milestonePoint = displayData.length > 0 ? displayData[displayData.length - 1] : null;

  if (scoreLoading) {
    return (
      <AppShell activeTab="profile" header={<AppHeader dashboard dashboardTitle="Goalsy Score" />}>
        <div className="flex items-center justify-center py-32">
          <Loader2 size={32} className="animate-spin text-[#2563EB]" />
        </div>
      </AppShell>
    );
  }

  const changes = [
    { text: 'Maintained goal contributions this week', value: '+2' },
    { text: 'No missed bill payments', value: '+1' },
    { text: 'Completed daily mission', value: '+1' },
  ];

  return (
    <AppShell activeTab="profile" header={<AppHeader dashboard dashboardTitle="Goalsy Score" />}>
      <div className="pt-4 flex flex-col gap-12">
        {/* Score Gauge */}
        <div className="flex flex-col items-center gap-4">
          <ScoreGauge value={score} />
          <div className="flex items-center gap-1.5 bg-[rgba(34,197,94,0.1)] border border-[rgba(34,197,94,0.2)] rounded-full px-3 py-1.5">
            <TrendingUp size={12} className="text-[#22C55E]" />
            <span className="text-[#22C55E] font-bold text-xs leading-4">Live Score</span>
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
            Score computed from your goals, savings rate, expense ratio, net worth, and mission completion.
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
        {drivers.length > 0 && (
          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-2">
              <Zap size={20} className="text-[#F59E0B]" />
              <h2 className="text-white font-bold text-2xl leading-9">Score Improvement Areas</h2>
            </div>
            <div className="flex flex-col gap-3">
              {drivers
                .filter((d) => d.trend !== 'up')
                .slice(0, 3)
                .map((d) => (
                  <div key={d.label} className="bg-[#111827] border border-white/5 rounded-3xl p-5 flex flex-col gap-4">
                    <div className="flex items-start justify-between gap-3">
                      <span className="text-[10px] font-bold uppercase tracking-[0.5px] px-2 py-1 rounded-full text-[#F59E0B] bg-[#F59E0B]/10">
                        Improve
                      </span>
                      <span className="text-[#22C55E] font-bold text-sm whitespace-nowrap">
                        +{d.maxValue - d.value} pts available
                      </span>
                    </div>
                    <h3 className="text-white font-bold text-lg leading-[25px]">Improve your {d.label}</h3>
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-1.5">
                        <Clock size={13} className="text-[#808BA4]" />
                        <span className="text-[#808BA4] font-semibold text-xs leading-4">Ongoing</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <ArrowUpRight size={13} className="text-[#808BA4]" />
                        <span className="text-[#808BA4] font-semibold text-xs leading-4">
                          {d.value}/{d.maxValue} pts scored
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
            </div>
          </div>
        )}

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
                    filter === f ? 'bg-[#2563EB] text-white' : 'text-[#808BA4]'
                  }`}
                >
                  {f}
                </button>
              ))}
            </div>
          </div>
          <div className="bg-[#111827] border border-white/5 rounded-3xl p-4 h-[295px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={displayData} margin={{ top: 10, right: 0, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="scoreGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#2563EB" stopOpacity={0.3} />
                    <stop offset="100%" stopColor="#2563EB" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fill: '#64748B', fontSize: 10, fontWeight: 600 }} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748B', fontSize: 10, fontWeight: 600 }} domain={['dataMin - 10', 'dataMax + 10']} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#1F2937', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: '#fff' }}
                  itemStyle={{ color: '#fff', fontWeight: 700 }}
                  labelStyle={{ color: '#94A3B8' }}
                />
                <Area type="monotone" dataKey="score" stroke="#2563EB" strokeWidth={3} fill="url(#scoreGradient)" dot={{ fill: '#2563EB', strokeWidth: 0, r: 4 }} activeDot={{ r: 6, fill: '#3B82F6' }} />
                {milestonePoint && displayData.length > 1 && (
                  <ReferenceDot
                    x={milestonePoint.month}
                    y={milestonePoint.score}
                    r={6}
                    fill="#F59E0B"
                    stroke="#05070A"
                    strokeWidth={2}
                    isFront
                    label={{ value: 'Latest', position: 'top', fill: '#F59E0B', fontSize: 10, fontWeight: 700, dy: -4 }}
                  />
                )}
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Goalsy Drivers */}
        {drivers.length > 0 && (
          <div className="flex flex-col gap-4">
            <h2 className="text-[#CBD5E1] font-bold text-sm uppercase tracking-[1.5px]">Goalsy Drivers</h2>
            <div className="grid grid-cols-2 gap-4">
              {drivers.map((driver) => {
                const color = driverColor(driver.trend);
                const progress = Math.round((driver.value / driver.maxValue) * 100);
                const trendLabel = driver.trend === 'up' ? '↑ Strong' : driver.trend === 'neutral' ? '→ Steady' : '↓ Needs work';
                return (
                  <div key={driver.label} className="bg-[#111827] border border-white/5 rounded-3xl p-5 flex flex-col gap-3">
                    <span className="text-[#808BA4] font-bold text-[11px] uppercase tracking-[0.55px]">{driver.label}</span>
                    <div className="flex items-end justify-between">
                      <span className="text-white font-bold text-xl leading-7">{driver.value} pts</span>
                      <span className="font-bold text-xs leading-4" style={{ color }}>{trendLabel}</span>
                    </div>
                    <div className="h-1 w-full bg-white/5 rounded-full overflow-hidden">
                      <div className="h-full rounded-full" style={{ width: `${progress}%`, backgroundColor: color }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

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
              { label: '30 Days', value: Math.min(1000, score + 13), change: '+13 pts', confidence: '95% Conf.' },
              { label: '90 Days', value: Math.min(1000, score + 30), change: '+30 pts', confidence: '82% Conf.' },
              { label: '180 Days', value: Math.min(1000, score + 68), change: '+68 pts', confidence: '65% Conf.' },
            ].map((row, index, arr) => (
              <div
                key={row.label}
                className={`flex items-center justify-between py-4 ${index !== arr.length - 1 ? 'border-b border-white/5' : ''} ${index === 0 ? 'pt-0' : ''} ${index === arr.length - 1 ? 'pb-0' : ''}`}
              >
                <div className="flex flex-col gap-1">
                  <span className="text-[#808BA4] font-bold text-[11px] uppercase tracking-[1.1px]">{row.label}</span>
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
