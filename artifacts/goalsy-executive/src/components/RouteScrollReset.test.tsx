import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render } from '@testing-library/react';

let currentRoute = '/welcome';

vi.mock('wouter', () => ({
  useLocation: () => [currentRoute, vi.fn()],
}));

import RouteScrollReset from './RouteScrollReset';

function RouteScreen({ label }: { label: string }) {
  return (
    <div data-route-scroll-container data-testid="route-screen">
      {label}
    </div>
  );
}

describe('RouteScrollReset', () => {
  beforeEach(() => {
    currentRoute = '/welcome';
    vi.spyOn(window, 'scrollTo').mockImplementation(() => {});
    vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => {
      callback(0);
      return 1;
    });
    vi.stubGlobal('cancelAnimationFrame', vi.fn());
  });

  it('clears inherited scroll offsets on each fresh navigation', () => {
    const view = render(
      <>
        <RouteScrollReset />
        <RouteScreen label="Welcome" />
      </>,
    );
    const screenScroller = view.getByTestId('route-screen');

    screenScroller.scrollTop = 520;
    currentRoute = '/create-account';
    view.rerender(
      <>
        <RouteScrollReset />
        <RouteScreen label="Create Account" />
      </>,
    );
    expect(screenScroller.scrollTop).toBe(0);

    screenScroller.scrollTop = 340;
    currentRoute = '/signin';
    view.rerender(
      <>
        <RouteScrollReset />
        <RouteScreen label="Sign In" />
      </>,
    );
    expect(screenScroller.scrollTop).toBe(0);

    screenScroller.scrollTop = 275;
    currentRoute = '/ai-home';
    view.rerender(
      <>
        <RouteScrollReset />
        <RouteScreen label="AI Home" />
      </>,
    );
    expect(screenScroller.scrollTop).toBe(0);
    expect(window.scrollTo).toHaveBeenCalledWith({ top: 0, left: 0, behavior: 'auto' });
  });
});