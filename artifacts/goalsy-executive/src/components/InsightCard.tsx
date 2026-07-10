import { ReactNode } from 'react';

interface InsightCardProps {
  title: string;
  subtitle?: string;
  icon: ReactNode;
  stat?: string;
  statLabel?: string;
  meta?: string;
  accent?: string;
  variant?: 'grid' | 'row';
  className?: string;
}

export default function InsightCard({
  title,
  subtitle,
  icon,
  stat,
  statLabel,
  meta,
  accent,
  variant = 'grid',
  className = '',
}: InsightCardProps) {
  if (variant === 'row') {
    return (
      <div className={`bg-[#0F1625] border border-[#1A2238] rounded-xl p-4 flex items-center gap-4 ${className}`}>
        <div className="bg-[#131E35] rounded-xl p-3 flex-shrink-0 text-white">{icon}</div>
        <div className="flex-1 min-w-0">
          <div className="text-white font-semibold text-sm truncate">{title}</div>
          {subtitle && <div className="text-[#64748B] text-xs mt-0.5 truncate">{subtitle}</div>}
        </div>
        {stat && (
          <div className="text-right flex-shrink-0">
            <div className={`text-lg font-bold ${accent || 'text-white'}`}>{stat}</div>
            {statLabel && <div className="text-[#64748B] text-[10px] uppercase tracking-wider">{statLabel}</div>}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className={`bg-[#0F1625] border border-[#1A2238] rounded-xl p-4 flex flex-col ${className}`}>
      <div className="flex items-start justify-between mb-3">
        <div className="bg-[#131E35] rounded-xl p-2.5 text-white flex-shrink-0">{icon}</div>
        {meta && <div className="text-[#64748B] text-[10px] uppercase tracking-wider font-medium">{meta}</div>}
      </div>
      <div className="mt-auto">
        <div className="text-white font-semibold text-sm leading-tight">{title}</div>
        {subtitle && <div className="text-[#64748B] text-xs mt-0.5">{subtitle}</div>}
        {stat && (
          <div className="mt-3">
            <div className={`text-2xl font-black ${accent || 'text-white'}`}>{stat}</div>
            {statLabel && <div className="text-[#64748B] text-[10px] uppercase tracking-wider mt-0.5">{statLabel}</div>}
          </div>
        )}
      </div>
    </div>
  );
}
