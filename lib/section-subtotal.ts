import { finite } from "@/lib/calculations";

/** Effective category price for rollup / display: override wins over calculated. */
export function effectiveSectionSubtotal(section: {
  subtotal: number;
  overrideSubtotal?: number | null;
}): number {
  const override = section.overrideSubtotal;
  if (override != null && Number.isFinite(override)) {
    return finite(override, 0);
  }
  return finite(section.subtotal, 0);
}

export function sectionHasPriceOverride(section: {
  overrideSubtotal?: number | null;
}): boolean {
  return (
    section.overrideSubtotal != null && Number.isFinite(section.overrideSubtotal)
  );
}
