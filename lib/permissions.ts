import { NextResponse } from "next/server";
import type { OrgRole } from "@/lib/org-roles";

export const PERMISSIONS = [
  "dashboard:read",
  "costing:read",
  "costing:write",
  "customers:write",
  "o2c:quote",
  "o2c:order",
  "o2c:delivery",
  "o2c:invoice",
  "o2c:payment",
  "db:read",
  "db:write",
  "settings:write",
  "members:manage",
  "org:danger",
] as const;

export type Permission = (typeof PERMISSIONS)[number];

const ALL: readonly Permission[] = PERMISSIONS;

const READ_CAPS: readonly Permission[] = [
  "dashboard:read",
  "costing:read",
  "db:read",
] as const;

/** Fixed v1 matrix — see docs/PRODUCT-PACKAGING.md. */
const MATRIX: Record<OrgRole, readonly Permission[]> = {
  owner: ALL,
  admin: ALL.filter((p) => p !== "org:danger"),
  sales: [
    ...READ_CAPS,
    "customers:write",
    "o2c:quote",
    "o2c:order",
  ],
  pm: [...READ_CAPS, "costing:write"],
  ppic: [...READ_CAPS, "o2c:delivery", "db:write"],
  ceo: READ_CAPS,
  member: READ_CAPS,
};

export function permissionsFor(role: OrgRole): Permission[] {
  return [...MATRIX[role]];
}

export function roleHas(role: OrgRole, cap: Permission): boolean {
  return MATRIX[role].includes(cap);
}

/**
 * Returns a 403 response when the role lacks `cap`; otherwise null.
 * Use after guardApiRoute on mutate handlers.
 */
export function requirePermission(
  role: OrgRole,
  cap: Permission
): NextResponse | null {
  if (roleHas(role, cap)) return null;
  return NextResponse.json(
    { code: "FORBIDDEN", error: "Insufficient permissions" },
    { status: 403 }
  );
}

/** CEO can view ops modules without write caps; owner/admin already have writes. */
function isOpsViewer(role: OrgRole): boolean {
  return role === "ceo" || role === "owner" || role === "admin";
}

/**
 * Navbar visibility (locked mapping). Prefer permission checks;
 * ceo/owner/admin unlock read-oriented O2C nav without write caps.
 */
export function canSeeNavHref(
  href: string,
  role: OrgRole,
  permissions: readonly Permission[]
): boolean {
  const has = (cap: Permission) => permissions.includes(cap);

  switch (href) {
    case "/":
    case "/help":
      return true;
    case "/database":
      return has("db:read");
    case "/costing":
      return has("costing:read");
    case "/documentation":
      return has("o2c:quote") || has("costing:read");
    case "/customers":
      return has("customers:write") || isOpsViewer(role);
    case "/sales-orders":
      return has("o2c:order") || isOpsViewer(role);
    case "/invoices":
      return has("o2c:invoice") || isOpsViewer(role);
    case "/payments":
      return has("o2c:payment") || isOpsViewer(role);
    default:
      return true;
  }
}
