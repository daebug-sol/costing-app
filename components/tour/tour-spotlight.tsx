"use client";

import type { TargetRect } from "./use-tour-target";

const PAD = 6;

/**
 * Dims the page and blocks clicks everywhere except a hole over the target,
 * so on action steps the highlighted element stays usable.
 */
export function TourSpotlight({ rect }: { rect: TargetRect | null }) {
  // Pointer-down must not reach document listeners (e.g. a dialog's outside-dismiss).
  const block = (e: React.PointerEvent) => e.stopPropagation();
  const shade = "fixed z-[60] bg-black/50 motion-safe:transition-all";

  if (!rect) {
    return <div aria-hidden className={`${shade} inset-0`} onPointerDown={block} />;
  }

  const top = Math.max(rect.top - PAD, 0);
  const left = Math.max(rect.left - PAD, 0);
  const right = rect.left + rect.width + PAD;
  const bottom = rect.top + rect.height + PAD;

  return (
    <div aria-hidden data-tour-spotlight>
      <div className={shade} style={{ top: 0, left: 0, right: 0, height: top }} onPointerDown={block} />
      <div className={shade} style={{ top: bottom, left: 0, right: 0, bottom: 0 }} onPointerDown={block} />
      <div className={shade} style={{ top, left: 0, width: left, height: bottom - top }} onPointerDown={block} />
      <div className={shade} style={{ top, left: right, right: 0, height: bottom - top }} onPointerDown={block} />
      <div
        data-tour-hole
        className="pointer-events-none fixed z-[60] rounded-lg ring-2 ring-primary"
        style={{ top, left, width: right - left, height: bottom - top }}
      />
    </div>
  );
}
