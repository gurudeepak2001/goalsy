import { Layers } from 'lucide-react';
import AppHeader from '@/components/AppHeader';
import AppShell from '@/components/AppShell';

// PLACEHOLDER — Today tab content is still being decided. Do not add real
// content here until it's specified; this is intentionally blank for now.
export default function TodayScreen() {
  return (
    <AppShell activeTab="today" header={<AppHeader dashboard dashboardTitle="Today" />}>
      <div className="flex-1 flex flex-col items-center justify-center gap-4 text-center py-24">
        <div className="w-14 h-14 bg-[#111827] border border-white/5 rounded-2xl flex items-center justify-center">
          <Layers size={24} className="text-[#808BA4]" />
        </div>
        <div className="flex flex-col gap-1">
          <span className="text-white font-bold text-lg leading-[27px]">Today is coming soon</span>
          <span className="text-[#808BA4] font-semibold text-sm leading-5 max-w-[260px]">
            This tab's content hasn't been designed yet.
          </span>
        </div>
      </div>
    </AppShell>
  );
}
