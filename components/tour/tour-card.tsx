"use client";

import { MousePointerClick } from "lucide-react";
import { useEffect, useId, useLayoutEffect, useRef, useState, useSyncExternalStore } from "react";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/components/i18n-provider";
import { cn } from "@/lib/utils";
import type { TourStep } from "@/lib/tour/types";
import type { TargetRect } from "./use-tour-target";

const GAP = 12;
const GUTTER = 16;
const HEADER = 56;
/** Bottom bar (h-14) plus breathing room; the docked card sits above it. */
const DOCK_BOTTOM = 64;

function subscribeKeyboard(onChange: () => void) {
  const vv = window.visualViewport;
  vv?.addEventListener("resize", onChange);
  vv?.addEventListener("scroll", onChange);
  document.addEventListener("focusin", onChange);
  document.addEventListener("focusout", onChange);
  return () => {
    vv?.removeEventListener("resize", onChange);
    vv?.removeEventListener("scroll", onChange);
    document.removeEventListener("focusin", onChange);
    document.removeEventListener("focusout", onChange);
  };
}

/** Top offset of the visible viewport while the on-screen keyboard is open; null otherwise. */
function keyboardTop(): number | null {
  const vv = window.visualViewport;
  const el = document.activeElement;
  const typing =
    el instanceof HTMLInputElement ||
    el instanceof HTMLTextAreaElement ||
    (el instanceof HTMLElement && el.isContentEditable);
  if (!vv || !typing || vv.height > window.innerHeight - 120) return null;
  return Math.round(vv.offsetTop);
}

/** Popups that handle Esc themselves: Radix dialogs/menus/listboxes and Clerk's account menu. */
const ESC_OWNERS =
  '[role="dialog"][data-state="open"]:not([data-tour-card]), [role="menu"], [role="listbox"], .cl-userButtonPopoverCard';

/** Esc closes an open popup or cancels an inline edit before it ever skips the tour. */
function escapeBelongsElsewhere(card: HTMLElement | null): boolean {
  const el = document.activeElement;
  const inCard = !!card && !!el && card.contains(el);
  const editing =
    el instanceof HTMLInputElement ||
    el instanceof HTMLTextAreaElement ||
    el instanceof HTMLSelectElement ||
    (el instanceof HTMLElement && (el.isContentEditable || el.getAttribute("role") === "combobox"));
  return (!inCard && editing) || !!document.querySelector(ESC_OWNERS);
}

export function fillName(text: string, name: string | null): string {
  return text.replace(/,? ?\{name\}/, name ? `, ${name}` : "");
}

type Placement =
  | { mode: "center" }
  | { mode: "float"; top: number; left: number }
  | { mode: "dock-bottom" }
  | { mode: "dock-top" };

function place(rect: TargetRect | null, isDesktop: boolean, w: number, h: number): Placement {
  if (!rect) return { mode: "center" };
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  if (!isDesktop) {
    const dockTop = vh - DOCK_BOTTOM - h;
    const overlaps = rect.top + rect.height > dockTop && rect.top < vh - DOCK_BOTTOM;
    return overlaps ? { mode: "dock-top" } : { mode: "dock-bottom" };
  }
  const clampX = (x: number) => Math.min(Math.max(x, GUTTER), vw - w - GUTTER);
  const clampY = (y: number) => Math.min(Math.max(y, HEADER + GUTTER), vh - h - GUTTER);
  const below = rect.top + rect.height + GAP;
  if (below + h <= vh - GUTTER) return { mode: "float", top: below, left: clampX(rect.left + rect.width / 2 - w / 2) };
  const above = rect.top - GAP - h;
  if (above >= HEADER + GUTTER) return { mode: "float", top: above, left: clampX(rect.left + rect.width / 2 - w / 2) };
  const right = rect.left + rect.width + GAP;
  if (right + w <= vw - GUTTER) return { mode: "float", top: clampY(rect.top), left: right };
  return { mode: "float", top: clampY(rect.top), left: clampX(rect.left - GAP - w) };
}

export function TourCard({
  step,
  index,
  total,
  rect,
  isDesktop,
  displayName,
  onNext,
  onSkip,
}: {
  step: TourStep;
  index: number;
  total: number;
  rect: TargetRect | null;
  isDesktop: boolean;
  displayName: string | null;
  onNext: () => void;
  onSkip: () => void;
}) {
  const { t, locale } = useI18n();
  const titleId = useId();
  const ref = useRef<HTMLDivElement>(null);
  const primaryRef = useRef<HTMLButtonElement>(null);
  const [size, setSize] = useState({ w: 352, h: 180 });
  const kbTop = useSyncExternalStore(subscribeKeyboard, keyboardTop, () => null);
  const compact = !isDesktop && kbTop !== null;
  const isLast = index === total - 1;
  const title = fillName(step.title[locale], displayName);
  const body = fillName(step.body[locale], displayName);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const measure = () => {
      const r = el.getBoundingClientRect();
      setSize((prev) =>
        Math.abs(r.width - prev.w) > 1 || Math.abs(r.height - prev.h) > 1
          ? { w: r.width, h: r.height }
          : prev
      );
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (step.kind === "info") primaryRef.current?.focus({ preventScroll: true });
  }, [step]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape" || e.defaultPrevented) return;
      if (escapeBelongsElsewhere(ref.current)) return;
      onSkip();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onSkip]);

  const placement = place(rect, isDesktop, size.w, size.h);
  const style: React.CSSProperties =
    compact
      ? { top: (kbTop ?? 0) + 8 }
      : placement.mode === "float"
        ? { top: placement.top, left: placement.left }
        : placement.mode === "dock-bottom"
          ? { bottom: `calc(${DOCK_BOTTOM}px + env(safe-area-inset-bottom))` }
          : placement.mode === "dock-top"
            ? { top: HEADER + 8 }
            : {};

  return (
    <div
      ref={ref}
      role="dialog"
      aria-modal="false"
      aria-labelledby={titleId}
      data-tour-card
      data-tour-step={step.id}
      data-placement={compact ? "compact" : placement.mode}
      style={style}
      className={cn(
        "pointer-events-auto fixed z-[61] rounded-xl border border-border bg-popover text-popover-foreground shadow-none",
        compact
          ? "inset-x-4 flex items-center gap-3 px-4 py-2"
          : placement.mode === "center"
            ? "top-1/2 left-1/2 w-[calc(100vw-2rem)] max-w-[22rem] -translate-x-1/2 -translate-y-1/2 p-4"
            : placement.mode === "float"
              ? "w-[22rem] p-4"
              : "inset-x-4 p-4"
      )}
    >
      {compact ? (
        <>
          <p id={titleId} className="min-w-0 flex-1 truncate text-sm font-semibold">
            {title}
          </p>
          <Button variant="ghost" size="sm" className="h-11" onClick={onSkip}>
            {t("tour.skip")}
          </Button>
          {step.kind === "info" ? (
            <Button ref={primaryRef} size="sm" className="h-11" onClick={onNext}>
              {isLast ? t("tour.done") : t("tour.next")}
            </Button>
          ) : null}
        </>
      ) : (
        <>
          <p className="text-xs text-muted-foreground tabular-nums">
            {t("tour.stepOf", { current: index + 1, total })}
          </p>
          <div aria-live="polite">
            <h2 id={titleId} className="mt-1 text-base font-semibold">
              {title}
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">{body}</p>
          </div>
          {step.kind === "action" ? (
            <p className="mt-3 flex items-center gap-2 text-sm font-medium">
              <MousePointerClick className="size-4 shrink-0" aria-hidden />
              {t("tour.actionHint")}
            </p>
          ) : null}
          <div className="mt-4 flex gap-2 lg:justify-end">
            <Button variant="ghost" size="lg" className="flex-1 lg:flex-none" onClick={onSkip}>
              {t("tour.skip")}
            </Button>
            {step.kind === "info" ? (
              <Button ref={primaryRef} size="lg" className="flex-1 lg:flex-none" onClick={onNext}>
                {isLast ? t("tour.done") : t("tour.next")}
              </Button>
            ) : null}
          </div>
        </>
      )}
    </div>
  );
}
