"use client";

import { useEffect, useRef, useState } from "react";

export type ContainerWidthTier = "compact" | "cozy" | "wide";

const COMPACT_MAX = 520;
const COZY_MAX = 900;

export function getContainerWidthTier(width: number): ContainerWidthTier {
  if (width < COMPACT_MAX) return "compact";
  if (width < COZY_MAX) return "cozy";
  return "wide";
}

export function useContainerWidth<T extends HTMLElement = HTMLDivElement>() {
  const ref = useRef<T>(null);
  const [width, setWidth] = useState(640);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    const update = (nextWidth: number) => {
      setWidth(nextWidth > 0 ? nextWidth : 640);
    };

    update(element.getBoundingClientRect().width);

    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (entry) update(entry.contentRect.width);
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  const tier = getContainerWidthTier(width);

  return {
    ref,
    width,
    tier,
    isCompact: tier === "compact",
    isCozy: tier === "cozy",
    isWide: tier === "wide",
  };
}
