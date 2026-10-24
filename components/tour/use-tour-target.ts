"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { missingTimer } from "@/lib/tour/machine";

const DESKTOP_QUERY = "(min-width: 1024px)";

function subscribeDesktop(onChange: () => void) {
  const mq = window.matchMedia(DESKTOP_QUERY);
  mq.addEventListener("change", onChange);
  return () => mq.removeEventListener("change", onChange);
}

/** True from the lg breakpoint (1024px) up; false on the server. */
export function useIsDesktop(): boolean {
  return useSyncExternalStore(
    subscribeDesktop,
    () => window.matchMedia(DESKTOP_QUERY).matches,
    () => false
  );
}

function subscribeReducedMotion(onChange: () => void) {
  const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
  mq.addEventListener("change", onChange);
  return () => mq.removeEventListener("change", onChange);
}

export function useReducedMotion(): boolean {
  return useSyncExternalStore(
    subscribeReducedMotion,
    () => window.matchMedia("(prefers-reduced-motion: reduce)").matches,
    () => false
  );
}

export type TargetRect = { top: number; left: number; width: number; height: number };

function findVisible(name: string): HTMLElement | null {
  const nodes = document.querySelectorAll<HTMLElement>(`[data-tour="${CSS.escape(name)}"]`);
  for (const node of nodes) {
    const r = node.getBoundingClientRect();
    if (r.width > 0 && r.height > 0) return node;
  }
  return null;
}

function sameRect(a: TargetRect | null, b: TargetRect | null) {
  return (
    a === b ||
    (!!a &&
      !!b &&
      a.top === b.top &&
      a.left === b.left &&
      a.width === b.width &&
      a.height === b.height)
  );
}

/**
 * Tracks the element carrying `data-tour={name}` every frame (scroll, resize,
 * dialogs opening). Calls `onMissing` once the target has been gone for 3s.
 * A null name means a centered step: no target, never missing.
 */
export function useTourTarget(
  name: string | null,
  stepKey: string,
  onMissing: () => void
): { element: HTMLElement | null; rect: TargetRect | null } {
  const [state, setState] = useState<{ key: string; element: HTMLElement | null; rect: TargetRect | null }>({
    key: stepKey,
    element: null,
    rect: null,
  });
  const reduced = useReducedMotion();

  useEffect(() => {
    if (!name) return;
    let frame = 0;
    let scrolled = false;
    let last: TargetRect | null = null;
    let lastEl: HTMLElement | null = null;
    let timer = missingTimer.start(performance.now());

    const tick = () => {
      const el = findVisible(name);
      timer = missingTimer.tick(timer, el !== null, performance.now());
      if (el) {
        if (!scrolled) {
          scrolled = true;
          const r = el.getBoundingClientRect();
          if (r.top < 64 || r.bottom > window.innerHeight * 0.6) {
            el.scrollIntoView({ block: "center", behavior: reduced ? "auto" : "smooth" });
          }
        }
        const r = el.getBoundingClientRect();
        const rect = { top: r.top, left: r.left, width: r.width, height: r.height };
        if (!sameRect(rect, last) || el !== lastEl) {
          last = rect;
          lastEl = el;
          setState({ key: stepKey, element: el, rect });
        }
      } else {
        if (last) {
          last = null;
          lastEl = null;
          setState({ key: stepKey, element: null, rect: null });
        }
        if (timer.missing) {
          onMissing();
          return;
        }
      }
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
    // onMissing is stable per step; stepKey restarts the search.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [name, stepKey, reduced]);

  if (!name || state.key !== stepKey) return { element: null, rect: null };
  return { element: state.element, rect: state.rect };
}
