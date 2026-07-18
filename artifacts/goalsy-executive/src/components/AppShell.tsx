import { ReactNode } from 'react';
import BottomNav from './BottomNav';

interface AppShellProps {
  children: ReactNode;
  header?: ReactNode;
  showBottomNav?: boolean;
  activeTab?: 'today' | 'goals' | 'calendar' | 'ai' | 'profile';
  className?: string;
  headerClassName?: string;
  contentClassName?: string;
  /**
   * Height (px) of the header content area that sits *below* the safe-area
   * inset (i.e. below the notch / Dynamic Island). Defaults to 72.
   * Drives both the inner header div height and the content's paddingTop so
   * they stay in sync — changing one here automatically updates the other.
   */
  headerHeight?: number;
}

export default function AppShell({
  children,
  header,
  showBottomNav = true,
  activeTab = 'today',
  className = '',
  headerClassName = '',
  contentClassName = '',
  headerHeight = 72,
}: AppShellProps) {
  return (
    <div className={`relative min-h-[100dvh] w-full bg-[#05070A] max-w-md mx-auto flex flex-col overflow-y-auto ${className}`}>
      {header && (
        // pt-safe pushes the header content below the status bar / Dynamic
        // Island on notched iPhones. The background extends all the way to the
        // physical top edge (viewport-fit=cover in index.html), so the dark
        // blur fills the status bar area rather than leaving a gap.
        <div className={`absolute top-0 left-0 right-0 z-50 px-6 flex flex-col justify-end bg-[#0B0F17]/85 backdrop-blur-[8px] pt-safe ${headerClassName}`}>
          <div style={{ height: headerHeight }} className="flex items-center">
            {header}
          </div>
        </div>
      )}
      {/* Content padding:
          - top: headerHeight + safe-area-inset-top (status bar on notched devices)
          - bottom: 176px (bottom nav 84px + extra breathing room 92px)
                    + safe-area-inset-bottom (home indicator on iPhone/Android)
          On desktop/non-notch both env() values are 0px so nothing changes. */}
      <div
        className={`px-6 flex-1 flex flex-col ${contentClassName}`}
        style={showBottomNav
          ? { paddingTop: `calc(${headerHeight}px + var(--safe-top))`, paddingBottom: 'calc(176px + var(--safe-bottom))' }
          : { paddingBottom: 'calc(40px + var(--safe-bottom))' }
        }
      >
        {children}
      </div>
      {showBottomNav && <BottomNav activeTab={activeTab} />}
    </div>
  );
}
