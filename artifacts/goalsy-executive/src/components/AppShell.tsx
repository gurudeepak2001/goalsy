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
      <div className={`px-6 ${showBottomNav ? 'pb-28' : 'pb-10'} flex-1 flex flex-col`}>
        {header}
        {children}
      </div>
      {showBottomNav && <BottomNav activeTab={activeTab} />}
    </div>
  );
}
