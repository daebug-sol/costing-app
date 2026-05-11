import { POST } from "./route";
import { prisma } from "@/lib/prisma";
import { validateAhuRecalculateContext } from "@/lib/ahu-recalc-validation";
import { computeAhuSegmentCostingBlocks } from "@/lib/ahu-segment-costing";

jest.mock("@/lib/prisma", () => ({
  prisma: {
    costingSegment: { findFirst: jest.fn(), update: jest.fn() },
    materialPrice: { findMany: jest.fn() },
    profileData: { findMany: jest.fn() },
    componentCatalog: { findMany: jest.fn() },
    costingProject: { findUnique: jest.fn() },
    costingSection: { deleteMany: jest.fn(), create: jest.fn() },
    $transaction: jest.fn(),
  },
}));

jest.mock("@/lib/ahu-recalc-params", () => ({
  parseAhuRecalcParams: jest.fn(() => ({})),
  mergeRecalcParams: jest.fn((stored: unknown, body: unknown) => ({ ...(stored as object), ...(body as object) })),
}));

jest.mock("@/lib/ahu-recalc-validation", () => ({
  validateAhuRecalculateContext: jest.fn(() => ({ ok: true })),
}));

jest.mock("@/lib/ahu-segment-costing", () => ({
  computeAhuSegmentCostingBlocks: jest.fn(),
}));

jest.mock("@/lib/project-rollup", () => ({
  rollupProjectFinancials: jest.fn(async () => undefined),
}));

describe("POST /api/projects/[id]/segments/[segmentId]/recalculate", () => {
  it("runs validation, computes blocks, and returns refreshed JSON", async () => {
    const mockedPrisma = prisma as unknown as {
      costingSegment: { findFirst: jest.Mock };
      materialPrice: { findMany: jest.Mock };
      profileData: { findMany: jest.Mock };
      componentCatalog: { findMany: jest.Mock };
      costingProject: { findUnique: jest.Mock };
      $transaction: jest.Mock;
    };

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
    mockedPrisma.materialPrice.findMany.mockResolvedValue([]);
    mockedPrisma.profileData.findMany.mockResolvedValue([{ code: "5060Y-NA06", type: "Pentapost" }]);
    mockedPrisma.componentCatalog.findMany.mockResolvedValue([]);
    mockedPrisma.$transaction.mockImplementation(async (cb: (tx: unknown) => Promise<unknown>) =>
      cb({
        costingSection: { deleteMany: jest.fn(), create: jest.fn() },
        costingSegment: { update: jest.fn() },
      })
    );
    mockedPrisma.costingProject.findUnique.mockResolvedValue({ id: "proj-1", segments: [] });

    (computeAhuSegmentCostingBlocks as jest.Mock).mockReturnValue([
      {
        category: "Frame & Panel",
        sortOrder: 0,
        items: [
          {
            description: "line",
            uom: "kg",
            qty: 1,
            qtyFormula: "1",
            unitPrice: 10,
            currency: "IDR",
            wasteFactor: 1,
            subtotal: 10,
            componentRef: null,
            notes: null,
          },
        ],
      },
    ]);

    const req = new Request("http://localhost", {
      method: "POST",
      body: JSON.stringify({ nSections: 2 }),
      headers: { "content-type": "application/json" },
    });

    const response = await POST(req, { params: Promise.resolve({ id: "proj-1", segmentId: "seg-1" }) });
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(validateAhuRecalculateContext).toHaveBeenCalled();
    expect(computeAhuSegmentCostingBlocks).toHaveBeenCalled();
    expect(json).toEqual({ id: "proj-1", segments: [] });
  });
});
