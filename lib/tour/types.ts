import type { Permission } from "@/lib/permissions";

export const TOUR_KEYS = [
  "welcome",
  "costing",
  "dashboard",
  "database",
  "documentation",
  "customers",
  "sales-orders",
  "invoices",
  "payments",
  "settings",
  "help",
] as const;

export type TourKey = (typeof TOUR_KEYS)[number];

export function isTourKey(value: unknown): value is TourKey {
  return typeof value === "string" && (TOUR_KEYS as readonly string[]).includes(value);
}

/** Tutorial copy lives next to its steps, in both UI languages. */
export type Localized = { id: string; en: string };

export type TourStatus = "done" | "skipped";

export type TourProgress = Partial<Record<TourKey, TourStatus>>;

export type TourContext = {
  permissions: Permission[];
  modules: { ahu: boolean };
  isDesktop: boolean;
};

export type TourStep = {
  id: string;
  kind: "info" | "action";
  /** Value of the target's data-tour attribute; none = centered card. */
  target?: string;
  /** Target used below lg (e.g. a bottom bar item). */
  targetMobile?: string;
  title: Localized;
  body: Localized;
  /** Action step: advances when this tourEvent name is emitted... */
  advanceOn?: string;
  /** ...or when the pathname starts with this prefix. */
  advanceOnRoute?: string;
  /** Step exists only when this returns true (e.g. AHU module enabled). */
  when?: (ctx: TourContext) => boolean;
};

export type TourDefinition = {
  key: TourKey;
  /** Route that triggers the invite card; welcome has none. */
  route?: string;
  permission?: Permission;
  invite?: { title: Localized; minutes: number };
  steps: TourStep[];
};
