import { useLayoutEffect } from 'react';
import { useLocation } from 'wouter';

const ROUTE_SCROLL_SELECTOR = '[data-route-scroll-container]';

function resetScrollPosition(): void {
  document.documentElement.scrollTop = 0;
  document.documentElement.scrollLeft = 0;
  document.body.scrollTop = 0;
  document.body.scrollLeft = 0;
  try {
    window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
  } catch {
    // Some native WebViews expose scrollTo with the positional signature only.
    window.scrollTo(0, 0);
  }

  document.querySelectorAll<HTMLElement>(ROUTE_SCROLL_SELECTOR).forEach((container) => {
    container.scrollTop = 0;
    container.scrollLeft = 0;
    try {
      container.scrollTo({ top: 0, left: 0, behavior: 'auto' });
    } catch {
      // Assigning scrollTop above covers browsers without Element.scrollTo.
    }
  });
}

/**
 * Routed pages should always enter at the beginning of their content.
 * The second reset runs after layout so iOS keyboard/browser restoration cannot
 * reapply the previous screen's offset after the new page has mounted.
 */
export default function RouteScrollReset() {
  const [location] = useLocation();

  useLayoutEffect(() => {
    resetScrollPosition();
    const frame = requestAnimationFrame(resetScrollPosition);
    return () => cancelAnimationFrame(frame);
  }, [location]);

  return null;
}