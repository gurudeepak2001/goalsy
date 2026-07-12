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
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-[#05070A]/95 backdrop-blur-xl border-t border-white/5">
      <div className="max-w-[390px] mx-auto px-2 py-2 flex items-center justify-between">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          const Icon = tab.icon;
          return (
            <Link
              key={tab.id}
              href={tab.path}
              className={`flex flex-col items-center justify-center gap-1 py-2 px-3 rounded-xl transition-all min-w-[56px] ${
                isActive
                  ? 'bg-[#2563EB]/15 text-[#2563EB] shadow-[0_0_12px_rgba(37,99,235,0.25)]'
                  : 'text-[#64748B]'
              }`}
              aria-label={tab.label}
              aria-current={isActive ? 'page' : undefined}
              data-testid={`nav-${tab.id}`}
            >
              <Icon size={20} strokeWidth={isActive ? 2.5 : 2} />
              <span className={`text-[10px] font-bold tracking-wider ${isActive ? 'text-[#2563EB]' : 'text-[#64748B]'}`}>
                {tab.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
