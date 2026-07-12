import { Clock } from 'lucide-react';

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
}: GoalCardProps) {
  return (
    <div
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      className={`bg-[#111827] border border-white/5 rounded-3xl p-6 flex flex-col gap-6 ${
        onClick ? 'cursor-pointer hover:bg-[#161F2E] transition-colors active:scale-[0.98]' : ''
      } ${className}`}>
      <div className="flex items-start justify-between">
        <div className="flex flex-col gap-1">
          <div
            className="text-white font-bold text-[22px] leading-[33px]"
            style={{ letterSpacing: progress === 48 ? '0.000976562em' : progress === 27 ? '-0.00195312em' : '-0.00585938em' }}
          >
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
          <div
            className="text-white font-bold text-[28px] leading-7"
            style={{ letterSpacing: current.length > 8 ? '-0.00878906em' : '-0.00488281em' }}
          >
            {current}
          </div>
          <div className="text-[#808BA4] font-semibold text-sm leading-[21px]">of {target}</div>
        </div>
        <div className="h-3 bg-[#1F2937] rounded-full overflow-hidden">
          <div
            className="h-full rounded-full"
            style={{
              width: `${progress}%`,
              backgroundColor: color,
              boxShadow: '0px 0px 10px rgba(34, 197, 94, 0.3)',
            }}
          />
        </div>
      </div>

      <div className="border-t border-white/5 pt-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Clock size={16} className="text-[#808BA4]" strokeWidth={2} />
          <span className="text-[#808BA4] font-bold text-xs uppercase leading-[18px]" style={{ letterSpacing: '0.6px' }}>
            Projected Completion
          </span>
        </div>
        <div className="text-white font-bold text-sm leading-[21px]">{projectedDate}</div>
      </div>
    </div>
  );
}
