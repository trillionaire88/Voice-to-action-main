import { useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";

/**
 * useScrollRestore
 *
 * Saves and restores scroll position per route pathname.
 * Call this once in a page/layout component that wraps the main scroll container.
 *
 * By default it targets window scroll. Pass a `ref` to a scrollable container
 * if the page has its own scroll container instead of using window scroll.
 */

const scrollPositions = new Map();

export function useScrollRestore(containerRef = null) {
  const location = useLocation();
  const pathRef = useRef(location.pathname);

  // Save scroll position when leaving the current route
  useEffect(() => {
    const key = pathRef.current;

    return () => {
      const el = containerRef?.current;
      const y = el ? el.scrollTop : window.scrollY;
      scrollPositions.set(key, y);
    };
  }, [location.pathname, containerRef]);

  // Restore scroll position when arriving at a route
  useEffect(() => {
    pathRef.current = location.pathname;
    const saved = scrollPositions.get(location.pathname);

    if (saved !== undefined && saved > 0) {
      const restore = () => {
        const el = containerRef?.current;
        if (el) {
          el.scrollTop = saved;
        } else {
          window.scrollTo({ top: saved, behavior: "instant" });
        }
      };
      // Small RAF delay to allow React to paint first
      const raf = requestAnimationFrame(() => requestAnimationFrame(restore));
      return () => cancelAnimationFrame(raf);
    } else {
      // New route — scroll to top
      const el = containerRef?.current;
      if (el) {
        el.scrollTop = 0;
      } else {
        window.scrollTo({ top: 0, behavior: "instant" });
      }
    }
  }, [location.pathname, containerRef]);
}

/**
 * Clear scroll position for a specific path (e.g. after a hard refresh of that page)
 */
export function clearScrollPosition(pathname) {
  scrollPositions.delete(pathname);
}