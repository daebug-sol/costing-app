/** App-owned org roles (not Clerk org roles). Stored on OrganizationMember.role. */

export const ORG_ROLES = [
  "owner",
  "admin",
  "sales",
  "pm",
  "ppic",
  "ceo",
  "member",
] as const;

export type OrgRole = (typeof ORG_ROLES)[number];

export const ORG_ROLE_LABELS: Record<OrgRole, string> = {
  owner: "Owner",
  admin: "Admin",
  sales: "Sales",
  pm: "Project Manager",
  ppic: "PPIC",
  ceo: "CEO",
  member: "Member",
};

/** Roles an admin may assign (cannot create owners). */
export const ADMIN_ASSIGNABLE_ROLES: readonly OrgRole[] = [
  "admin",
  "sales",
  "pm",
  "ppic",
  "ceo",
  "member",
] as const;

export function isOrgRole(value: unknown): value is OrgRole {
  return (
    typeof value === "string" &&
    (ORG_ROLES as readonly string[]).includes(value)
  );
}

/** Invalid / unknown → member (read-only default). */
export function parseOrgRole(value: unknown): OrgRole {
  return isOrgRole(value) ? value : "member";
}
