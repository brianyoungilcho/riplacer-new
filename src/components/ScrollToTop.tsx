import { useEffect, useRef } from 'react';
import { useLocation, useNavigationType } from 'react-router-dom';

export function ScrollToTop() {
  const location = useLocation();
  const navigationType = useNavigationType();
  const prevPathnameRef = useRef<string | null>(null);

  // Disable browser's automatic scroll restoration to have full control
  useEffect(() => {
    if ('scrollRestoration' in history) {
      history.scrollRestoration = 'manual';
    }
  }, []);

  useEffect(() => {
    const prevPathname = prevPathnameRef.current;
    prevPathnameRef.current = location.pathname;

    // Skip if pathname hasn't changed (same-page navigation like anchor links on same page)
    if (prevPathname === location.pathname) {
      return;
    }

    // For hash navigation, scroll to the element
    if (location.hash) {
      const id = decodeURIComponent(location.hash.replace('#', ''));
      const el = document.getElementById(id);
      if (el) {
        el.scrollIntoView({ block: 'start' });
        return;
      }
    }

    // Scroll to top immediately (synchronously)
    window.scrollTo(0, 0);

    // Also scroll after paint and with delays to fight browser scroll restoration
    const scrollToTop = () => window.scrollTo(0, 0);

    requestAnimationFrame(scrollToTop);
    const t1 = setTimeout(scrollToTop, 0);
    const t2 = setTimeout(scrollToTop, 50);
    const t3 = setTimeout(scrollToTop, 100);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
    };
  }, [location.pathname, location.hash, navigationType]);

  return null;
}
