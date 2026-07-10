import { ReactNode } from 'react';
import GoalsyLogo from './GoalsyLogo';

interface AppHeaderProps {
  showSecureMode?: boolean;
  rightElement?: ReactNode;
  showLogo?: boolean;
  title?: string;
  className?: string;
}

export default function AppHeader({
  showSecureMode = false,
  rightElement,
  showLogo = true,
  title,
  className = '',
}: AppHeaderProps) {
  return (
    <header className={`flex items-center justify-between py-2 ${className}`}>
      <div className="flex items-center gap-3">
        {showLogo && <GoalsyLogo size="sm" />}
        {title ? (
          <span className="text-white font-bold text-lg tracking-tight">{title}</span>
        ) : showLogo ? (
          <span className="text-white font-semibold text-base tracking-tight">GoalsyExecutive</span>
        ) : null}
      </div>
      {showSecureMode && (
        <div className="bg-[#0F2A1A] text-[#22C55E] border border-[#16A34A]/30 rounded-full px-3 py-1 text-xs font-medium tracking-wide uppercase flex items-center gap-1.5">
          <div className="w-1.5 h-1.5 bg-[#22C55E] rounded-full"></div>
          SECURE MODE
        </div>
      )}
      {rightElement}
    </header>
  );
}
