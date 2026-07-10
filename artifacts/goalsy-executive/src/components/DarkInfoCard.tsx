import { ReactNode } from 'react';

interface DarkInfoCardProps {
  title: string;
  subtitle?: string;
  value?: string;
  valueLabel?: string;
  icon?: ReactNode;
  accent?: string;
  footer?: ReactNode;
  className?: string;
}

export default function DarkInfoCard({
  title,
  subtitle,
  value,
  valueLabel,
  icon,
  accent,
  footer,
  className = '',
}: DarkInfoCardProps) {
  return (
    <div className={`bg-[#0F1625] border border-[#1A2238] rounded-xl p-4 ${className}`}>
      <div className="flex items-start justify-between mb-2">
        <div className="flex-1 min-w-0">
          <div className="text-white font-semibold text-sm">{title}</div>
          {subtitle && <div className="text-[#64748B] text-xs mt-0.5">{subtitle}</div>}
        </div>
        {icon && <div className={`text-[#94A3B8] flex-shrink-0 ml-3 ${accent || ''}`}>{icon}</div>}
      </div>
      {value && (
        <div className="mt-3">
          <div className={`text-2xl font-black ${accent || 'text-white'}`}>{value}</div>
          {valueLabel && <div className="text-[#64748B] text-[10px] uppercase tracking-wider mt-0.5">{valueLabel}</div>}
        </div>
      )}
      {footer && <div className="mt-3 pt-3 border-t border-[#1A2238]">{footer}</div>}
    </div>
  );
}
