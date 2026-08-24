import { useEffect, useRef, useState, type ChangeEvent } from 'react';
import { useLocation } from 'wouter';
import { useUser, useClerk } from '@clerk/react';
import { useQueryClient } from '@tanstack/react-query';
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
  mockSubscription,
} from '@/lib/mockData';
import { getScoreTier } from '@/lib/scoreUtils';
import { buildProfileAchievements, profileHelpArticles, type ProfileAchievement } from '@/lib/profileContent';
import {
  useGetScore,
  useGetFinancialProfile,
  useGetMissionStreak,
  useListNotificationPreferences,
  useUpdateNotificationPreference,
  getListNotificationPreferencesQueryKey,
} from '@workspace/api-client-react';

// ── Notification type display metadata ────────────────────────────────────────
const NOTIF_META: Record<string, { label: string; description: string }> = {
  mission_reminders: { label: 'Mission Reminders', description: 'Daily alerts to complete your mission' },
  goal_updates: { label: 'Goal Updates', description: 'Celebrate milestone achievements on your goals' },
  goal_reminders: { label: 'Goal Reminders', description: 'Alerts when goals fall behind schedule' },
  market_alerts: { label: 'Market Alerts', description: 'Important market movements affecting your portfolio' },
  weekly_summary: { label: 'Weekly Summary', description: 'Digest of your financial week every Sunday' },
  ai_insights: { label: 'AI Insights', description: 'Daily strategic recommendations' },
};

interface RowProps {
  icon: React.ReactNode;
  title: string;
  onClick?: () => void;
  right: React.ReactNode;
}

function Row({ icon, title, onClick, right }: RowProps) {
  const isClickable = !!onClick;
  const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (!onClick || (event.key !== 'Enter' && event.key !== ' ')) return;
    event.preventDefault();
    onClick();
  };

  return (
    <div
      onClick={onClick}
      onKeyDown={handleKeyDown}
      role={isClickable ? 'button' : undefined}
      tabIndex={isClickable ? 0 : undefined}
      className={`bg-[#111827] border border-white/5 rounded-2xl px-6 py-5 flex items-center justify-between focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#3B82F6] ${
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
  const queryClient = useQueryClient();

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
  const [selectedAchievement, setSelectedAchievement] = useState<ProfileAchievement | null>(null);
  const [avatarSrc, setAvatarSrc] = useState<string | undefined>(user?.hasImage ? user?.imageUrl : undefined);
  const [avatarModalOpen, setAvatarModalOpen] = useState(false);
  const [avatarUploading, setAvatarUploading] = useState<'idle' | 'camera' | 'library'>('idle');
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const libraryInputRef = useRef<HTMLInputElement>(null);
  const [signingOut, setSigningOut] = useState(false);
  const [biometricsEnabled, setBiometricsEnabled] = useState(true);

  // ── Real API: score + notification prefs ──────────────────────────────────
  const { data: scoreResult } = useGetScore();
  const { data: financialProfile } = useGetFinancialProfile();
  const { data: missionStreak } = useGetMissionStreak();
  const { data: notifPrefs } = useListNotificationPreferences();
  const { mutateAsync: updatePref } = useUpdateNotificationPreference();

  const score = scoreResult?.score ?? 842;
  const tier = scoreResult ? getScoreTier(score) : getScoreTier(842);
  const achievements = buildProfileAchievements(financialProfile?.profile, missionStreak);

  useEffect(() => {
    setAvatarSrc(user?.hasImage ? user.imageUrl : undefined);
  }, [user?.hasImage, user?.imageUrl]);

  const handleToggleNotif = async (type: string, currentEnabled: boolean) => {
    try {
      await updatePref({ type, data: { enabled: !currentEnabled } });
      await queryClient.invalidateQueries({ queryKey: getListNotificationPreferencesQueryKey() });
    } catch {
      toast({ title: 'Could not update preference', variant: 'destructive' });
    }
  };

  // ── Auth handlers ─────────────────────────────────────────────────────────
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

  const openPhotoPicker = (source: 'camera' | 'library') => {
    (source === 'camera' ? cameraInputRef : libraryInputRef).current?.click();
  };

  const handlePickAvatar = async (event: ChangeEvent<HTMLInputElement>, source: 'camera' | 'library') => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      toast({ title: 'Choose an image file', variant: 'destructive' });
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast({ title: 'Photo is too large', description: 'Choose an image smaller than 5 MB.', variant: 'destructive' });
      return;
    }
    if (!user) {
      toast({ title: 'Could Not Save', description: 'Please sign in again and retry.', variant: 'destructive' });
      return;
    }
    setAvatarUploading(source);
    try {
      await user.setProfileImage({ file });
      await user.reload();
      setAvatarSrc(user.imageUrl);
      setAvatarModalOpen(false);
      toast({
        title: 'Profile Photo Updated',
        description: source === 'camera' ? 'New photo captured and saved.' : 'Photo selected from your library.',
      });
    } catch {
      toast({ title: 'Could Not Save', description: 'Your profile photo could not be updated. Please try again.', variant: 'destructive' });
    } finally {
      setAvatarUploading('idle');
    }
  };

  const handleRemoveAvatar = async () => {
    if (!user) return;
    setAvatarUploading('library');
    try {
      await user.setProfileImage({ file: null });
      await user.reload();
      setAvatarSrc(undefined);
      setAvatarModalOpen(false);
      toast({ title: 'Profile Photo Removed', description: 'Your avatar now shows your initials.' });
    } catch {
      toast({ title: 'Could Not Remove', description: 'Your profile photo could not be removed. Please try again.', variant: 'destructive' });
    } finally {
      setAvatarUploading('idle');
    }
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
      toast({ title: 'Could Not Save', description: 'Something went wrong. Please try again.', variant: 'destructive' });
    }
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
              onClick={() => { setEditName(fullName); setEditOpen(true); }}
              className="w-10 h-10 p-0 bg-[#1F2937] border border-white/10 rounded-xl flex items-center justify-center text-white flex-shrink-0 active:scale-95 transition-transform"
            >
              <Pencil size={16} strokeWidth={2} />
            </button>
          }
        />
      }
    >
      <input
        ref={cameraInputRef}
        className="sr-only"
        type="file"
        accept="image/*"
        capture="user"
        onChange={(event) => handlePickAvatar(event, 'camera')}
      />
      <input
        ref={libraryInputRef}
        className="sr-only"
        type="file"
        accept="image/*"
        onChange={(event) => handlePickAvatar(event, 'library')}
      />
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
              className="absolute -bottom-2 -right-2 w-10 h-10 bg-[#2563EB] border-2 border-[#05070A] rounded-full flex items-center justify-center text-white active:scale-95 transition-transform"
            >
              <Camera size={14} strokeWidth={2.5} />
            </button>
          </div>
          <div className="flex flex-col gap-1 min-w-0">
            <h1 className="text-white font-bold text-[28px] leading-[35px] tracking-[-1.4px]">{fullName}</h1>
            <div className="flex items-center gap-2">
              <span className="text-[#3B82F6] font-bold text-xs uppercase tracking-[1.5px]">{tier} Tier</span>
              <div className="w-1.5 h-1.5 bg-[#22C55E] rounded-full flex-shrink-0" />
            </div>
          </div>
        </div>

        {/* Goalsy Score */}
        <button
          type="button"
          onClick={() => navigate('/score')}
          className="w-full text-left bg-[#111827] border border-white/5 rounded-3xl p-6 flex items-center justify-between cursor-pointer hover:bg-[#161F2E] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#3B82F6] transition-colors"
          data-testid="card-score"
        >
          <div className="flex flex-col gap-1">
            <span className="text-[#808BA4] font-bold text-xs uppercase tracking-[1.2px]">Goalsy Score</span>
            <div className="flex items-baseline gap-1">
              <span className="text-white font-bold text-5xl leading-[72px] tracking-[-2.4px]">{score}</span>
            </div>
          </div>
          <CircularScoreRing value={Math.round(score / 10)} label={String(score)} size={80} strokeWidth={7} color="#2563EB" showGlow={false} />
        </button>

        {/* Achievements */}
        <div className="flex flex-col gap-4">
          <SectionLabel text="Achievements" accentBar />
          <div className="flex flex-col gap-3">
            {achievements.map((achievement) => {
              const isMission = achievement.id === 'mission-streak';
              return (
                <button
                  key={achievement.id}
                  type="button"
                  aria-label={`View details for ${achievement.title}`}
                  onClick={() => setSelectedAchievement(achievement)}
                  className="w-full bg-[#111827] border border-white/5 rounded-[20px] p-5 flex items-center gap-4 text-left hover:bg-[#161F2E] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#3B82F6] active:scale-[0.99] transition"
                >
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${isMission ? 'bg-[#F59E0B]/10' : 'bg-[#22C55E]/10'}`}>
                    {isMission
                      ? <Flame size={24} className="text-[#F59E0B]" />
                      : <PiggyBank size={24} className="text-[#22C55E]" />}
                  </div>
                  <div className="flex flex-col min-w-0 flex-1">
                    <span className="text-white font-bold text-base leading-6">{achievement.title}</span>
                    <span className="text-[#808BA4] font-semibold text-[13px] leading-5">{achievement.progressLabel}</span>
                  </div>
                  <ChevronRight size={18} className="text-[#808BA4] flex-shrink-0" />
                </button>
              );
            })}
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
                      description: checked ? 'Face ID / Touch ID will be used to secure sign-in.' : 'Face ID / Touch ID has been turned off for this device.',
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
            <button type="button" onClick={() => openPhotoPicker('camera')} disabled={avatarUploading !== 'idle'}
              className="w-full h-14 bg-[#111827] border border-white/5 rounded-2xl flex items-center gap-4 px-5 text-white font-bold text-[15px] active:scale-[0.98] transition-transform disabled:opacity-70">
              {avatarUploading === 'camera' ? <Loader2 size={18} className="animate-spin text-[#2563EB]" /> : <Camera size={18} className="text-[#2563EB]" />}
              {avatarUploading === 'camera' ? 'Capturing Photo...' : 'Take Photo'}
            </button>
            <button type="button" onClick={() => openPhotoPicker('library')} disabled={avatarUploading !== 'idle'}
              className="w-full h-14 bg-[#111827] border border-white/5 rounded-2xl flex items-center gap-4 px-5 text-white font-bold text-[15px] active:scale-[0.98] transition-transform disabled:opacity-70">
              {avatarUploading === 'library' ? <Loader2 size={18} className="animate-spin text-[#2563EB]" /> : <Image size={18} className="text-[#2563EB]" />}
              {avatarUploading === 'library' ? 'Uploading...' : 'Choose from Library'}
            </button>
          </div>
          {avatarSrc && (
            <button type="button" onClick={handleRemoveAvatar}
              className="w-full h-12 flex items-center justify-center gap-2 text-[#EF4444] font-bold text-sm active:scale-[0.98] transition-transform">
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
            <div key={account.id} className="bg-[#111827] border border-white/5 rounded-2xl p-5 flex items-center gap-4">
              <div className="w-11 h-11 rounded-xl bg-[#1F2937] border border-white/10 flex items-center justify-center flex-shrink-0">
                <Building2 size={20} className="text-white" />
              </div>
              <div className="flex flex-col flex-1 min-w-0">
                <span className="text-white font-bold text-[15px] leading-[22px]">{account.institution}</span>
                <span className="text-[#808BA4] font-semibold text-[13px]">{account.accountType} &bull;&bull;&bull;&bull; {account.last4}</span>
              </div>
              <span className="text-white font-bold text-sm flex-shrink-0">{account.balance}</span>
            </div>
          ))}
          <ExecutiveButton variant="outline" text="Add Institution" onClick={() => toast({ title: 'Add Institution', description: 'Opens the secure Plaid link flow to connect a new bank.' })} />
        </div>
      </AppModal>

      {/* Notification preferences modal */}
      <AppModal open={notifOpen} onOpenChange={setNotifOpen} title="Notification Preferences">
        <div className="flex flex-col gap-3 pb-4">
          {(notifPrefs ?? []).map((pref) => {
            const meta = NOTIF_META[pref.type] ?? { label: pref.type, description: '' };
            return (
              <div key={pref.id} className="bg-[#111827] border border-white/5 rounded-2xl p-5 flex items-center justify-between gap-4">
                <div className="flex flex-col min-w-0">
                  <span className="text-white font-bold text-[15px] leading-[22px]">{meta.label}</span>
                  <span className="text-[#808BA4] font-semibold text-[13px]">{meta.description}</span>
                </div>
                <Switch checked={pref.enabled} onCheckedChange={() => handleToggleNotif(pref.type, pref.enabled)} />
              </div>
            );
          })}
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
          <p className="text-[#808BA4] font-semibold text-xs leading-5">
            Subscription management is not available yet. This plan information is a preview.
          </p>
        </div>
      </AppModal>

      {/* Achievement detail modal */}
      <AppModal
        open={selectedAchievement !== null}
        onOpenChange={(open) => { if (!open) setSelectedAchievement(null); }}
        title={selectedAchievement?.title ?? 'Achievement'}
      >
        {selectedAchievement && (
          <div className="flex flex-col gap-5 pb-4">
            <p className="text-[#CBD5E1] font-semibold text-sm leading-6">{selectedAchievement.description}</p>
            <div className="bg-[#111827] border border-white/5 rounded-2xl p-5 flex flex-col gap-2">
              <span className="text-[#808BA4] font-bold text-xs uppercase tracking-[1.5px]">
                {selectedAchievement.status === 'earned' ? 'Achievement earned' : 'Current progress'}
              </span>
              <span className="text-white font-bold text-base leading-6">{selectedAchievement.progressLabel}</span>
              {selectedAchievement.earnedAt && (
                <span className="text-[#CBD5E1] font-semibold text-sm">
                  Date earned: {new Date(selectedAchievement.earnedAt).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                  })}
                </span>
              )}
            </div>
          </div>
        )}
      </AppModal>

      {/* Help & Support modal */}
      <AppModal open={helpOpen} onOpenChange={setHelpOpen} title="Help & Support">
        <div className="flex flex-col gap-3 pb-4">
          {profileHelpArticles.map((article) => {
            const isOpen = openArticleId === article.id;
            return (
              <div key={article.id} className="bg-[#111827] border border-white/5 rounded-2xl overflow-hidden">
                <button type="button" onClick={() => setOpenArticleId(isOpen ? null : article.id)}
                  className="w-full p-5 flex items-center justify-between gap-4 text-left">
                  <span className="text-white font-bold text-[15px] leading-[22px]">{article.title}</span>
                  <ChevronDown size={18} className={`text-[#808BA4] flex-shrink-0 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                </button>
                {isOpen && <p className="px-5 pb-5 text-[#CBD5E1] font-semibold text-sm leading-6">{article.body}</p>}
              </div>
            );
          })}
        </div>
      </AppModal>
    </AppShell>
  );
}
