import { useState } from 'react';
import { useLocation } from 'wouter';
import {
  Link2,
  Shield,
  Bell,
  CreditCard,
  HelpCircle,
  Flame,
  PiggyBank,
  Pencil,
  ChevronRight,
} from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import AppHeader from '@/components/AppHeader';
import AppShell from '@/components/AppShell';
import Avatar from '@/components/Avatar';
import CircularScoreRing from '@/components/CircularScoreRing';
import SectionLabel from '@/components/SectionLabel';

function Toggle({ defaultOn = false }: { defaultOn?: boolean }) {
  const [on, setOn] = useState(defaultOn);
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      onClick={() => setOn(!on)}
      className={`w-12 h-6 rounded-full transition-colors relative flex-shrink-0 ${on ? 'bg-[#2563EB]' : 'bg-[#1F2937]'}`}
      data-testid="toggle-button"
    >
      <span
        className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-transform ${on ? 'translate-x-7' : 'translate-x-1'}`}
      />
    </button>
  );
}

interface RowProps {
  icon: React.ReactNode;
  title: string;
  onClick?: () => void;
  right: React.ReactNode;
}

function Row({ icon, title, onClick, right }: RowProps) {
  const isClickable = !!onClick;
  return (
    <div
      onClick={onClick}
      role={isClickable ? 'button' : undefined}
      tabIndex={isClickable ? 0 : undefined}
      className={`bg-[#111827] border border-white/5 rounded-2xl px-6 py-5 flex items-center justify-between ${
        isClickable ? 'hover:bg-[#161F2E] cursor-pointer transition-colors' : ''
      }`}
    >
      <div className="flex items-center gap-4">
        <span className="text-[#CBD5E1] flex-shrink-0">{icon}</span>
        <span className="text-white font-bold text-[15px] leading-[22px]">{title}</span>
      </div>
      {right}
    </div>
  );
}

export default function ProfileScreen() {
  const [, navigate] = useLocation();

  return (
    <AppShell
      activeTab="profile"
      header={
        <AppHeader
          showLogo
          title="Executive Profile"
          rightElement={
            <button
              type="button"
              aria-label="Edit profile"
              onClick={() => toast({ title: 'Edit Profile', description: 'Profile editor coming soon.' })}
              className="w-10 h-10 p-0 bg-[#1F2937] border border-white/10 rounded-xl flex items-center justify-center text-white flex-shrink-0 active:scale-95 transition-transform"
            >
              <Pencil size={16} strokeWidth={2} />
            </button>
          }
        />
      }
    >
      <div className="flex flex-col gap-10">
        {/* Identity */}
        <div className="flex items-center gap-6">
          <div className="relative flex-shrink-0">
            <div
              className="w-[94px] h-24 rounded-3xl border-2 border-[#2563EB] overflow-hidden flex items-center justify-center bg-white/[0.02]"
              style={{ boxShadow: '0px 0px 20px rgba(37, 99, 235, 0.15)' }}
            >
              <Avatar fallback="AL" size="xl" className="w-full h-full rounded-none border-0" />
            </div>
          </div>
          <div className="flex flex-col gap-1 min-w-0">
            <h1 className="text-white font-bold text-[28px] leading-[35px] tracking-[-1.4px]">
              Alexander Laurent
            </h1>
            <div className="flex items-center gap-2">
              <span className="text-[#3B82F6] font-bold text-xs uppercase tracking-[1.5px]">
                Executive Tier
              </span>
              <div className="w-1.5 h-1.5 bg-[#22C55E] rounded-full flex-shrink-0" />
            </div>
          </div>
        </div>

        {/* Goalsy Score */}
        <div
          onClick={() => navigate('/score')}
          className="bg-[#111827] border border-white/5 rounded-3xl p-6 flex items-center justify-between cursor-pointer hover:bg-[#161F2E] transition-colors"
          data-testid="card-score"
        >
          <div className="flex flex-col gap-1">
            <span className="text-[#808BA4] font-bold text-xs uppercase tracking-[1.2px]">
              Goalsy Score
            </span>
            <div className="flex items-baseline gap-1">
              <span className="text-white font-bold text-5xl leading-[72px] tracking-[-2.4px]">842</span>
              <span className="text-[#22C55E] font-bold text-sm leading-[21px]">+12%</span>
            </div>
          </div>
          <CircularScoreRing value={84} size={80} strokeWidth={7} color="#2563EB" showGlow={false} />
        </div>

        {/* Achievements */}
        <div className="flex flex-col gap-4">
          <SectionLabel text="Achievements" accentBar />
          <div className="flex flex-col gap-3">
            <div className="bg-[#111827] border border-white/5 rounded-[20px] p-5 flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-[#F59E0B]/10 flex items-center justify-center flex-shrink-0">
                <Flame size={24} className="text-[#F59E0B]" />
              </div>
              <div className="flex flex-col">
                <span className="text-white font-bold text-base leading-6">7-Day Mission Streak</span>
                <span className="text-[#808BA4] font-semibold text-[13px] leading-5">Perfect weekly execution</span>
              </div>
            </div>
            <div className="bg-[#111827] border border-white/5 rounded-[20px] p-5 flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-[#22C55E]/10 flex items-center justify-center flex-shrink-0">
                <PiggyBank size={24} className="text-[#22C55E]" />
              </div>
              <div className="flex flex-col">
                <span className="text-white font-bold text-base leading-6">Savings Milestone: $100k</span>
                <span className="text-[#808BA4] font-semibold text-[13px] leading-5">Wealth accumulation target met</span>
              </div>
            </div>
          </div>
        </div>

        {/* Account & Security */}
        <div className="flex flex-col gap-4">
          <SectionLabel text="Account & Security" accentBar />
          <div className="flex flex-col gap-2">
            <Row
              icon={<Link2 size={20} />}
              title="Connected Accounts"
              onClick={() => toast({ title: 'Connected Accounts', description: 'Manage connected institutions.' })}
              right={
                <div className="flex items-center gap-2 flex-shrink-0">
                  <span className="text-[#808BA4] font-semibold text-[13px]">3 Institutions</span>
                  <ChevronRight size={16} className="text-[#808BA4]" />
                </div>
              }
            />
            <Row
              icon={<Shield size={20} />}
              title="Security & Biometrics"
              right={<Toggle defaultOn />}
            />
            <Row
              icon={<Bell size={20} />}
              title="Notification Preferences"
              onClick={() => toast({ title: 'Notification Preferences', description: 'Notification settings coming soon.' })}
              right={<ChevronRight size={16} className="text-[#808BA4] flex-shrink-0" />}
            />
            <Row
              icon={<CreditCard size={20} className="text-[#3B82F6]" />}
              title="Subscription"
              right={
                <span className="text-[#3B82F6] font-bold text-[13px] uppercase tracking-[0.65px] flex-shrink-0">
                  Executive Tier
                </span>
              }
            />
          </div>
        </div>

        {/* General */}
        <div className="flex flex-col gap-4">
          <SectionLabel text="General" accentBar />
          <Row
            icon={<HelpCircle size={20} />}
            title="Help & Support"
            onClick={() => toast({ title: 'Help Center', description: 'Support center coming soon.' })}
            right={<ChevronRight size={16} className="text-[#808BA4] flex-shrink-0" />}
          />
        </div>

        {/* Sign Out */}
        <button
          type="button"
          onClick={() => navigate('/welcome')}
          className="w-full border border-[#EF4444]/20 rounded-2xl py-5 text-[#EF4444] font-bold text-[15px] leading-[22px] text-center active:scale-[0.98] transition-transform"
        >
          Sign Out Executive Dashboard
        </button>
      </div>
    </AppShell>
  );
}
