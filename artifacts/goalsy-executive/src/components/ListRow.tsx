import { ReactNode } from 'react';
import { ChevronRight } from 'lucide-react';

interface ListRowProps {
  icon?: ReactNode;
  title: string;
  subtitle?: string;
  rightElement?: ReactNode;
  onClick?: () => void;
  variant?: 'default' | 'danger';
  className?: string;
}

export default function ListRow({
  icon,
  title,
  subtitle,
  rightElement,
  onClick,
  variant = 'default',
  className = '',
}: ListRowProps) {
  const isClickable = !!onClick;
  const titleColor = variant === 'danger' ? 'text-[#EF4444]' : 'text-white';

  return (
    <div
      onClick={onClick}
      role={isClickable ? 'button' : undefined}
      tabIndex={isClickable ? 0 : undefined}
      className={`bg-[#0F1625] border border-[#1A2238] rounded-xl px-4 py-3.5 flex items-center gap-3 ${
        isClickable ? 'hover:bg-[#131E35] cursor-pointer transition-colors' : ''
      } ${className}`}
    >
      {icon && <div className="text-[#94A3B8] flex-shrink-0">{icon}</div>}
      <div className="flex-1 min-w-0">
        <div className={`text-sm font-semibold ${titleColor}`}>{title}</div>
        {subtitle && <div className="text-[#64748B] text-xs mt-0.5 truncate">{subtitle}</div>}
      </div>
      {rightElement ? (
        <div className="flex-shrink-0">{rightElement}</div>
      ) : isClickable ? (
        <ChevronRight size={18} className="text-[#475569] flex-shrink-0" />
      ) : null}
    </div>
  );
}
