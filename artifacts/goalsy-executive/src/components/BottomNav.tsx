import { Layers, Target, Calendar, Cog, Shield } from 'lucide-react';
import { Link } from 'wouter';

interface BottomNavProps {
  activeTab?: 'today' | 'goals' | 'calendar' | 'ai' | 'profile';
}

const tabs = [
  { id: 'today', label: 'TODAY', icon: Layers, path: '/today' },
  { id: 'goals', label: 'GOALS', icon: Target, path: '/goals' },
  { id: 'calendar', label: 'CALENDAR', icon: Calendar, path: '/calendar' },
  { id: 'ai', label: 'AI', icon: Cog, path: '/ai-home' },
  { id: 'profile', label: 'PROFILE', icon: Shield, path: '/profile' },
] as const;

export default function BottomNav({ activeTab = 'today' }: BottomNavProps) {
  return (
    // pb-safe adds env(safe-area-inset-bottom) so the tab bar clears the
    // iPhone home indicator and Android gesture bar on real devices.
    // On desktop / non-notch devices this value is 0px — no visual change.
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-[#0B0F17]/85 backdrop-blur-md border-t border-white/5 pb-safe">
      <div className="max-w-md mx-auto px-2 h-[84px] flex items-center justify-between">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          const Icon = tab.icon;
          return (
            <Link
              key={tab.id}
              href={tab.path}
              className={`flex flex-col items-center justify-center gap-1 py-2 px-3 rounded-lg transition-colors min-w-[56px] ${
                isActive ? 'opacity-100' : 'opacity-40'
              }`}
              aria-label={tab.label}
              aria-current={isActive ? 'page' : undefined}
              data-testid={`nav-${tab.id}`}
            >
              <Icon size={24} strokeWidth={2} className={isActive ? 'text-[#2563EB]' : 'text-white'} />
              <span className={`text-[10px] font-bold tracking-[1px] uppercase ${isActive ? 'text-[#2563EB]' : 'text-white'}`}>
                {tab.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
