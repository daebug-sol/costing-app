import { POST } from "./route";
import { prisma } from "@/lib/prisma";
import fs from "fs";
import path from "path";

jest.mock("@/lib/prisma", () => ({
  prisma: {
    costingSegment: { findFirst: jest.fn(), update: jest.fn() },
    materialPrice: { findMany: jest.fn() },
    profileData: { findMany: jest.fn() },
    componentCatalog: { findMany: jest.fn() },
    costingProject: { findUnique: jest.fn(), findFirst: jest.fn() },
    costingSection: { deleteMany: jest.fn(), create: jest.fn() },
    $transaction: jest.fn(),
  },
}));

jest.mock("@/lib/api-guard", () => ({
  guardApiRoute: jest.fn(async () => ({
    userId: "test-user",
    orgId: "org-a",
    role: "owner",
  })),
}));

jest.mock("@/lib/org-modules", () => ({
  requireAhuModule: jest.fn(async () => ({ ok: true })),
}));

jest.mock("@/lib/ahu-recalc-params", () => ({
  parseAhuRecalcParams: jest.fn(() => ({})),
  mergeRecalcParams: jest.fn((stored: unknown, body: unknown) => ({ ...(stored as object), ...(body as object) })),
  resolveDamperModes: jest.fn(() => ({ fa: false, ra: false })),
}));

jest.mock("@/lib/project-rollup", () => ({
  rollupProjectFinancials: jest.fn(async () => undefined),
}));

import { requireAhuModule } from "@/lib/org-modules";

type DumpCell = { value?: unknown; calculatedResult?: unknown };

function readDumpCell(sheet: string, cell: string): DumpCell {
  const dumpPath = path.join(process.cwd(), "excel-formulas-dump.json");
  const dump = JSON.parse(fs.readFileSync(dumpPath, "utf8")) as {
    sheets: Record<string, { cells?: Record<string, DumpCell> }>;
  };
  const got = dump.sheets[sheet]?.cells?.[cell];
  expect(got).toBeDefined();
  return got as DumpCell;
}

describe("POST /api/projects/[id]/segments/[segmentId]/recalculate", () => {
  it("computes structure subtotal from dump-backed constants through recalculate route", async () => {
    const mockedPrisma = prisma as unknown as {
      costingSegment: { findFirst: jest.Mock };
      materialPrice: { findMany: jest.Mock };
      profileData: { findMany: jest.Mock };
      componentCatalog: { findMany: jest.Mock };
      costingProject: { findUnique: jest.Mock; findFirst: jest.Mock };
      $transaction: jest.Mock;
    };
    const createdSections: Array<{ category: string; subtotal: number }> = [];
    const segmentUpdates: Array<{ subtotal: number }> = [];

    mockedPrisma.costingSegment.findFirst.mockResolvedValue({
      id: "seg-1",
      projectId: "proj-1",
      type: "ahu",
      dimH: 1420,
      dimW: 1930,
      dimD: 1625,
      qty: 1,
      profileType: "5060Y-NA06",
      ahuRecalcParams: {},
    });
    mockedPrisma.materialPrice.findMany.mockResolvedValue([
      {
        code: "SGCC-1.5",
        name: "GI 1.5",
        category: "raw",
        density: 7860,
        pricePerKg: 20000,
        currency: "IDR",
        unit: "kg",
      },
    ]);
    mockedPrisma.profileData.findMany.mockResolvedValue([{ code: "5060Y-NA06", type: "Pentapost" }]);
    mockedPrisma.componentCatalog.findMany.mockResolvedValue([]);
    mockedPrisma.$transaction.mockImplementation(async (cb: (tx: unknown) => Promise<unknown>) => {
      const tx = {
        costingSection: {
          findMany: jest.fn().mockResolvedValue([]),
          deleteMany: jest.fn(),
          create: jest.fn(({ data }: { data: { category: string; subtotal: number } }) => {
            createdSections.push({ category: data.category, subtotal: data.subtotal });
            return Promise.resolve(data);
          }),
        },
        costingSegment: {
          update: jest.fn(({ data }: { data: { subtotal: number } }) => {
            segmentUpdates.push({ subtotal: data.subtotal });
            return Promise.resolve(data);
          }),
        },
      };
      return cb(tx);
    });
    mockedPrisma.costingProject.findFirst.mockResolvedValue({ id: "proj-1" });
    mockedPrisma.costingProject.findUnique.mockResolvedValue({ id: "proj-1", segments: [] });

    const req = new Request("http://localhost", {
      method: "POST",
      body: JSON.stringify({
        // Dump/workbook structure parity is defined for a single section.
        nSections: 1,
        costingScope: {
          isFullAhu: false,
          includeStructure: true,
        },
      }),
      headers: { "content-type": "application/json" },
    });

    const response = await POST(req, { params: Promise.resolve({ id: "proj-1", segmentId: "seg-1" }) });
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(createdSections.length).toBe(1);
    expect(createdSections[0].category).toBe("Structure");
    expect(segmentUpdates.length).toBe(1);

    const h = Number(readDumpCell("3. AHU-Structure", "C2").value);
    const w = Number(readDumpCell("3. AHU-Structure", "D2").value);
    const density = Number(readDumpCell("3. AHU-Structure", "F18").value);
    const thicknessM = Number(readDumpCell("3. AHU-Structure", "C18").value) / 1000;
    const stripWidthCell = readDumpCell("3. AHU-Structure", "D18");
    const stripWidthM = Number(stripWidthCell.calculatedResult ?? stripWidthCell.value) / 1000;
    const hM = h / 1000;
    const wM = w / 1000;
    const waste = 1.15;
    const expectedKg =
      thicknessM * stripWidthM * wM * density * waste * 2 +
      thicknessM * stripWidthM * hM * density * waste * 2 +
      thicknessM * hM * wM * density * waste +
      thicknessM * stripWidthM * hM * density * waste * 4 +
      thicknessM * stripWidthM * wM * density * waste * 4;
    const expectedStructureSubtotal = expectedKg * 20000;

    expect(Math.abs(createdSections[0].subtotal - expectedStructureSubtotal)).toBeLessThan(1e-6);
    expect(Math.abs(segmentUpdates[0].subtotal - expectedStructureSubtotal)).toBeLessThan(1e-6);
    expect(json).toEqual({ id: "proj-1", segments: [] });
  });

  it("returns 403 AHU_MODULE_DISABLED when AHU module is off", async () => {
    const requireAhu = requireAhuModule as jest.MockedFunction<typeof requireAhuModule>;
    requireAhu.mockResolvedValueOnce({
      ok: false,
      response: new Response(
        JSON.stringify({
          error: "AHU module not enabled",
          code: "AHU_MODULE_DISABLED",
        }),
        { status: 403, headers: { "content-type": "application/json" } }
      ) as unknown as import("next/server").NextResponse,
    });

    const req = new Request("http://localhost", {
      method: "POST",
      body: JSON.stringify({}),
      headers: { "content-type": "application/json" },
    });
    const response = await POST(req, {
      params: Promise.resolve({ id: "proj-1", segmentId: "seg-1" }),
    });
    const json = await response.json();

    expect(response.status).toBe(403);
    expect(json).toEqual({
      error: "AHU module not enabled",
      code: "AHU_MODULE_DISABLED",
    });
  });
});
