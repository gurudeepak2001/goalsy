import { ReactNode } from 'react';
import BottomNav from './BottomNav';

interface AppShellProps {
  children: ReactNode;
  header?: ReactNode;
  showBottomNav?: boolean;
  activeTab?: 'today' | 'goals' | 'calendar' | 'ai' | 'profile';
  className?: string;
}

export default function AppShell({
  children,
  header,
  showBottomNav = true,
  activeTab = 'today',
  className = '',
}: AppShellProps) {
  return (
    <div className={`min-h-[100dvh] w-full bg-[#05070A] max-w-md mx-auto flex flex-col overflow-y-auto ${className}`}>
      {header && (
        <div className="sticky top-0 z-50 px-6 h-[72px] flex items-center bg-[#0B0F17]/85 backdrop-blur-md">
          {header}
        </div>
      )}
      <div className={`px-6 flex-1 flex flex-col ${showBottomNav ? 'pt-8 pb-44' : 'pb-10'}`}>
        {children}
      </div>
      {showBottomNav && <BottomNav activeTab={activeTab} />}
    </div>
  );
}
