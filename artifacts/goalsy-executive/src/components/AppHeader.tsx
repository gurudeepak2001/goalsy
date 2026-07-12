import { ReactNode } from 'react';
import { Bell, Layers } from 'lucide-react';
import GoalsyLogo from './GoalsyLogo';
import Avatar from './Avatar';

interface AppHeaderProps {
  showSecureMode?: boolean;
  rightElement?: ReactNode;
  showLogo?: boolean;
  title?: string;
  className?: string;
  dashboard?: boolean;
}

export default function AppHeader({
  showSecureMode = false,
  rightElement,
  showLogo = true,
  title,
  className = '',
  dashboard = false,
}: AppHeaderProps) {
  if (dashboard) {
    return (
      <header className={`flex items-center justify-between h-full ${className}`}>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-[#2563EB] rounded-xl flex items-center justify-center shadow-[0_0_30px_rgba(37,99,235,0.1)]">
            <Layers color="white" size={20} strokeWidth={2} />
          </div>
          <span className="text-white font-bold text-lg leading-[27px]" style={{ letterSpacing: '-0.45px' }}>
            Goalsy
          </span>
        </div>
        <div className="flex items-center gap-3">
          <button className="w-10 h-10 bg-[#1F2937] border border-white/10 rounded-full flex items-center justify-center text-white">
            <Bell size={16} strokeWidth={2} />
          </button>
          <Avatar fallback="AL" size="nav" className="border-2 border-[#2563EB]" />
        </div>
      </header>
    );
  }

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
