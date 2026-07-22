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
  // scrollRef lives on the content div — that's the element that actually
  // scrolls. The header is absolutely overlaid on top, so it never moves.
  const scrollRef = useRef<HTMLDivElement>(null);
  const { scrollY } = useScroll({ container: scrollRef });

  // ── Header background ────────────────────────────────────────────────────
  // scrollY = 0:  fully transparent — header blends with the page behind it.
  // scrollY ≥ 60: standard dark tint (#0B0F17 @ 85%) fades in as content
  //               slides underneath, creating the frosted-glass separation.
  const headerBg = useTransform(
    scrollY,
    [0, 60],
    ['rgba(11,15,23,0)', 'rgba(11,15,23,0.85)']
  );

  // ── Lift shadow ───────────────────────────────────────────────────────────
  // Soft downward shadow signals content is actively scrolling under the bar.
  const headerShadow = useTransform(
    scrollY,
    [0, 50],
    ['0 2px 0px 0px rgba(0,0,0,0)', '0 4px 28px 0px rgba(0,0,0,0.5)']
  );

  // ── Hairline separator ────────────────────────────────────────────────────
  const borderOpacity = useTransform(scrollY, [0, 40], [0, 1]);

  // ── Header content micro-animations ──────────────────────────────────────
  // Subtle scale + opacity so the header "settles" rather than sitting
  // like a flat sticker once content is flowing beneath it.
  const contentScale = useTransform(scrollY, [0, 80], [1, 0.97]);
  const contentOpacity = useTransform(scrollY, [0, 80], [1, 0.92]);

  return (
    // Root: fixed viewport height, clipped. The scroll lives on the inner
    // content div — not here — so the header overlay stays perfectly still.
    <div className={`h-[100dvh] relative w-full bg-[#05070A] max-w-md mx-auto overflow-hidden ${className}`}>

      {/* ── Scrollable content ──────────────────────────────────────────────
          Fills the entire root div (inset-0) and owns the overflow-y-auto.
          padding-top pushes the first content item below the transparent
          header so it's visible on load; as the user scrolls, content rises
          and passes behind the blurred header overlay above. */}
      <div
        ref={scrollRef}
        className={`absolute inset-0 overflow-y-auto px-6 flex flex-col ${contentClassName}`}
        style={showBottomNav
          ? {
              paddingTop: `calc(${headerHeight}px + var(--safe-top))`,
              paddingBottom: 'calc(176px + var(--safe-bottom))',
            }
          : {
              paddingTop: `calc(${headerHeight}px + var(--safe-top))`,
              paddingBottom: 'calc(40px + var(--safe-bottom))',
            }
        }
      >
        {children}
      </div>

      {/* ── Header overlay ──────────────────────────────────────────────────
          Absolutely positioned on top of the content div so it never scrolls.
          Starts fully transparent so the content behind it is readable at the
          top of the page; animates to opaque as scrollY increases.
          pt-safe = pushes the header row below the status bar / notch.
          backdrop-blur creates the frosted-glass "content under glass" effect. */}
      {header && (
        <motion.div
          className={`absolute top-0 left-0 right-0 z-50 px-6 flex flex-col justify-end backdrop-blur-[8px] pt-safe ${headerClassName}`}
          style={{
            backgroundColor: headerBg,
            boxShadow: headerShadow,
          }}
        >
          {/* Hairline bottom edge — only visible once scrolled */}
          <motion.div
            className="absolute bottom-0 left-0 right-0 h-px bg-white/[0.07]"
            style={{ opacity: borderOpacity }}
          />

          {/* Inner row — subtle scale/fade on scroll */}
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

      {showBottomNav && <BottomNav activeTab={activeTab} />}
    </div>
  );
}
