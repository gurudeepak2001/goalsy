import { ReactNode } from 'react';
import ProgressBar from './ProgressBar';

interface GoalCardProps {
  icon: ReactNode;
  title: string;
  subtitle: string;
  progress: number;
  current: string;
  target: string;
  color?: string;
  status?: string;
  className?: string;
}

export default function GoalCard({
  icon,
  title,
  subtitle,
  progress,
  current,
  target,
  color = '#22C55E',
  status = 'On Track',
  className = '',
}: GoalCardProps) {
  const statusColor = status === 'Needs Attention' ? 'text-[#F59E0B] bg-[#F59E0B]/10 border-[#F59E0B]/20' : 'text-[#22C55E] bg-[#22C55E]/10 border-[#22C55E]/20';

  return (
    <div className={`bg-[#0F1625] border border-[#1A2238] rounded-2xl p-4 ${className}`}>
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="bg-[#131E35] rounded-xl p-2.5 text-white flex-shrink-0">{icon}</div>
          <div className="min-w-0">
            <div className="text-white font-bold text-sm truncate">{title}</div>
            <div className="text-[#64748B] text-xs truncate mt-0.5">{subtitle}</div>
          </div>
        </div>
        <div className={`text-[9px] font-bold tracking-[0.15em] uppercase px-2 py-1 rounded-full border flex-shrink-0 mt-0.5 ${statusColor}`}>
          {status}
        </div>
      </div>
      <ProgressBar value={progress} color={color} className="mb-3" />
      <div className="flex items-center justify-between">
        <div className="text-[#94A3B8] text-xs">
          <span className="text-white font-bold">{current}</span> / {target}
        </div>
        <div className="text-white text-sm font-bold">{progress}%</div>
      </div>
    </div>
  );
}
