/**
 * Cross-tenant isolation check against a real (local) Postgres.
 *
 * Creates two throwaway organizations, seeds org B, then calls the real API
 * route handlers as org A and asserts that A can neither see, change nor
 * delete B's data. Every case has a positive control (B can use its own
 * data) so a green run cannot be vacuous.
 *
 *   npm run db:up && npm run db:migrate
 *   npm run test:isolation
 *
 * Refuses to run unless DATABASE_URL points at localhost.
 */
import { buildColumnId } from "@/lib/custom-db";
import { prisma } from "@/lib/prisma";

import { GET as itemsGET } from "@/app/api/database/items/route";
import {
  GET as filesGET,
  POST as filesPOST,
} from "@/app/api/database/files/route";
import { POST as customDbPOST } from "@/app/api/custom-db/route";
import { POST as customRowsPOST } from "@/app/api/custom-db/rows/route";
import { PATCH as customCellsPATCH } from "@/app/api/custom-db/cells/route";
import { DELETE as customRowDELETE } from "@/app/api/custom-db/rows/[rowId]/route";
import { GET as materialsGET } from "@/app/api/materials/route";
import {
  PUT as materialPUT,
  DELETE as materialDELETE,
} from "@/app/api/materials/[id]/route";
import { GET as profilesGET } from "@/app/api/profiles/route";
import {
  PUT as profilePUT,
  DELETE as profileDELETE,
} from "@/app/api/profiles/[id]/route";
import { GET as componentsGET } from "@/app/api/components/route";
import {
  PUT as componentPUT,
  DELETE as componentDELETE,
} from "@/app/api/components/[id]/route";
import { GET as customersGET } from "@/app/api/customers/route";
import {
  GET as customerGET,
  PUT as customerPUT,
  DELETE as customerDELETE,
} from "@/app/api/customers/[id]/route";
import { GET as projectsGET } from "@/app/api/projects/route";
import {
  GET as projectGET,
  PUT as projectPUT,
  DELETE as projectDELETE,
} from "@/app/api/projects/[id]/route";
import { GET as quotationsGET } from "@/app/api/quotations/route";
import {
  GET as quotationGET,
  PUT as quotationPUT,
  DELETE as quotationDELETE,
} from "@/app/api/quotations/[id]/route";
import { POST as bulkDeletePOST } from "@/app/api/quotations/bulk-delete/route";
import { POST as manualItemsPOST } from "@/app/api/projects/[id]/segments/[segmentId]/manual/groups/[groupId]/items/route";

const A = "iso_org_a";
const B = "iso_org_b";
const env = process.env as Record<string, string | undefined>;

/** Run `fn` as the given organization (auth-bypass reads TEST_ORG_ID per request). */
async function as<T>(orgId: string, fn: () => Promise<T>): Promise<T> {
  env.TEST_ORG_ID = orgId;
  return fn();
}

const req = (url: string, method = "GET", body?: unknown) =>
  new Request(`http://localhost${url}`, {
    method,
    headers: { "content-type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });

const ctx = <T extends Record<string, string>>(params: T) => ({
  params: Promise.resolve(params),
});

async function text(res: Response): Promise<string> {
  return res.text();
}

// ids of the rows seeded for org B (the "victim")
const b: Record<string, string> = {};
// ids seeded for org A (the "attacker"), used for controls
const a: Record<string, string> = {};

beforeAll(async () => {
  const url = new URL(env.DATABASE_URL ?? "");
  if (!["localhost", "127.0.0.1", "::1", "[::1]"].includes(url.hostname)) {
    throw new Error(
      `Refusing to run isolation tests against non-local database host "${url.hostname}"`
    );
  }
  env.AUTH_BYPASS = "true";
  env.TEST_USER_ID = "iso-user";
  env.TEST_ORG_ROLE = "owner";
  delete env.VERCEL;

  await prisma.organization.deleteMany({ where: { id: { in: [A, B] } } });
  for (const [id, slug] of [
    [A, "iso-org-a"],
    [B, "iso-org-b"],
  ]) {
    await prisma.organization.create({
      data: { id, name: slug, slug, ahuModuleEnabled: true },
    });
  }

  // --- org B (victim) ---
  const bFolder = await prisma.databaseFolder.create({
    data: { organizationId: B, scope: "custom", name: "B folder" },
  });
  const bAhuFolder = await prisma.databaseFolder.create({
    data: { organizationId: B, scope: "ahu", name: "B ahu folder" },
  });
  await prisma.ahuDatasetFile.create({
    data: { folderId: bAhuFolder.id, kind: "materials", name: "B file" },
  });
  const bTable = await prisma.customDbTable.create({
    data: { organizationId: B, folderId: bFolder.id, name: "B table" },
  });
  const bCol = await prisma.customDbColumn.create({
    data: { id: buildColumnId(bTable.id, "col_code"), tableId: bTable.id, header: "Code", sortOrder: 0 },
  });
  const bNameCol = await prisma.customDbColumn.create({
    data: { id: buildColumnId(bTable.id, "col_name"), tableId: bTable.id, header: "Name", sortOrder: 1 },
  });
  const bRow = await prisma.customDbRow.create({
    data: { tableId: bTable.id, sortOrder: 0 },
  });
  await prisma.customDbCell.createMany({
    data: [
      { rowId: bRow.id, columnId: bCol.id, rawValue: "B-SECRET" },
      { rowId: bRow.id, columnId: bNameCol.id, rawValue: "B item" },
    ],
  });
  const bMaterial = await prisma.materialPrice.create({
    data: {
      organizationId: B,
      code: "B-MAT",
      name: "B material",
      category: "x",
      density: 1,
      pricePerKg: 111,
    },
  });
  const bProfile = await prisma.profileData.create({
    data: {
      organizationId: B,
      code: "B-PRO",
      name: "B profile",
      type: "x",
      weightPerM: 1,
      pricePerM: 222,
    },
  });
  const bComponent = await prisma.componentCatalog.create({
    data: {
      organizationId: B,
      code: "B-COM",
      name: "B component",
      category: "x",
      unitPrice: 333,
    },
  });
  const bCustomer = await prisma.customer.create({
    data: { organizationId: B, name: "B customer" },
  });
  const bProject = await prisma.costingProject.create({
    data: { organizationId: B, name: "B project" },
  });
  const bQuotation = await prisma.quotation.create({
    data: { organizationId: B, perihal: "B quotation" },
  });
  Object.assign(b, {
    folder: bFolder.id,
    ahuFolder: bAhuFolder.id,
    table: bTable.id,
    row: bRow.id,
    codeCol: bCol.id,
    material: bMaterial.id,
    profile: bProfile.id,
    component: bComponent.id,
    customer: bCustomer.id,
    project: bProject.id,
    quotation: bQuotation.id,
  });

  // --- org A (attacker): a manual costing group + its own material ---
  const aProject = await prisma.costingProject.create({
    data: { organizationId: A, name: "A project" },
  });
  const aSegment = await prisma.costingSegment.create({
    data: { projectId: aProject.id, type: "manual", title: "A segment" },
  });
  const aGroup = await prisma.manualCostingGroup.create({
    data: { segmentId: aSegment.id, name: "A group" },
  });
  const aMaterial = await prisma.materialPrice.create({
    data: {
      organizationId: A,
      code: "A-MAT",
      name: "A material",
      category: "x",
      density: 1,
      pricePerKg: 1,
    },
  });
  const aCustomer = await prisma.customer.create({
    data: { organizationId: A, name: "A customer" },
  });
  Object.assign(a, {
    project: aProject.id,
    segment: aSegment.id,
    group: aGroup.id,
    material: aMaterial.id,
    customer: aCustomer.id,
  });
});

afterAll(async () => {
  await prisma.organization.deleteMany({ where: { id: { in: [A, B] } } });
  await prisma.$disconnect();
  // lib/prisma keeps its pg Pool on globalThis; end it so Jest can exit.
  await (globalThis as unknown as { pgPool?: { end(): Promise<void> } }).pgPool?.end();
});

describe("A cannot see B's data in list endpoints", () => {
  const lists: [string, () => Promise<Response>, string][] = [
    ["database/items (material)", () => itemsGET(), "material"],
    ["database/items (profile)", () => itemsGET(), "profile"],
    ["database/items (component)", () => itemsGET(), "component"],
    ["database/items (custom row)", () => itemsGET(), "row"],
    ["materials", () => materialsGET(req("/api/materials")), "material"],
    ["profiles", () => profilesGET(req("/api/profiles")), "profile"],
    ["components", () => componentsGET(req("/api/components")), "component"],
    ["customers", () => customersGET(req("/api/customers")), "customer"],
    ["projects", () => projectsGET(), "project"],
    ["quotations", () => quotationsGET(req("/api/quotations")), "quotation"],
  ];

  it.each(lists)("%s", async (_name, call, key) => {
    const asA = await as(A, call);
    expect(asA.status).toBe(200);
    expect(await text(asA)).not.toContain(b[key]);

    // positive control: B does see its own row
    const asB = await as(B, call);
    expect(asB.status).toBe(200);
    expect(await text(asB)).toContain(b[key]);
  });
});

describe("A cannot read, change or delete B's records by id", () => {
  const cases: {
    name: string;
    key: string;
    attempts: [string, (id: string) => Promise<Response>][];
    control: (id: string) => Promise<Response>;
    stillThere: (id: string) => Promise<unknown>;
  }[] = [
    {
      name: "customer",
      key: "customer",
      attempts: [
        ["GET", (id) => customerGET(req("/x"), ctx({ id }))],
        [
          "PUT",
          (id) => customerPUT(req("/x", "PUT", { name: "HACKED" }), ctx({ id })),
        ],
        ["DELETE", (id) => customerDELETE(req("/x", "DELETE"), ctx({ id }))],
      ],
      control: (id) =>
        customerPUT(req("/x", "PUT", { name: "B customer" }), ctx({ id })),
      stillThere: (id) => prisma.customer.findFirst({ where: { id, name: "B customer" } }),
    },
    {
      name: "project",
      key: "project",
      attempts: [
        ["GET", (id) => projectGET(req("/x"), ctx({ id }))],
        [
          "PUT",
          (id) => projectPUT(req("/x", "PUT", { name: "HACKED" }), ctx({ id })),
        ],
        ["DELETE", (id) => projectDELETE(req("/x", "DELETE"), ctx({ id }))],
      ],
      control: (id) =>
        projectPUT(req("/x", "PUT", { name: "B project" }), ctx({ id })),
      stillThere: (id) => prisma.costingProject.findFirst({ where: { id, name: "B project" } }),
    },
    {
      name: "quotation",
      key: "quotation",
      attempts: [
        ["GET", (id) => quotationGET(req("/x"), ctx({ id }))],
        [
          "PUT",
          (id) => quotationPUT(req("/x", "PUT", { perihal: "HACKED" }), ctx({ id })),
        ],
        ["DELETE", (id) => quotationDELETE(req("/x", "DELETE"), ctx({ id }))],
      ],
      control: (id) =>
        quotationPUT(req("/x", "PUT", { perihal: "B quotation" }), ctx({ id })),
      stillThere: (id) => prisma.quotation.findFirst({ where: { id, perihal: "B quotation" } }),
    },
    {
      name: "material",
      key: "material",
      attempts: [
        [
          "PUT",
          (id) => materialPUT(req("/x", "PUT", { name: "HACKED" }), ctx({ id })),
        ],
        ["DELETE", (id) => materialDELETE(req("/x", "DELETE"), ctx({ id }))],
      ],
      control: (id) =>
        materialPUT(req("/x", "PUT", { name: "B material" }), ctx({ id })),
      stillThere: (id) => prisma.materialPrice.findFirst({ where: { id, name: "B material" } }),
    },
    {
      name: "profile",
      key: "profile",
      attempts: [
        [
          "PUT",
          (id) => profilePUT(req("/x", "PUT", { name: "HACKED" }), ctx({ id })),
        ],
        ["DELETE", (id) => profileDELETE(req("/x", "DELETE"), ctx({ id }))],
      ],
      control: (id) =>
        profilePUT(req("/x", "PUT", { name: "B profile" }), ctx({ id })),
      stillThere: (id) => prisma.profileData.findFirst({ where: { id, name: "B profile" } }),
    },
    {
      name: "component",
      key: "component",
      attempts: [
        [
          "PUT",
          (id) => componentPUT(req("/x", "PUT", { name: "HACKED" }), ctx({ id })),
        ],
        ["DELETE", (id) => componentDELETE(req("/x", "DELETE"), ctx({ id }))],
      ],
      control: (id) =>
        componentPUT(req("/x", "PUT", { name: "B component" }), ctx({ id })),
      stillThere: (id) => prisma.componentCatalog.findFirst({ where: { id, name: "B component" } }),
    },
  ];

  for (const c of cases) {
    it(c.name, async () => {
      const id = b[c.key];
      for (const [, attempt] of c.attempts) {
        const res = await as(A, () => attempt(id));
        expect([403, 404]).toContain(res.status);
        expect(await text(res)).not.toContain(id);
      }
      // B's row is untouched ...
      expect(await c.stillThere(id)).not.toBeNull();
      // ... and the same request body is valid when sent by the owner.
      const ok = await as(B, () => c.control(id));
      expect(ok.status).toBeLessThan(300);
    });
  }
});

describe("previously leaking endpoints", () => {
  it("quotations/bulk-delete cannot delete another org's quotation", async () => {
    const res = await as(A, () =>
      bulkDeletePOST(req("/x", "POST", { ids: [b.quotation] }))
    );
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ deleted: 0 });
    expect(await prisma.quotation.findUnique({ where: { id: b.quotation } })).not.toBeNull();

    // control: owner can delete via the same endpoint
    const extra = await prisma.quotation.create({ data: { organizationId: B } });
    const ok = await as(B, () =>
      bulkDeletePOST(req("/x", "POST", { ids: [extra.id] }))
    );
    expect(await ok.json()).toEqual({ deleted: 1 });
  });

  it("database/files GET rejects another org's folder", async () => {
    const url = `/api/database/files?scope=custom&folderId=${b.folder}`;
    const asA = await as(A, () => filesGET(req(url)));
    expect(asA.status).toBe(404);
    expect(await text(asA)).not.toContain("B table");

    const asB = await as(B, () => filesGET(req(url)));
    expect(asB.status).toBe(200);
    expect(await text(asB)).toContain("B table");
  });

  it("database/files GET (ahu) rejects another org's folder", async () => {
    const url = `/api/database/files?scope=ahu&kind=materials&folderId=${b.ahuFolder}`;
    const asA = await as(A, () => filesGET(req(url)));
    expect(asA.status).toBe(404);
    const asB = await as(B, () => filesGET(req(url)));
    expect(asB.status).toBe(200);
    expect(await text(asB)).toContain("B file");
  });

  it("database/files POST cannot create in another org's folder", async () => {
    const before = await prisma.customDbTable.count({ where: { folderId: b.folder } });
    const res = await as(A, () =>
      filesPOST(
        req("/x", "POST", { scope: "custom", folderId: b.folder, name: "planted" })
      )
    );
    expect(res.status).toBe(404);
    expect(await prisma.customDbTable.count({ where: { folderId: b.folder } })).toBe(before);
  });

  it("custom-db POST cannot create a table in another org's folder", async () => {
    const before = await prisma.customDbTable.count({ where: { folderId: b.folder } });
    const res = await as(A, () =>
      customDbPOST(req("/x", "POST", { name: "planted", folderId: b.folder }))
    );
    expect(res.status).toBe(404);
    expect(await prisma.customDbTable.count({ where: { folderId: b.folder } })).toBe(before);

    // control: owner can
    const ok = await as(B, () =>
      customDbPOST(req("/x", "POST", { name: "ok", folderId: b.folder }))
    );
    expect(ok.status).toBe(201);
  });

  it("custom-db rows/cells reject another org's table and row", async () => {
    const addRow = await as(A, () =>
      customRowsPOST(req("/x", "POST", { tableId: b.table }))
    );
    expect(addRow.status).toBe(404);

    const patch = (rawValue: string, orgId: string) =>
      as(orgId, () =>
        customCellsPATCH(
          req("/x", "PATCH", { rowId: b.row, columnId: b.codeCol, rawValue })
        )
      );
    const overwrite = await patch("HACKED", A);
    expect(overwrite.status).toBe(404);
    const cell = await prisma.customDbCell.findFirst({
      where: { rowId: b.row, columnId: b.codeCol },
    });
    expect(cell?.rawValue).toBe("B-SECRET");

    const del = await as(A, () =>
      customRowDELETE(req("/x", "DELETE"), ctx({ rowId: b.row }))
    );
    expect(del.status).toBe(404);
    expect(await prisma.customDbRow.findUnique({ where: { id: b.row } })).not.toBeNull();

    // control: the same PATCH is valid for the owner
    const ok = await patch("B-SECRET", B);
    expect(ok.status).toBe(200);
  });

  it("manual costing items cannot copy another org's price data", async () => {
    const call = (sourceId: string, orgId: string) =>
      as(orgId, () =>
        manualItemsPOST(
          req("/x", "POST", {
            items: [{ sourceType: "material", sourceId, qty: 1 }],
          }),
          ctx({ id: a.project, segmentId: a.segment, groupId: a.group })
        )
      );

    const stolen = await call(b.material, A);
    expect(stolen.status).toBe(400);
    expect(
      await prisma.manualCostingItem.count({ where: { groupId: a.group } })
    ).toBe(0);

    // control: A can use its own material
    const own = await call(a.material, A);
    expect(own.status).toBeLessThan(300);
    expect(
      await prisma.manualCostingItem.count({ where: { groupId: a.group } })
    ).toBe(1);
  });
});
