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
  // The scroll ref lives on the CONTENT div, not the root.
  // This way the header is never inside the scroll container — it stays
  // pinned at the top in normal flex flow — and useScroll correctly reads
  // the element that actually moves.
  const scrollRef = useRef<HTMLDivElement>(null);
  const { scrollY } = useScroll({ container: scrollRef });

  // ── Header background ────────────────────────────────────────────────────
  // At rest (scrollY=0): fully transparent — header blends into the dark page.
  // By scrollY=60px: the standard dark tint (#0B0F17 @ 85% opacity) fades in.
  const headerBg = useTransform(
    scrollY,
    [0, 60],
    ['rgba(11,15,23,0)', 'rgba(11,15,23,0.85)']
  );

  // ── Lift shadow ───────────────────────────────────────────────────────────
  // A soft downward shadow that signals content is sliding beneath the header.
  const headerShadow = useTransform(
    scrollY,
    [0, 50],
    ['0 2px 0px 0px rgba(0,0,0,0)', '0 4px 28px 0px rgba(0,0,0,0.5)']
  );

  // ── Hairline separator ────────────────────────────────────────────────────
  const borderOpacity = useTransform(scrollY, [0, 40], [0, 1]);

  // ── Header content micro-animations ──────────────────────────────────────
  // Subtle scale + opacity shift so the header "settles" as you scroll,
  // rather than feeling like a flat sticker on top of the page.
  const contentScale = useTransform(scrollY, [0, 80], [1, 0.97]);
  const contentOpacity = useTransform(scrollY, [0, 80], [1, 0.92]);

  return (
    // Root: fixed viewport height, flex column, no overflow of its own.
    // BottomNav is position:fixed so it sits outside this flow regardless.
    <div className={`h-[100dvh] w-full bg-[#05070A] max-w-md mx-auto flex flex-col ${className}`}>

      {header && (
        // Header lives at the TOP of the flex column — not inside the scroll
        // container — so it never moves as content scrolls beneath it.
        // pt-safe pushes the header row below the status bar / Dynamic Island.
        // The background extends all the way to the physical top edge because
        // the root div starts at 0 (viewport-fit=cover in index.html).
        <motion.div
          className={`shrink-0 relative px-6 flex flex-col justify-end backdrop-blur-[8px] pt-safe ${headerClassName}`}
          style={{
            backgroundColor: headerBg,
            boxShadow: headerShadow,
          }}
        >
          {/* Hairline bottom edge — fades in once content scrolls under */}
          <motion.div
            className="absolute bottom-0 left-0 right-0 h-px bg-white/[0.07]"
            style={{ opacity: borderOpacity }}
          />

          {/* Inner row with the micro scale/fade */}
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

      {/* Scroll container: flex-1 so it fills everything below the header.
          paddingBottom gives breathing room above the fixed BottomNav
          (84px nav + 92px extra) plus the home-indicator safe area. */}
      <div
        ref={scrollRef}
        className={`flex-1 overflow-y-auto px-6 flex flex-col ${contentClassName}`}
        style={showBottomNav
          ? { paddingBottom: 'calc(176px + var(--safe-bottom))' }
          : { paddingBottom: 'calc(40px + var(--safe-bottom))' }
        }
      >
        {children}
      </div>

      {showBottomNav && <BottomNav activeTab={activeTab} />}
    </div>
  );
}
