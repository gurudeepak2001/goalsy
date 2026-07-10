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
  return (
    <div className={`bg-[#0F1625] border border-[#1A2238] rounded-xl p-4 ${className}`}>
      <div className="flex items-center gap-3 mb-3">
        <div className="bg-[#131E35] rounded-xl p-2.5 text-white flex-shrink-0">{icon}</div>
        <div className="flex-1 min-w-0">
          <div className="text-white font-semibold text-sm truncate">{title}</div>
          <div className="text-[#64748B] text-xs truncate">{subtitle}</div>
        </div>
        <div className="text-[#22C55E] text-xs font-semibold bg-[#0F2A1A] px-2 py-1 rounded-full border border-[#16A34A]/30 flex-shrink-0">
          {status}
        </div>
      </div>
      <ProgressBar value={progress} color={color} className="mb-3" />
      <div className="flex items-center justify-between">
        <div className="text-[#94A3B8] text-xs">
          <span className="text-white font-semibold">{current}</span> / {target}
        </div>
        <div className="text-white text-sm font-bold">{progress}%</div>
      </div>
    </div>
  );
}
