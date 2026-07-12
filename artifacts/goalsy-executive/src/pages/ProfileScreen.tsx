import { useState } from 'react';
import { useLocation } from 'wouter';
import {
  User,
  Mail,
  Bell,
  Shield,
  Moon,
  Fingerprint,
  FileText,
  HelpCircle,
  LogOut,
  ChevronRight,
  Crown,
  Pencil,
} from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import AppHeader from '@/components/AppHeader';
import AppShell from '@/components/AppShell';
import Avatar from '@/components/Avatar';
import CircularScoreRing from '@/components/CircularScoreRing';
import ListRow from '@/components/ListRow';
import SectionLabel from '@/components/SectionLabel';

function Toggle({ defaultOn = false }: { defaultOn?: boolean }) {
  const [on, setOn] = useState(defaultOn);
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      onClick={() => setOn(!on)}
      className={`w-11 h-6 rounded-full transition-colors relative ${on ? 'bg-[#2563EB]' : 'bg-[#1A2238]'}`}
      data-testid="toggle-button"
    >
      <span
        className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-transform ${on ? 'translate-x-6' : 'translate-x-1'}`}
      />
    </button>
  );
}

export default function ProfileScreen() {
  const [, navigate] = useLocation();

  return (
    <AppShell activeTab="profile" header={<AppHeader showLogo={false} title="Profile" rightElement={<Pencil size={18} className="text-[#94A3B8]" />} />}>
      <div className="pt-4 flex flex-col items-center">
        <div className="relative">
          <Avatar fallback="AL" size="xl" />
          <div className="absolute bottom-0 right-0 w-4 h-4 bg-[#22C55E] border-2 border-[#09090C] rounded-full" />
        </div>
        <h1 className="text-white font-bold text-xl mt-4">Alexander Laurent</h1>
        <p className="text-[#64748B] text-sm">alex.laurent@executive.co</p>
        <div className="mt-3 flex items-center gap-2 bg-[#0F2A1A] text-[#22C55E] border border-[#16A34A]/30 rounded-full px-3 py-1 text-xs font-medium tracking-wide uppercase">
          <Crown size={12} />
          Executive Member
        </div>
      </div>

      <div className="mt-8">
        <div
          onClick={() => navigate('/score')}
          className="bg-[#0F1625] border border-[#1A2238] rounded-2xl p-5 flex items-center justify-between cursor-pointer hover:bg-[#131E35] transition-colors"
          data-testid="card-score"
        >
          <div className="flex flex-col">
            <span className="text-[#64748B] text-xs font-bold tracking-[0.2em] uppercase">Goalsy Score</span>
            <span className="text-white text-lg font-bold mt-1">Credit Intelligence</span>
            <span className="text-[#94A3B8] text-xs mt-1">Updated today</span>
          </div>
          <CircularScoreRing value={78} size={88} strokeWidth={7} color="#22C55E" label="78" sublabel="EXCELLENT" showGlow={false} />
        </div>
      </div>

      <div className="mt-8">
        <SectionLabel text="Account" accentBar />
        <div className="flex flex-col gap-2">
          <ListRow
            icon={<User size={18} />}
            title="Personal Information"
            subtitle="Name, email, phone"
            onClick={() => toast({ title: 'Personal Information', description: 'Profile editor coming soon.' })}
          />
          <ListRow
            icon={<Mail size={18} />}
            title="Linked Accounts"
            subtitle="2 institutions connected"
            onClick={() => toast({ title: 'Linked Accounts', description: 'Manage connected institutions.' })}
          />
          <ListRow
            icon={<Shield size={18} />}
            title="Security"
            subtitle="Password, 2FA, biometrics"
            onClick={() => toast({ title: 'Security', description: 'Security settings coming soon.' })}
          />
        </div>
      </div>

      <div className="mt-8">
        <SectionLabel text="Preferences" accentBar />
        <div className="flex flex-col gap-2">
          <ListRow
            icon={<Bell size={18} />}
            title="Notifications"
            subtitle="Push, email, SMS"
            rightElement={<Toggle defaultOn />}
          />
          <ListRow
            icon={<Moon size={18} />}
            title="Dark Mode"
            subtitle="Always-on executive theme"
            rightElement={<Toggle defaultOn />}
          />
          <ListRow
            icon={<Fingerprint size={18} />}
            title="Biometric Unlock"
            subtitle="FaceID / TouchID"
            rightElement={<Toggle defaultOn />}
          />
        </div>
      </div>

      <div className="mt-8">
        <SectionLabel text="Support" accentBar />
        <div className="flex flex-col gap-2">
          <ListRow
            icon={<FileText size={18} />}
            title="Terms & Privacy"
            onClick={() => toast({ title: 'Terms & Privacy', description: 'Legal documents opening soon.' })}
          />
          <ListRow
            icon={<HelpCircle size={18} />}
            title="Help Center"
            onClick={() => toast({ title: 'Help Center', description: 'Support center coming soon.' })}
          />
        </div>
      </div>

      <div className="mt-8">
        <ListRow
          icon={<LogOut size={18} />}
          title="Sign Out"
          variant="danger"
          onClick={() => navigate('/welcome')}
        />
      </div>

      <div className="mt-6 text-center">
        <p className="text-[#334155] text-[10px] tracking-[0.2em] uppercase font-medium">GOALSY EXECUTIVE V4.2</p>
      </div>
    </AppShell>
  );
}
