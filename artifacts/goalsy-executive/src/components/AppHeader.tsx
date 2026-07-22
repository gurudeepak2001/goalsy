import { ReactNode, useState } from 'react';
import { Zap, ChevronLeft, X, Bell } from 'lucide-react';
import { useLocation } from 'wouter';
import { useUser } from '@clerk/react';
import { useQueryClient } from '@tanstack/react-query';
import GoalsyLogo from './GoalsyLogo';
import Avatar from './Avatar';
import AppModal from './AppModal';
import { getInitials } from '@/lib/userDisplay';
import {
  useListNotifications,
  useMarkNotificationRead,
  useDismissNotification,
  useClearNotifications,
  getListNotificationsQueryKey,
} from '@workspace/api-client-react';
import type { AppNotification } from '@workspace/api-client-react';

// ── Relative time label ───────────────────────────────────────────────────────
function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

// ── Notification item ─────────────────────────────────────────────────────────
function NotifItem({
  notif,
  onTap,
  onDismiss,
}: {
  notif: AppNotification;
  onTap: () => void;
  onDismiss: () => void;
}) {
  return (
    <div
      className={`relative bg-[#111827] border rounded-2xl p-5 flex flex-col gap-1 transition-colors ${
        notif.isRead ? 'border-white/5 opacity-70' : 'border-white/10'
      }`}
    >
      {/* Unread dot */}
      {!notif.isRead && (
        <div className="absolute top-4 right-12 w-2 h-2 bg-[#2563EB] rounded-full" />
      )}
      {/* Dismiss button */}
      <button
        type="button"
        aria-label="Dismiss notification"
        onClick={(e) => { e.stopPropagation(); onDismiss(); }}
        className="absolute top-3.5 right-3.5 w-7 h-7 flex items-center justify-center text-[#4B5563] hover:text-white transition-colors rounded-lg"
      >
        <X size={13} strokeWidth={2.5} />
      </button>

      {/* Tappable content */}
      <button
        type="button"
        onClick={onTap}
        className="text-left flex flex-col gap-1 pr-6"
      >
        <div className="flex items-center justify-between gap-2 pr-6">
          <span className="text-white font-bold text-[15px] leading-[22px]">{notif.title}</span>
          <span className="text-[#808BA4] font-semibold text-xs flex-shrink-0">{relativeTime(notif.createdAt)}</span>
        </div>
        {notif.body && (
          <span className="text-[#CBD5E1] font-semibold text-sm leading-5">{notif.body}</span>
        )}
      </button>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
interface AppHeaderProps {
  showSecureMode?: boolean;
  rightElement?: ReactNode;
  showLogo?: boolean;
  title?: string;
  className?: string;
  dashboard?: boolean;
  dashboardTitle?: string;
  showNotification?: boolean;
  /** Renders a back chevron instead of the logo and navigates to this path when tapped. */
  backTo?: string;
}

export default function AppHeader({
  showSecureMode = false,
  rightElement,
  showLogo = true,
  title,
  className = '',
  dashboard = false,
  dashboardTitle,
  showNotification = true,
  backTo,
}: AppHeaderProps) {
  const [, navigate] = useLocation();
  const [notifOpen, setNotifOpen] = useState(false);
  const { user } = useUser();
  const queryClient = useQueryClient();

  const metadataName = typeof user?.unsafeMetadata?.fullName === 'string' ? user.unsafeMetadata.fullName : undefined;
  const realFallback = getInitials(metadataName || user?.fullName);
  const realAvatarSrc = user?.hasImage ? user?.imageUrl : undefined;

  // ── Notification API hooks ─────────────────────────────────────────────────
  const { data: notifications } = useListNotifications({ query: { enabled: dashboard && showNotification } });
  const { mutateAsync: markRead } = useMarkNotificationRead();
  const { mutateAsync: dismiss } = useDismissNotification();
  const { mutateAsync: clearAll, isPending: clearing } = useClearNotifications();

  const notifList = notifications ?? [];
  const unreadCount = notifList.filter((n) => !n.isRead).length;

  const invalidateNotifs = () =>
    queryClient.invalidateQueries({ queryKey: getListNotificationsQueryKey() });

  const handleTap = async (notif: AppNotification) => {
    // Mark as read (fire and forget)
    if (!notif.isRead) {
      markRead({ id: notif.id }).then(invalidateNotifs).catch(() => {});
    }
    setNotifOpen(false);
    if (notif.targetScreen) {
      navigate(notif.targetScreen);
    }
  };

  const handleDismiss = async (id: string) => {
    try {
      await dismiss({ id });
      await invalidateNotifs();
    } catch { /* silent */ }
  };

  const handleClearAll = async () => {
    try {
      await clearAll();
      await invalidateNotifs();
    } catch { /* silent */ }
  };

  if (dashboard) {
    return (
      <>
        <header className={`flex items-center justify-between h-full w-full ${className}`}>
          <div className="flex items-center gap-3 h-10">
            {backTo ? (
              <button
                type="button"
                aria-label="Go back"
                onClick={() => navigate(backTo)}
                className="w-10 h-10 -ml-2 p-0 rounded-xl flex items-center justify-center text-white flex-shrink-0 active:scale-95 transition-transform"
              >
                <ChevronLeft size={22} strokeWidth={2.5} />
              </button>
            ) : (
              <img src="/logo-icon.png" alt="Goalsy" className="w-10 h-10 rounded-xl" draggable={false} />
            )}
            <span className="text-white font-bold text-lg leading-[27px]" style={{ letterSpacing: '-0.45px' }}>
              {dashboardTitle || 'Goalsy'}
            </span>
          </div>
          <div className="flex items-center justify-end gap-3 h-10 ml-auto">
            {showNotification && (
              <button
                type="button"
                aria-label={`Notifications${unreadCount > 0 ? ` — ${unreadCount} unread` : ''}`}
                onClick={() => setNotifOpen(true)}
                className="relative w-10 h-10 p-0 bg-[#1F2937] border border-white/10 rounded-full flex items-center justify-center text-white flex-shrink-0 active:scale-95 transition-transform"
              >
                <Bell size={16} strokeWidth={2} />
                {/* Unread badge */}
                {unreadCount > 0 && (
                  <span
                    className="absolute -top-1 -right-1 min-w-[18px] h-[18px] bg-[#2563EB] rounded-full text-white text-[10px] font-bold leading-none flex items-center justify-center px-1"
                    aria-hidden
                  >
                    {unreadCount > 99 ? '99+' : unreadCount}
                  </span>
                )}
              </button>
            )}
            <button
              type="button"
              aria-label="Go to profile"
              onClick={() => navigate('/profile')}
              className="w-10 h-10 p-0 rounded-full flex items-center justify-center flex-shrink-0 active:scale-95 transition-transform"
            >
              <Avatar src={realAvatarSrc} fallback={realFallback} size="nav" className="border-2 border-[#2563EB]" />
            </button>
          </div>
        </header>

        {/* Notification panel */}
        <AppModal open={notifOpen} onOpenChange={setNotifOpen} title="Notifications">
          <div className="flex flex-col gap-3 pb-4">
            {notifList.length === 0 ? (
              <div className="flex flex-col items-center gap-4 py-8 text-center">
                <div className="w-12 h-12 bg-white/5 rounded-2xl flex items-center justify-center">
                  <Zap size={22} className="text-[#808BA4]" />
                </div>
                <div className="flex flex-col gap-1">
                  <span className="text-white font-bold text-base">All Caught Up</span>
                  <span className="text-[#808BA4] font-semibold text-sm leading-5">
                    No new notifications right now.
                  </span>
                </div>
              </div>
            ) : (
              <>
                {notifList.map((notif) => (
                  <NotifItem
                    key={notif.id}
                    notif={notif}
                    onTap={() => handleTap(notif)}
                    onDismiss={() => handleDismiss(notif.id)}
                  />
                ))}
                {/* Clear All */}
                <button
                  type="button"
                  onClick={handleClearAll}
                  disabled={clearing}
                  className="mt-2 text-center text-[#808BA4] hover:text-white font-semibold text-sm py-2 transition-colors disabled:opacity-40"
                >
                  {clearing ? 'Clearing…' : 'Clear All Notifications'}
                </button>
              </>
            )}
          </div>
        </AppModal>
      </>
    );
  }

  // ── Non-dashboard header ──────────────────────────────────────────────────
  return (
    <header className={`flex items-center justify-between py-2 w-full ${className}`}>
      <div className="flex items-center gap-3">
        {showLogo && <GoalsyLogo size="md" />}
        {title ? (
          <span className="text-white font-bold text-xl tracking-[-0.5px]">{title}</span>
        ) : showLogo ? (
          <span className={`text-white font-bold ${showSecureMode ? 'text-lg tracking-[-0.45px]' : 'text-xl tracking-[-0.5px]'}`}>
            GoalsyExecutive
          </span>
        ) : null}
      </div>
      {showSecureMode && (
        <div className="bg-[#111827] border border-white/10 rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-[1px] text-[#CBD5E1] flex items-center gap-2">
          <div className="w-2 h-2 bg-[#22C55E] rounded-full" />
          Secure Mode
        </div>
      )}
      {rightElement}
    </header>
  );
}
