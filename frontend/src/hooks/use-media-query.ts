import { useSyncExternalStore } from 'react';

/**
 * Subscribes to a CSS media query.
 *
 * Uses useSyncExternalStore rather than useState + useEffect so the first
 * render already reflects the real match. The previous implementation seeded
 * state to `false` and corrected it in an effect, which meant every mount
 * rendered the desktop branch for one frame before snapping to mobile. It also
 * listed `matches` in its own dependency array, so each change tore down and
 * re-added the listener.
 */
export const useMediaQuery = (query: string) => {
  const subscribe = (onStoreChange: () => void) => {
    const media = window.matchMedia(query);
    media.addEventListener('change', onStoreChange);
    return () => media.removeEventListener('change', onStoreChange);
  };

  const getSnapshot = () => window.matchMedia(query).matches;

  // Server/prerender has no matchMedia. Reporting "not matching" keeps the
  // desktop layout as the non-JS default.
  const getServerSnapshot = () => false;

  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
};
