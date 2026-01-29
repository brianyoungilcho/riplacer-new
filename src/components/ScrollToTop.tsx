import { useEffect, useRef } from 'react';
import { useLocation, useNavigationType } from 'react-router-dom';

export function ScrollToTop() {
  const location = useLocation();
  const navigationType = useNavigationType();
  const prevKeyRef = useRef<string | null>(null);
  const prevPathnameRef = useRef<string | null>(null);

  useEffect(() => {
    const loadPositions = (): Record<string, number> => {
      try {
        const raw = sessionStorage.getItem('riplacer_scroll_positions');
        return raw ? (JSON.parse(raw) as Record<string, number>) : {};
      } catch {
        return {};
      }
    };

    const savePositions = (positions: Record<string, number>) => {
      try {
        sessionStorage.setItem('riplacer_scroll_positions', JSON.stringify(positions));
      } catch {
        // ignore storage failures
      }
    };

    const positions = loadPositions();

    // Persist scroll position for the page we're leaving.
    if (prevKeyRef.current) {
      positions[prevKeyRef.current] = window.scrollY ?? 0;
      savePositions(positions);
    }

    prevKeyRef.current = location.key;
    const prevPathname = prevPathnameRef.current;
    prevPathnameRef.current = location.pathname;

    const doScroll = () => {
      // Skip scroll restoration if pathname hasn't changed (same-page link click).
      // This prevents scroll hijacking when clicking logo/links that preventDefault on same page.
      if (prevPathname === location.pathname) {
        return;
      }

      // Back/forward should restore prior scroll position.
      if (navigationType === 'POP') {
        const y = positions[location.key];
        window.scrollTo({ top: typeof y === 'number' ? y : 0, left: 0, behavior: 'auto' });
        return;
      }

      // Hash navigation should scroll to the element.
      if (location.hash) {
        const id = decodeURIComponent(location.hash.replace('#', ''));
        const el = document.getElementById(id);
        if (el) {
          el.scrollIntoView({ block: 'start' });
          return;
        }
      }

      // Default: new navigation => top.
      window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
    };

    // Run after React paints, and again on the next tick (covers lazy-loaded route content).
    requestAnimationFrame(doScroll);
    setTimeout(doScroll, 0);
  }, [location.key, location.hash, navigationType]);

  return null;
}
