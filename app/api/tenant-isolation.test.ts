import { NextResponse } from "next/server";
import { GET as getItems } from "./database/items/route";
import { POST as bulkDelete } from "./quotations/bulk-delete/route";
import { GET as getFiles } from "./database/files/route";
import { POST as createTable } from "./custom-db/route";
import { prisma } from "@/lib/prisma";
import { requireFolderInOrg } from "@/lib/tenant-context";

jest.mock("@/lib/prisma", () => ({
  prisma: {
    materialPrice: { findMany: jest.fn(async () => []) },
    profileData: { findMany: jest.fn(async () => []) },
    componentCatalog: { findMany: jest.fn(async () => []) },
    customDbRow: { findMany: jest.fn(async () => []) },
    quotation: { deleteMany: jest.fn(async () => ({ count: 0 })) },
    customDbTable: { findMany: jest.fn(), create: jest.fn() },
  },
}));

jest.mock("@/lib/api-guard", () => ({
  guardApiRoute: jest.fn(async () => ({
    userId: "u",
    orgId: "org-a",
    role: "owner",
  })),
}));

jest.mock("@/lib/permissions", () => ({
  requirePermission: jest.fn(() => null),
}));

jest.mock("@/lib/tenant-context", () => ({
  requireFolderInOrg: jest.fn(),
}));

jest.mock("@/lib/database-folders", () => ({
  ...jest.requireActual("@/lib/database-folders"),
  ensureDefaultFolders: jest.fn(async () => undefined),
}));

jest.mock("@/lib/org-modules", () => ({
  requireAhuModule: jest.fn(async () => ({ ok: true })),
}));

const notFound = () => ({
  ok: false,
  response: NextResponse.json({ error: "Not found" }, { status: 404 }),
});

describe("tenant isolation", () => {
  beforeEach(() => jest.clearAllMocks());

  it("database/items scopes every query to the active org", async () => {
    await getItems();
    for (const m of [
      prisma.materialPrice,
      prisma.profileData,
      prisma.componentCatalog,
    ]) {
      expect((m.findMany as jest.Mock).mock.calls[0][0].where).toEqual({
        organizationId: "org-a",
      });
    }
    expect(
      (prisma.customDbRow.findMany as jest.Mock).mock.calls[0][0].where
    ).toEqual({ table: { organizationId: "org-a" } });
  });

  it("quotations/bulk-delete only deletes within the active org", async () => {
    await bulkDelete(
      new Request("http://x", {
        method: "POST",
        body: JSON.stringify({ ids: ["q1", "q2"] }),
      })
    );
    expect(
      (prisma.quotation.deleteMany as jest.Mock).mock.calls[0][0].where
    ).toEqual({ id: { in: ["q1", "q2"] }, organizationId: "org-a" });
  });

  it("database/files GET rejects a folder from another org", async () => {
    (requireFolderInOrg as jest.Mock).mockResolvedValue(notFound());
    const res = await getFiles(
      new Request("http://x/api/database/files?scope=custom&folderId=foreign")
    );
    expect(res.status).toBe(404);
    expect(prisma.customDbTable.findMany).not.toHaveBeenCalled();
  });

  it("custom-db POST rejects a folder from another org", async () => {
    (requireFolderInOrg as jest.Mock).mockResolvedValue(notFound());
    const res = await createTable(
      new Request("http://x", {
        method: "POST",
        body: JSON.stringify({ name: "t", folderId: "foreign" }),
      })
    );
    expect(res.status).toBe(404);
    expect(prisma.customDbTable.create).not.toHaveBeenCalled();
  });
});
