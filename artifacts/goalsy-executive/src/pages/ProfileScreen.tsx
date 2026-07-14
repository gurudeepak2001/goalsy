import { useState } from 'react';
import { useLocation } from 'wouter';
import { useUser, useClerk } from '@clerk/react';
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
  Building2,
  ChevronDown,
  Camera,
  Image,
  Trash2,
  Loader2,
  Check,
} from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { getInitials } from '@/lib/userDisplay';
import AppHeader from '@/components/AppHeader';
import AppShell from '@/components/AppShell';
import Avatar from '@/components/Avatar';
import CircularScoreRing from '@/components/CircularScoreRing';
import SectionLabel from '@/components/SectionLabel';
import AppModal from '@/components/AppModal';
import ExecutiveInput from '@/components/ExecutiveInput';
import ExecutiveButton from '@/components/ExecutiveButton';
import { Switch } from '@/components/ui/switch';
import {
  mockConnectedAccounts,
  mockNotificationPreferences,
  mockSubscription,
  mockHelpArticles,
  mockAvatarPresets,
  simulateAsync,
  type MockNotificationPreference,
} from '@/lib/mockData';

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
  const { user } = useUser();
  const { signOut } = useClerk();
  // This Clerk instance has firstName/lastName disabled (email+password only accounts), so the
  // full name entered at sign-up is stored in unsafeMetadata instead of user.fullName.
  const metadataName = typeof user?.unsafeMetadata?.fullName === 'string' ? user.unsafeMetadata.fullName.trim() : '';
  const initialName = metadataName || user?.fullName?.trim() || 'Alexander Laurent';
  const [fullName, setFullName] = useState(initialName);
  const [editName, setEditName] = useState(fullName);
  const [editOpen, setEditOpen] = useState(false);
  const [accountsOpen, setAccountsOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [subscriptionOpen, setSubscriptionOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const [openArticleId, setOpenArticleId] = useState<string | null>(null);
  const [notifPrefs, setNotifPrefs] = useState<MockNotificationPreference[]>(mockNotificationPreferences);
  // Clerk always returns some imageUrl (a generated default) even when the user hasn't set a
  // real photo, so only seed a src when hasImage is true — otherwise show initials, matching AppHeader.
  const [avatarSrc, setAvatarSrc] = useState<string | undefined>(user?.hasImage ? user?.imageUrl : undefined);
  const [avatarModalOpen, setAvatarModalOpen] = useState(false);
  const [avatarUploading, setAvatarUploading] = useState<'idle' | 'camera' | 'library'>('idle');
  const [signingOut, setSigningOut] = useState(false);
  // Local-only for now; not persisted to Clerk/backend yet.
  const [biometricsEnabled, setBiometricsEnabled] = useState(true);

  const handleSignOut = async () => {
    if (signingOut) return;
    setSigningOut(true);
    try {
      await signOut();
      navigate('/welcome');
    } finally {
      setSigningOut(false);
    }
  };

  const handlePickAvatar = async (source: 'camera' | 'library') => {
    setAvatarUploading(source);
    // MOCK DATA - replace with real camera capture / photo library + upload API call
    await simulateAsync(true, 1400);
    const preset = mockAvatarPresets[Math.floor(Math.random() * mockAvatarPresets.length)];
    setAvatarSrc(preset);
    setAvatarUploading('idle');
    setAvatarModalOpen(false);
    toast({
      title: 'Profile Photo Updated',
      description: source === 'camera' ? 'New photo captured and saved.' : 'Photo selected from your library.',
    });
  };

  const handleSelectPreset = (preset: string) => {
    setAvatarSrc(preset);
    setAvatarModalOpen(false);
    toast({ title: 'Profile Photo Updated', description: 'Your profile photo has been changed.' });
  };

  const handleRemoveAvatar = () => {
    setAvatarSrc(undefined);
    setAvatarModalOpen(false);
    toast({ title: 'Profile Photo Removed', description: 'Your avatar now shows your initials.' });
  };

  const handleSaveProfile = async () => {
    if (!editName.trim()) {
      toast({ title: 'Name required', description: 'Please enter your name.' });
      return;
    }
    try {
      await user?.update({ unsafeMetadata: { ...user.unsafeMetadata, fullName: editName.trim() } });
      setFullName(editName.trim());
      setEditOpen(false);
      toast({ title: 'Profile Updated', description: 'Your changes have been saved.' });
    } catch {
      toast({
        title: 'Could Not Save',
        description: 'Something went wrong updating your profile. Please try again.',
        variant: 'destructive',
      });
    }
  };

  const toggleNotifPref = (id: string) => {
    // MOCK DATA - replace with a real notification-settings API call
    setNotifPrefs((prev) => prev.map((p) => (p.id === id ? { ...p, enabled: !p.enabled } : p)));
  };

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
              onClick={() => {
                setEditName(fullName);
                setEditOpen(true);
              }}
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
              <Avatar src={avatarSrc} fallback={getInitials(fullName)} size="xl" className="w-full h-full rounded-none border-0" />
            </div>
            <button
              type="button"
              aria-label="Change profile photo"
              onClick={() => setAvatarModalOpen(true)}
              className="absolute -bottom-1.5 -right-1.5 w-8 h-8 bg-[#2563EB] border-2 border-[#05070A] rounded-full flex items-center justify-center text-white active:scale-95 transition-transform"
            >
              <Camera size={14} strokeWidth={2.5} />
            </button>
          </div>
          <div className="flex flex-col gap-1 min-w-0">
            <h1 className="text-white font-bold text-[28px] leading-[35px] tracking-[-1.4px]">
              {fullName}
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
          {/* value controls the ring's fill (0-100 scale, ~842/1000); label keeps the
              displayed number consistent with the actual Goalsy Score shown beside it. */}
          <CircularScoreRing value={84} label="842" size={80} strokeWidth={7} color="#2563EB" showGlow={false} />
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
              onClick={() => setAccountsOpen(true)}
              right={
                <div className="flex items-center gap-2 flex-shrink-0">
                  <span className="text-[#808BA4] font-semibold text-[13px]">{mockConnectedAccounts.length} Institutions</span>
                  <ChevronRight size={16} className="text-[#808BA4]" />
                </div>
              }
            />
            <Row
              icon={<Shield size={20} />}
              title="Security & Biometrics"
              right={
                <Switch
                  checked={biometricsEnabled}
                  onCheckedChange={(checked) => {
                    setBiometricsEnabled(checked);
                    toast({
                      title: checked ? 'Biometrics Enabled' : 'Biometrics Disabled',
                      description: checked
                        ? 'Face ID / Touch ID will be used to secure sign-in.'
                        : 'Face ID / Touch ID has been turned off for this device.',
                    });
                  }}
                />
              }
            />
            <Row
              icon={<Bell size={20} />}
              title="Notification Preferences"
              onClick={() => setNotifOpen(true)}
              right={<ChevronRight size={16} className="text-[#808BA4] flex-shrink-0" />}
            />
            <Row
              icon={<CreditCard size={20} className="text-[#3B82F6]" />}
              title="Subscription"
              onClick={() => setSubscriptionOpen(true)}
              right={
                <span className="text-[#3B82F6] font-bold text-[13px] uppercase tracking-[0.65px] flex-shrink-0">
                  {mockSubscription.tier}
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
            onClick={() => setHelpOpen(true)}
            right={<ChevronRight size={16} className="text-[#808BA4] flex-shrink-0" />}
          />
        </div>

        {/* Sign Out */}
        <button
          type="button"
          onClick={handleSignOut}
          disabled={signingOut}
          className="w-full border border-[#EF4444]/20 rounded-2xl py-5 text-[#EF4444] font-bold text-[15px] leading-[22px] text-center active:scale-[0.98] transition-transform disabled:opacity-70"
        >
          {signingOut ? 'Signing Out...' : 'Sign Out Executive Dashboard'}
        </button>
      </div>

      {/* Edit profile modal */}
      <AppModal open={editOpen} onOpenChange={setEditOpen} title="Edit Profile">
        <div className="flex flex-col gap-5 pb-4">
          <ExecutiveInput label="Full Name" value={editName} onChange={(e) => setEditName(e.target.value)} />
          <ExecutiveButton text="Save Changes" onClick={handleSaveProfile} />
        </div>
      </AppModal>

      {/* Change profile photo modal */}
      <AppModal open={avatarModalOpen} onOpenChange={setAvatarModalOpen} title="Change Profile Photo">
        <div className="flex flex-col gap-5 pb-4">
          <div className="flex flex-col gap-3">
            <button
              type="button"
              onClick={() => handlePickAvatar('camera')}
              disabled={avatarUploading !== 'idle'}
              className="w-full h-14 bg-[#111827] border border-white/5 rounded-2xl flex items-center gap-4 px-5 text-white font-bold text-[15px] active:scale-[0.98] transition-transform disabled:opacity-70"
            >
              {avatarUploading === 'camera' ? (
                <Loader2 size={18} className="animate-spin text-[#2563EB]" />
              ) : (
                <Camera size={18} className="text-[#2563EB]" />
              )}
              {avatarUploading === 'camera' ? 'Capturing Photo...' : 'Take Photo'}
            </button>
            <button
              type="button"
              onClick={() => handlePickAvatar('library')}
              disabled={avatarUploading !== 'idle'}
              className="w-full h-14 bg-[#111827] border border-white/5 rounded-2xl flex items-center gap-4 px-5 text-white font-bold text-[15px] active:scale-[0.98] transition-transform disabled:opacity-70"
            >
              {avatarUploading === 'library' ? (
                <Loader2 size={18} className="animate-spin text-[#2563EB]" />
              ) : (
                <Image size={18} className="text-[#2563EB]" />
              )}
              {avatarUploading === 'library' ? 'Uploading...' : 'Choose from Library'}
            </button>
          </div>

          <div className="flex flex-col gap-3">
            <span className="text-[#808BA4] font-bold text-xs uppercase tracking-[1.5px]">Or pick an avatar</span>
            <div className="grid grid-cols-3 gap-3">
              {mockAvatarPresets.map((preset) => {
                const isSelected = avatarSrc === preset;
                return (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => handleSelectPreset(preset)}
                    className={`relative aspect-square rounded-2xl overflow-hidden border-2 active:scale-95 transition-transform ${
                      isSelected ? 'border-[#2563EB]' : 'border-white/5'
                    }`}
                  >
                    <img src={preset} alt="Avatar option" className="w-full h-full object-cover bg-[#111827]" />
                    {isSelected && (
                      <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                        <Check size={20} className="text-white" />
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {avatarSrc && (
            <button
              type="button"
              onClick={handleRemoveAvatar}
              className="w-full h-12 flex items-center justify-center gap-2 text-[#EF4444] font-bold text-sm active:scale-[0.98] transition-transform"
            >
              <Trash2 size={16} />
              Remove Current Photo
            </button>
          )}
        </div>
      </AppModal>

      {/* Connected accounts modal */}
      <AppModal open={accountsOpen} onOpenChange={setAccountsOpen} title="Connected Accounts">
        <div className="flex flex-col gap-3 pb-4">
          {mockConnectedAccounts.map((account) => (
            <div
              key={account.id}
              className="bg-[#111827] border border-white/5 rounded-2xl p-5 flex items-center gap-4"
            >
              <div className="w-11 h-11 rounded-xl bg-[#1F2937] border border-white/10 flex items-center justify-center flex-shrink-0">
                <Building2 size={20} className="text-white" />
              </div>
              <div className="flex flex-col flex-1 min-w-0">
                <span className="text-white font-bold text-[15px] leading-[22px]">{account.institution}</span>
                <span className="text-[#808BA4] font-semibold text-[13px]">
                  {account.accountType} &bull;&bull;&bull;&bull; {account.last4}
                </span>
              </div>
              <span className="text-white font-bold text-sm flex-shrink-0">{account.balance}</span>
            </div>
          ))}
          <ExecutiveButton
            variant="outline"
            text="Add Institution"
            onClick={() =>
              toast({ title: 'Add Institution', description: 'Opens the secure Plaid link flow to connect a new bank.' })
            }
          />
        </div>
      </AppModal>

      {/* Notification preferences modal */}
      <AppModal open={notifOpen} onOpenChange={setNotifOpen} title="Notification Preferences">
        <div className="flex flex-col gap-3 pb-4">
          {notifPrefs.map((pref) => (
            <div
              key={pref.id}
              className="bg-[#111827] border border-white/5 rounded-2xl p-5 flex items-center justify-between gap-4"
            >
              <div className="flex flex-col min-w-0">
                <span className="text-white font-bold text-[15px] leading-[22px]">{pref.label}</span>
                <span className="text-[#808BA4] font-semibold text-[13px]">{pref.description}</span>
              </div>
              <Switch checked={pref.enabled} onCheckedChange={() => toggleNotifPref(pref.id)} />
            </div>
          ))}
        </div>
      </AppModal>

      {/* Subscription modal */}
      <AppModal open={subscriptionOpen} onOpenChange={setSubscriptionOpen} title={mockSubscription.tier}>
        <div className="flex flex-col gap-5 pb-4">
          <div className="flex items-end justify-between">
            <span className="text-white font-bold text-3xl leading-9">{mockSubscription.price}</span>
            <span className="text-[#808BA4] font-semibold text-sm">Renews {mockSubscription.renewalDate}</span>
          </div>
          <div className="flex flex-col gap-3">
            {mockSubscription.features.map((feature) => (
              <div key={feature} className="flex items-center gap-3">
                <div className="w-1.5 h-1.5 rounded-full bg-[#3B82F6] flex-shrink-0" />
                <span className="text-[#E5E7EB] font-semibold text-sm leading-5">{feature}</span>
              </div>
            ))}
          </div>
          <ExecutiveButton
            variant="outline"
            text="Manage Subscription"
            onClick={() =>
              toast({ title: 'Manage Subscription', description: 'Opens billing management to change or cancel your plan.' })
            }
          />
        </div>
      </AppModal>

      {/* Help & Support modal */}
      <AppModal open={helpOpen} onOpenChange={setHelpOpen} title="Help & Support">
        <div className="flex flex-col gap-3 pb-4">
          {mockHelpArticles.map((article) => {
            const isOpen = openArticleId === article.id;
            return (
              <div key={article.id} className="bg-[#111827] border border-white/5 rounded-2xl overflow-hidden">
                <button
                  type="button"
                  onClick={() => setOpenArticleId(isOpen ? null : article.id)}
                  className="w-full p-5 flex items-center justify-between gap-4 text-left"
                >
                  <span className="text-white font-bold text-[15px] leading-[22px]">{article.question}</span>
                  <ChevronDown
                    size={18}
                    className={`text-[#808BA4] flex-shrink-0 transition-transform ${isOpen ? 'rotate-180' : ''}`}
                  />
                </button>
                {isOpen && (
                  <p className="px-5 pb-5 text-[#CBD5E1] font-semibold text-sm leading-6">{article.answer}</p>
                )}
              </div>
            );
          })}
        </div>
      </AppModal>
    </AppShell>
  );
}
