import { Home, Target, Calendar, Sparkles, User } from 'lucide-react';
import { Link } from 'wouter';

interface BottomNavProps {
  activeTab?: 'today' | 'goals' | 'calendar' | 'ai' | 'profile';
}

const tabs = [
  { id: 'today', label: 'TODAY', icon: Home, path: '/today' },
  { id: 'goals', label: 'GOALS', icon: Target, path: '/goals' },
  { id: 'calendar', label: 'CALENDAR', icon: Calendar, path: '/calendar' },
  { id: 'ai', label: 'AI', icon: Sparkles, path: '/ai-home' },
  { id: 'profile', label: 'PROFILE', icon: User, path: '/profile' },
] as const;

export default function BottomNav({ activeTab = 'today' }: BottomNavProps) {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-[#09090C]/95 backdrop-blur-md border-t border-[#1A2238]">
      <div className="max-w-md mx-auto px-2 py-2 flex items-center justify-between">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          const Icon = tab.icon;
          return (
            <Link
              key={tab.id}
              href={tab.path}
              className={`flex flex-col items-center justify-center gap-1 py-2 px-3 rounded-lg transition-colors min-w-[56px] ${
                isActive ? 'text-[#2563EB]' : 'text-[#475569]'
              }`}
              aria-label={tab.label}
              aria-current={isActive ? 'page' : undefined}
              data-testid={`nav-${tab.id}`}
            >
              <Icon size={20} strokeWidth={isActive ? 2.5 : 2} />
              <span className={`text-[10px] font-bold tracking-wider ${isActive ? 'text-[#2563EB]' : 'text-[#475569]'}`}>
                {tab.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
