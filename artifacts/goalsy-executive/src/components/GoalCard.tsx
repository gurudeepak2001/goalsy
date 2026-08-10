import { AlertTriangle, Clock, Star } from 'lucide-react';

interface MilestoneMark {
  pct: number;    // 25 | 50 | 75
  reached: boolean;
}

interface GoalCardProps {
  title: string;
  subtitle: string;
  progress: number;
  current: string;
  target: string;
  projectedDate: string;
  color?: string;
  className?: string;
  onClick?: () => void;
  /** When provided, renders milestone tick marks at each percentage position. */
  milestones?: MilestoneMark[];
  /** When true, shows the Top Priority badge. */
  isPinned?: boolean;
  /** When true, shows the "behind — update plan" badge. */
  isBehind?: boolean;
  /** Required monthly contribution (shown in badge). */
  requiredMonthly?: number;
  /** Planned monthly contribution (shown in badge for comparison). */
  plannedMonthly?: number;
}

function formatDollarsShort(n: number): string {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `$${Math.round(n / 1_000)}K`;
  return `$${n.toLocaleString()}`;
}

export default function GoalCard({
  title,
  subtitle,
  progress,
  current,
  target,
  projectedDate,
  color = '#22C55E',
  className = '',
  onClick,
  milestones,
  isPinned,
  isBehind,
  requiredMonthly,
  plannedMonthly,
}: GoalCardProps) {
  return (
    <div
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      className={`bg-[#111827] border border-white/5 rounded-3xl p-6 flex flex-col gap-6 ${
        onClick ? 'cursor-pointer hover:bg-[#161F2E] transition-colors active:scale-[0.98]' : ''
      } ${className}`}
    >
      <div className="flex items-start justify-between">
        <div className="flex flex-col gap-1">
          {isPinned && (
            <div className="flex items-center gap-1 mb-0.5">
              <Star size={10} className="fill-[#F59E0B] text-[#F59E0B]" />
              <span className="text-[#F59E0B] text-[10px] font-bold uppercase tracking-[1.5px]">Top Priority</span>
            </div>
          )}
          <div className="text-white font-bold text-[22px] leading-[33px]" style={{ letterSpacing: '-0.00585938em' }}>
            {title}
          </div>
          <div className="text-[#808BA4] font-semibold text-sm leading-[21px]">{subtitle}</div>
        </div>
        <div className="bg-[#1F2937] border border-white/5 rounded-lg px-3 py-2 text-white font-bold text-sm leading-[21px]">
          {progress}%
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <div className="flex items-end justify-between">
          <div className="text-white font-bold text-[28px] leading-7" style={{ letterSpacing: current.length > 8 ? '-0.00878906em' : '-0.00488281em' }}>
            {current}
          </div>
          <div className="text-[#808BA4] font-semibold text-sm leading-[21px]">of {target}</div>
        </div>

        {/* Progress bar with optional milestone ticks */}
        <div className="relative h-3 bg-[#1F2937] rounded-full overflow-visible">
          {/* Fill */}
          <div
            className="h-full rounded-full"
            style={{ width: `${Math.min(100, progress)}%`, backgroundColor: color, boxShadow: '0px 0px 10px rgba(34, 197, 94, 0.3)' }}
          />
          {/* Milestone tick marks */}
          {milestones?.map((m) => (
            <div
              key={m.pct}
              title={`${m.pct}% milestone${m.reached ? ' — reached' : ''}`}
              className="absolute top-0 bottom-0 flex flex-col items-center pointer-events-none"
              style={{ left: `${m.pct}%`, transform: 'translateX(-50%)' }}
            >
              {/* Vertical tick line */}
              <div
                className="w-[2px] h-full rounded-full"
                style={{ backgroundColor: m.reached ? color : 'rgba(255,255,255,0.15)' }}
              />
              {/* Diamond dot above the bar */}
              <div
                className="absolute"
                style={{ top: '-6px', width: '6px', height: '6px', backgroundColor: m.reached ? color : '#374151', border: `1.5px solid ${m.reached ? color : 'rgba(255,255,255,0.15)'}`, borderRadius: '2px', transform: 'rotate(45deg)' }}
              />
            </div>
          ))}
        </div>

        {/* Milestone label row */}
        {milestones && milestones.length > 0 && (
          <div className="relative h-4">
            {milestones.map((m) => (
              <span
                key={m.pct}
                className="absolute text-[9px] font-bold uppercase"
                style={{
                  left: `${m.pct}%`,
                  transform: 'translateX(-50%)',
                  color: m.reached ? color : 'rgba(255,255,255,0.2)',
                  letterSpacing: '0.5px',
                }}
              >
                {m.pct}%
              </span>
            ))}
          </div>
        )}
      </div>

      {isBehind && (
        <div className="flex items-center gap-2 bg-[#EF4444]/10 border border-[#EF4444]/25 rounded-xl px-3 py-2">
          <AlertTriangle size={13} className="text-[#EF4444] flex-shrink-0" />
          <div className="flex flex-col gap-0.5 min-w-0">
            <span className="text-[#EF4444] text-[10px] font-bold uppercase tracking-[1.2px] leading-tight">
              Behind — Update Plan
            </span>
            {requiredMonthly !== undefined && plannedMonthly !== undefined && (
              <span className="text-[#808BA4] text-[11px] font-semibold leading-tight">
                needs {formatDollarsShort(requiredMonthly)}/mo · planned {formatDollarsShort(plannedMonthly)}/mo
              </span>
            )}
          </div>
        </div>
      )}

      <div className="border-t border-white/5 pt-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Clock size={16} className="text-[#808BA4]" strokeWidth={2} />
          <span className="text-[#808BA4] font-bold text-xs uppercase leading-[18px]" style={{ letterSpacing: '0.6px' }}>
            Estimated Completion
          </span>
        </div>
        <div className="text-white font-bold text-sm leading-[21px]">{projectedDate}</div>
      </div>
    </div>
  );
}
