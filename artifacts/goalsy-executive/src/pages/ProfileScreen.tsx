import { useState, type ReactNode } from 'react';
import { useLocation } from 'wouter';
import {
  Layers,
  ChevronRight,
  Shield,
  Settings,
  Square,
  ArrowRight,
  AlertTriangle,
  Check,
  Globe,
} from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import AppHeader from '@/components/AppHeader';
import AppShell from '@/components/AppShell';

function Toggle({ defaultOn = false, label }: { defaultOn?: boolean; label?: string }) {
  const [on, setOn] = useState(defaultOn);
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      aria-label={label}
      onClick={() => setOn(!on)}
      className={`w-12 h-6 rounded-full transition-colors relative flex-shrink-0 ${on ? 'bg-[#2563EB]' : 'bg-[#1A2238]'}`}
      data-testid="toggle-button"
    >
      <span
        className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white transition-transform ${on ? 'translate-x-6' : 'translate-x-0'}`}
      />
    </button>
  );
}

function SectionHeader({ title, color = 'text-[#CBD5E1]' }: { title: string; color?: string }) {
  return (
    <div className="flex items-center gap-3 mb-4">
      <h3 className={`text-xs font-bold tracking-[0.15em] uppercase ${color}`}>{title}</h3>
      <div className="flex-1 h-px bg-white/5" />
    </div>
  );
}

function ProfileRow({
  icon,
  title,
  subtitle,
  rightElement,
  onClick,
  variant = 'default',
  tall = false,
}: {
  icon: ReactNode;
  title: string;
  subtitle?: string;
  rightElement?: ReactNode;
  onClick?: () => void;
  variant?: 'default' | 'danger';
  tall?: boolean;
}) {
  const titleColor = variant === 'danger' ? 'text-[#EF4444]' : 'text-white';
  const baseClasses = `bg-[#111827] border border-white/5 rounded-2xl px-5 flex items-center justify-between gap-4 w-full text-left ${
    tall ? 'py-5' : 'py-4'
  }`;
  const content = (
    <>
      <div className="flex items-center gap-4 flex-1 min-w-0">
        <div className="text-[#CBD5E1] flex items-center justify-center w-5 flex-shrink-0">{icon}</div>
        <div className="min-w-0">
          <div className={`text-[15px] font-bold leading-5 ${titleColor}`}>{title}</div>
          {subtitle && <div className="text-[#808BA4] text-[13px] leading-5 mt-0.5 truncate">{subtitle}</div>}
        </div>
      </div>
      {rightElement ? (
        <div className="flex items-center justify-center flex-shrink-0">{rightElement}</div>
      ) : onClick ? (
        <ChevronRight size={18} className="text-[#808BA4] flex-shrink-0" />
      ) : null}
    </>
  );

  if (onClick) {
    return (
      <button onClick={onClick} className={`${baseClasses} hover:bg-[#1A2238] transition-colors`}>
        {content}
      </button>
    );
  }

  return <div className={baseClasses}>{content}</div>;
}

function AchievementCard({
  icon,
  iconBg,
  title,
  subtitle,
}: {
  icon: ReactNode;
  iconBg: string;
  title: string;
  subtitle: string;
}) {
  return (
    <div className="bg-[#111827] border border-white/5 rounded-[20px] p-5 flex items-center gap-4">
      <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${iconBg}`}>{icon}</div>
      <div className="min-w-0">
        <div className="text-white text-base font-bold leading-6">{title}</div>
        <div className="text-[#808BA4] text-[13px] leading-5 mt-0.5">{subtitle}</div>
      </div>
    </div>
  );
}

function ScoreRingIcon() {
  return (
    <div className="relative w-20 h-20 flex items-center justify-center">
      <svg width="80" height="80" viewBox="0 0 80 80" className="-rotate-90">
        <circle cx="40" cy="40" r="34" fill="none" stroke="#1F2937" strokeWidth="6" />
        <circle
          cx="40"
          cy="40"
          r="34"
          fill="none"
          stroke="#2563EB"
          strokeWidth="6"
          strokeLinecap="round"
          strokeDasharray={213}
          strokeDashoffset={60}
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <Layers size={24} className="text-white" />
      </div>
    </div>
  );
}

export default function ProfileScreen() {
  const [, navigate] = useLocation();

  return (
    <AppShell
      activeTab="profile"
      className="bg-[#05070A]"
      header={
        <AppHeader
          leftElement={
            <div className="w-10 h-10 bg-[#2563EB] rounded-xl flex items-center justify-center">
              <Layers size={20} className="text-white" />
            </div>
          }
          showLogo={false}
          title="Executive Profile"
          rightElement={
            <button
              onClick={() => navigate('/score')}
              className="w-10 h-10 bg-[#111827] border border-white/5 rounded-xl flex items-center justify-center"
              aria-label="View score"
            >
              <ChevronRight size={20} className="text-[#94A3B8]" />
            </button>
          }
        />
      }
    >
      {/* Profile hero */}
      <div className="flex items-center gap-5 mt-4">
        <div
          className="w-24 h-24 rounded-3xl border-2 border-[#2563EB] overflow-hidden flex-shrink-0"
          style={{ boxShadow: '0 0 20px rgba(37, 99, 235, 0.15)' }}
        >
          <img
            src="/avatar-alex.jpg"
            alt="Alex Thompson"
            className="w-full h-full object-cover"
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = 'none';
            }}
          />
          <div className="w-full h-full bg-[#0F1625] flex items-center justify-center text-white text-xl font-bold">
            AT
          </div>
        </div>
        <div className="flex flex-col justify-center">
          <h1 className="text-white text-[28px] font-bold leading-8 tracking-[-1.4px]">
            Alex<br />Thompson
          </h1>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-[#3B82F6] text-xs font-bold tracking-[0.15em] uppercase">Executive Tier</span>
            <div className="w-1.5 h-1.5 bg-[#22C55E] rounded-full" />
          </div>
        </div>
      </div>

      {/* Goalsy Score card */}
      <div className="mt-8 bg-[#111827] border border-white/5 rounded-3xl p-6 flex items-center justify-between">
        <div className="flex flex-col">
          <span className="text-[#808BA4] text-xs font-bold tracking-[0.15em] uppercase">Goalsy Score</span>
          <div className="flex items-baseline gap-1 mt-1">
            <span className="text-white text-5xl font-bold tracking-[-2.4px]">842</span>
            <span className="text-[#22C55E] text-sm font-bold">+12%</span>
          </div>
        </div>
        <ScoreRingIcon />
      </div>

      {/* Achievements */}
      <div className="mt-8">
        <SectionHeader title="Achievements" />
        <div className="flex flex-col gap-3">
          <AchievementCard
            icon={<AlertTriangle size={24} className="text-[#F59E0B]" />}
            iconBg="bg-[#F59E0B]/10"
            title="7-Day Mission Streak"
            subtitle="Perfect weekly execution"
          />
          <AchievementCard
            icon={<Check size={24} className="text-[#22C55E]" />}
            iconBg="bg-[#22C55E]/10"
            title="Savings Milestone: $100k"
            subtitle="Wealth accumulation target met"
          />
        </div>
      </div>

      {/* Account & Security */}
      <div className="mt-8">
        <SectionHeader title="Account & Security" />
        <div className="flex flex-col gap-2">
          <ProfileRow
            icon={<Globe size={18} />}
            title="Connected Accounts"
            subtitle="3 Institutions"
            onClick={() => toast({ title: 'Connected Accounts', description: '3 institutions linked.' })}
            tall
          />
          <ProfileRow
            icon={<Shield size={18} />}
            title="Security & Biometrics"
            rightElement={<Toggle defaultOn label="Security & Biometrics" />}
          />
          <ProfileRow
            icon={<Settings size={18} />}
            title="Notification Preferences"
            onClick={() => toast({ title: 'Notification Preferences', description: 'Preferences coming soon.' })}
          />
          <ProfileRow
            icon={<Square size={18} className="text-[#3B82F6]" />}
            title="Subscription"
            rightElement={<span className="text-[#3B82F6] text-xs font-bold tracking-[0.1em] uppercase">Executive Tier</span>}
          />
        </div>
      </div>

      {/* General */}
      <div className="mt-8">
        <SectionHeader title="General" color="text-[#808BA4]" />
        <div className="flex flex-col gap-2">
          <ProfileRow
            icon={<ArrowRight size={18} />}
            title="Help & Support"
            onClick={() => toast({ title: 'Help & Support', description: 'Support center coming soon.' })}
          />
        </div>
      </div>

      {/* Sign out */}
      <button
        onClick={() => navigate('/welcome')}
        className="mt-8 w-full bg-[#111827] border border-[#EF4444]/30 rounded-2xl text-center text-[#EF4444] text-sm font-semibold py-4"
      >
        Sign Out Executive Dashboard
      </button>
    </AppShell>
  );
}
