import type { MessageKey } from "@/lib/i18n/messages";
import type { OrgRole } from "@/lib/org-roles";
import { canSeeNavHref, type Permission } from "@/lib/permissions";

export type MainNavItem = {
  href: string;
  labelKey: MessageKey;
  icon: "dashboard" | "database" | "costing" | "documentation" | "operator";
};

const MAIN_NAV: readonly MainNavItem[] = [
  { href: "/", labelKey: "nav.dashboard", icon: "dashboard" },
  { href: "/database", labelKey: "nav.database", icon: "database" },
  { href: "/costing", labelKey: "nav.costing", icon: "costing" },
  { href: "/documentation", labelKey: "nav.documentation", icon: "documentation" },
];

const OPERATOR_NAV: MainNavItem = {
  href: "/operator",
  labelKey: "nav.operator",
  icon: "operator",
};

/** Main menu shared by the top bar and the bottom bar. Help is not part of it. */
export function getMainNav(
  role: OrgRole,
  permissions: readonly Permission[],
  isOperator: boolean
): MainNavItem[] {
  const items = MAIN_NAV.filter(({ href }) => canSeeNavHref(href, role, permissions));
  return isOperator ? [...items, OPERATOR_NAV] : items;
}
