"use client";

import { useEffect, useRef, useState } from "react";

/** Navbar height matches `h-14` in layout. */
const NAVBAR_OFFSET_PX = 56;

/**
 * Returns true when the page header (incl. centered toolbar) has scrolled away
 * and the compact sticky toolbar should appear.
 */
export function useDashboardToolbarStuck() {
  const sentinelRef = useRef<HTMLDivElement>(null);
  const [isStuck, setIsStuck] = useState(false);

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsStuck(!entry.isIntersecting);
      },
      {
        root: null,
        rootMargin: `-${NAVBAR_OFFSET_PX}px 0px 0px 0px`,
        threshold: 0,
      }
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, []);

  return { sentinelRef, isStuck };
}
