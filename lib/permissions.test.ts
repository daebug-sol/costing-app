/**
 * Org RBAC permission matrix + requirePermission.
 */
import {
  canSeeNavHref,
  permissionsFor,
  requirePermission,
  roleHas,
  type Permission,
} from "@/lib/permissions";
import type { OrgRole } from "@/lib/org-roles";

const WRITE_CAPS: Permission[] = [
  "costing:write",
  "customers:write",
  "o2c:quote",
  "o2c:order",
  "o2c:delivery",
  "o2c:invoice",
  "o2c:payment",
  "db:write",
  "settings:write",
  "members:manage",
  "org:danger",
];

function writeCapsOf(role: OrgRole): Permission[] {
  return permissionsFor(role).filter((p) => WRITE_CAPS.includes(p));
}

describe("permissions matrix", () => {
  it("owner has every write cap including org:danger", () => {
    expect(writeCapsOf("owner").sort()).toEqual([...WRITE_CAPS].sort());
    expect(roleHas("owner", "org:danger")).toBe(true);
  });

  it("admin has all write caps except org:danger", () => {
    expect(roleHas("admin", "org:danger")).toBe(false);
    expect(roleHas("admin", "settings:write")).toBe(true);
    expect(roleHas("admin", "members:manage")).toBe(true);
    expect(writeCapsOf("admin")).toEqual(
      WRITE_CAPS.filter((c) => c !== "org:danger")
    );
  });

  it("sales can quote/order/customers but not costing write or invoice", () => {
    expect(writeCapsOf("sales").sort()).toEqual(
      ["customers:write", "o2c:quote", "o2c:order"].sort()
    );
    expect(roleHas("sales", "costing:write")).toBe(false);
    expect(roleHas("sales", "o2c:invoice")).toBe(false);
    expect(roleHas("sales", "o2c:payment")).toBe(false);
  });

  it("pm can costing:write only among write caps", () => {
    expect(writeCapsOf("pm")).toEqual(["costing:write"]);
  });

  it("ppic can delivery + db write", () => {
    expect(writeCapsOf("ppic").sort()).toEqual(
      ["o2c:delivery", "db:write"].sort()
    );
  });

  it("ceo and member have no write caps", () => {
    expect(writeCapsOf("ceo")).toEqual([]);
    expect(writeCapsOf("member")).toEqual([]);
    expect(roleHas("ceo", "dashboard:read")).toBe(true);
    expect(roleHas("member", "costing:read")).toBe(true);
  });

  it("all roles have dashboard/costing/db read", () => {
    const roles: OrgRole[] = [
      "owner",
      "admin",
      "sales",
      "pm",
      "ppic",
      "ceo",
      "member",
    ];
    for (const role of roles) {
      expect(roleHas(role, "dashboard:read")).toBe(true);
      expect(roleHas(role, "costing:read")).toBe(true);
      expect(roleHas(role, "db:read")).toBe(true);
    }
  });
});

describe("requirePermission", () => {
  it("returns null when allowed", () => {
    expect(requirePermission("pm", "costing:write")).toBeNull();
    expect(requirePermission("sales", "o2c:quote")).toBeNull();
  });

  it("returns 403 FORBIDDEN when denied", async () => {
    const res = requirePermission("member", "settings:write");
    expect(res).not.toBeNull();
    if (!res) return;
    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body).toEqual({
      code: "FORBIDDEN",
      error: "Insufficient permissions",
    });
  });

  it("ceo cannot invoice POST-equivalent", () => {
    expect(requirePermission("ceo", "o2c:invoice")).not.toBeNull();
  });
});

describe("canSeeNavHref", () => {
  it("hides pembayaran for sales", () => {
    const perms = permissionsFor("sales");
    expect(canSeeNavHref("/payments", "sales", perms)).toBe(false);
    expect(canSeeNavHref("/documentation", "sales", perms)).toBe(true);
    expect(canSeeNavHref("/customers", "sales", perms)).toBe(true);
  });

  it("hides invoice create path for pm", () => {
    const perms = permissionsFor("pm");
    expect(canSeeNavHref("/invoices", "pm", perms)).toBe(false);
    expect(canSeeNavHref("/costing", "pm", perms)).toBe(true);
  });

  it("shows invoice/payments to ceo as viewer", () => {
    const perms = permissionsFor("ceo");
    expect(canSeeNavHref("/invoices", "ceo", perms)).toBe(true);
    expect(canSeeNavHref("/payments", "ceo", perms)).toBe(true);
    expect(canSeeNavHref("/customers", "ceo", perms)).toBe(true);
  });

  it("member sees costing/database but not pelanggan", () => {
    const perms = permissionsFor("member");
    expect(canSeeNavHref("/costing", "member", perms)).toBe(true);
    expect(canSeeNavHref("/database", "member", perms)).toBe(true);
    expect(canSeeNavHref("/customers", "member", perms)).toBe(false);
    expect(canSeeNavHref("/sales-orders", "member", perms)).toBe(false);
  });
});
