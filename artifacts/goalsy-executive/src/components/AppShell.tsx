import { ReactNode, useRef } from 'react';
import { motion, useScroll, useTransform } from 'framer-motion';
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
  // Track scroll on the container div (not window) so useScroll works
  // correctly inside a flex column that owns overflow-y-auto.
  const scrollRef = useRef<HTMLDivElement>(null);
  const { scrollY } = useScroll({ container: scrollRef });

  // ── Header background ────────────────────────────────────────────────────
  // At rest (scrollY=0): fully transparent so the header blends into the page.
  // By scrollY=60px: opaque dark tint matching the original /85 value.
  // #0B0F17 = rgb(11,15,23)
  const headerBg = useTransform(
    scrollY,
    [0, 60],
    ['rgba(11,15,23,0)', 'rgba(11,15,23,0.85)']
  );

  // ── Bottom separator shadow ───────────────────────────────────────────────
  // Fades in a soft downward shadow that gives visual lift to the header
  // once content starts sliding underneath it.
  const headerShadow = useTransform(
    scrollY,
    [0, 50],
    ['0 2px 0px 0px rgba(0,0,0,0)', '0 4px 28px 0px rgba(0,0,0,0.5)']
  );

  // ── Hairline border ───────────────────────────────────────────────────────
  // A 1px bottom border at very low opacity reinforces the edge without
  // looking like a hard rule. Goes from invisible → visible over 40px.
  const borderOpacity = useTransform(scrollY, [0, 40], [0, 1]);

  // ── Header content micro-animations ──────────────────────────────────────
  // Subtle scale-down + slight opacity drop on the inner row so the header
  // feels like it "settles" into a compact floating bar, not a static sticker.
  const contentScale = useTransform(scrollY, [0, 80], [1, 0.97]);
  const contentOpacity = useTransform(scrollY, [0, 80], [1, 0.92]);

  return (
    <div
      ref={scrollRef}
      className={`relative min-h-[100dvh] w-full bg-[#05070A] max-w-md mx-auto flex flex-col overflow-y-auto ${className}`}
    >
      {header && (
        // pt-safe pushes the header content below the status bar / Dynamic
        // Island on notched iPhones. The background extends all the way to the
        // physical top edge (viewport-fit=cover in index.html), so the dark
        // blur fills the status bar area rather than leaving a gap.
        <motion.div
          className={`absolute top-0 left-0 right-0 z-50 px-6 flex flex-col justify-end backdrop-blur-[8px] pt-safe ${headerClassName}`}
          style={{
            backgroundColor: headerBg,
            boxShadow: headerShadow,
          }}
        >
          {/* Hairline separator — only visible once scrolled */}
          <motion.div
            className="absolute bottom-0 left-0 right-0 h-px bg-white/[0.07]"
            style={{ opacity: borderOpacity }}
          />

          {/* Inner row with micro-scale/fade */}
          <motion.div
            style={{
              height: headerHeight,
              scale: contentScale,
              opacity: contentOpacity,
            }}
            className="flex items-center"
          >
            {header}
          </motion.div>
        </motion.div>
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
