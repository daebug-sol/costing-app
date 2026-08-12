/**
 * Route smoke: mutate APIs enforce requirePermission via guard.role.
 */
import { PUT as putSettings } from "@/app/api/settings/route";
import { POST as postProjects } from "@/app/api/projects/route";
import { POST as postQuotations } from "@/app/api/quotations/route";
import { POST as postInvoices } from "@/app/api/invoices/route";
import { POST as postMaterials } from "@/app/api/materials/route";
import { POST as postDelivery } from "@/app/api/sales-orders/[id]/deliveries/route";
import { guardApiRoute } from "@/lib/api-guard";
import type { OrgRole } from "@/lib/org-roles";

jest.mock("@/lib/api-guard", () => ({
  guardApiRoute: jest.fn(),
}));

jest.mock("@/lib/prisma", () => ({
  prisma: {
    costingProject: { create: jest.fn(), count: jest.fn() },
    quotation: { create: jest.fn(), count: jest.fn() },
    invoice: { create: jest.fn() },
    appSettings: { update: jest.fn() },
    materialPrice: { create: jest.fn() },
    salesOrder: { findFirst: jest.fn() },
    deliveryOrder: { create: jest.fn(), findMany: jest.fn() },
  },
}));

jest.mock("@/lib/tenant-queries", () => ({
  getOrCreateSettings: jest.fn(async () => ({
    id: "settings-1",
    companyName: "Test",
    ppnRate: 11,
    validityDays: 14,
    paymentTerms: "DP",
    deliveryTerms: "Ex-work",
    warrantyTerms: "12m",
    termsConditions: "",
    quoPrefix: "QUO",
  })),
  tenantWhere: {
    projects: (orgId: string) => ({ organizationId: orgId }),
    invoices: (orgId: string) => ({ organizationId: orgId }),
  },
}));

jest.mock("@/lib/org-entitlements", () => ({
  getOrgEntitlements: jest.fn(async () => ({
    plan: "standard",
    modules: { ahu: false },
  })),
  assertWithinPlanLimits: jest.fn(async () => ({ ok: true })),
}));

jest.mock("@/lib/org-modules", () => ({
  requireAhuModule: jest.fn(async () => ({ ok: true })),
}));

jest.mock("@/lib/tenant-context", () => ({
  requireSalesOrderInOrg: jest.fn(async () => ({ ok: true })),
}));

jest.mock("@/lib/database-folders", () => ({
  resolveAhuDatasetFileId: jest.fn(async () => null),
}));

jest.mock("@/lib/doc-numbering", () => ({
  nextDocumentNumber: jest.fn(async () => "DO-001"),
}));

const mockedGuard = guardApiRoute as jest.MockedFunction<typeof guardApiRoute>;

function asRole(role: OrgRole) {
  mockedGuard.mockResolvedValue({
    userId: "u1",
    orgId: "org-a",
    role,
  });
}

async function expectNotForbidden(res: Response) {
  if (res.status === 403) {
    const body = await res.json();
    expect(body.code).not.toBe("FORBIDDEN");
  }
}

describe("RBAC mutate gates", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("member cannot PUT /api/settings", async () => {
    asRole("member");
    const res = await putSettings(
      new Request("http://localhost/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ companyName: "X" }),
      })
    );
    expect(res.status).toBe(403);
    expect(await res.json()).toMatchObject({ code: "FORBIDDEN" });
  });

  it("member cannot POST /api/projects", async () => {
    asRole("member");
    const res = await postProjects(
      new Request("http://localhost/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: "P1" }),
      })
    );
    expect(res.status).toBe(403);
    expect(await res.json()).toMatchObject({ code: "FORBIDDEN" });
  });

  it("sales can quotation POST (not FORBIDDEN)", async () => {
    asRole("sales");
    const { prisma } = await import("@/lib/prisma");
    (prisma.quotation.create as jest.Mock).mockResolvedValue({
      id: "q1",
      quoNumber: "QUO-001",
    });
    const res = await postQuotations();
    await expectNotForbidden(res);
  });

  it("pm can project POST (not FORBIDDEN)", async () => {
    asRole("pm");
    const { prisma } = await import("@/lib/prisma");
    (prisma.costingProject.create as jest.Mock).mockResolvedValue({
      id: "p1",
      name: "PM Project",
    });
    const res = await postProjects(
      new Request("http://localhost/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: "PM Project" }),
      })
    );
    await expectNotForbidden(res);
  });

  it("ppic can db write / delivery (not FORBIDDEN)", async () => {
    asRole("ppic");
    const { prisma } = await import("@/lib/prisma");
    (prisma.materialPrice.create as jest.Mock).mockResolvedValue({ id: "m1" });
    const matRes = await postMaterials(
      new Request("http://localhost/api/materials", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: "Steel", category: "plate" }),
      })
    );
    await expectNotForbidden(matRes);

    const doRes = await postDelivery(
      new Request("http://localhost/api/sales-orders/so1/deliveries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      }),
      { params: Promise.resolve({ id: "so1" }) }
    );
    // Empty items → 400 after permission check (not FORBIDDEN)
    await expectNotForbidden(doRes);
    expect(doRes.status).toBe(400);
  });

  it("ceo cannot POST /api/invoices", async () => {
    asRole("ceo");
    const res = await postInvoices(
      new Request("http://localhost/api/invoices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      })
    );
    expect(res.status).toBe(403);
    expect(await res.json()).toMatchObject({ code: "FORBIDDEN" });
  });
});
