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
        {showLogo && <GoalsyLogo size="md" />}
        {title ? (
          <span className="text-white font-bold text-xl tracking-[-0.5px]">{title}</span>
        ) : showLogo ? (
          <span className={`text-white font-bold ${showSecureMode ? 'text-lg tracking-[-0.45px]' : 'text-xl tracking-[-0.5px]'}`}>
            GoalsyExecutive
          </span>
        ) : null}
      </div>
      {showSecureMode && (
        <div className="bg-[#111827] border border-white/10 rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-[1px] text-[#CBD5E1] flex items-center gap-2">
          <div className="w-2 h-2 bg-[#22C55E] rounded-full"></div>
          Secure Mode
        </div>
      )}
      {rightElement}
    </header>
  );
}
