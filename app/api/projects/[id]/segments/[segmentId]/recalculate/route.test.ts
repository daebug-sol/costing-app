import { POST } from "./route";
import { prisma } from "@/lib/prisma";
import {
  calculateCoil,
  calculateDrainPan,
  calculateSkid,
  calculateStructure,
} from "@/lib/calculations";
import fs from "fs";
import path from "path";

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

jest.mock("@/lib/ahu-recalc-params", () => {
  const actual = jest.requireActual<typeof import("@/lib/ahu-recalc-params")>("@/lib/ahu-recalc-params");
  return {
    ...actual,
    parseAhuRecalcParams: jest.fn(() => ({})),
    resolveDamperModes: jest.fn(() => ({ fa: false, ra: false })),
  };
});

jest.mock("@/lib/project-rollup", () => ({
  rollupProjectFinancials: jest.fn(async () => undefined),
}));

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

function numFromDump(sheet: string, cell: string, source: "calculatedResult" | "value" = "calculatedResult"): number {
  const c = readDumpCell(sheet, cell);
  const raw = source === "calculatedResult" ? c.calculatedResult ?? c.value : c.value ?? c.calculatedResult;
  return Number(raw);
}

const SHEET_SKID = "1. AHU-Skid";
const SHEET_STRUCTURE = "3. AHU-Structure";
const SHEET_COIL = "CoilCost 20251027";

function oracleMaterialRows() {
  return [
    {
      code: "UNP100-304",
      name: "UNP100",
      category: "raw",
      density: 7860,
      pricePerKg: numFromDump(SHEET_SKID, "M18"),
      currency: "IDR",
      unit: "kg",
    },
    {
      code: "SGCC-1.5",
      name: "GI 1.5",
      category: "raw",
      density: 7860,
      pricePerKg: numFromDump(SHEET_STRUCTURE, "M24"),
      currency: "IDR",
      unit: "kg",
    },
    {
      code: "SUS304-1.5",
      name: "SS304",
      category: "raw",
      density: 8800,
      pricePerKg: numFromDump(SHEET_STRUCTURE, "M38"),
      currency: "IDR",
      unit: "kg",
    },
    {
      code: "UNP125-304",
      name: "UNP125",
      category: "raw",
      density: 7860,
      pricePerKg: numFromDump(SHEET_STRUCTURE, "M45"),
      currency: "IDR",
      unit: "kg",
    },
    {
      code: "SS316-SHAFT-M12",
      name: "Shaft",
      category: "raw",
      density: 8000,
      pricePerKg: numFromDump(SHEET_STRUCTURE, "M51"),
      currency: "IDR",
      unit: "kg",
    },
    {
      code: "AL-FIN",
      name: "Fin",
      category: "raw",
      density: 2700,
      pricePerKg: numFromDump(SHEET_COIL, "Q236"),
      currency: "IDR",
      unit: "kg",
    },
    {
      code: "COPPER-TUBE",
      name: "Cu",
      category: "raw",
      density: 8900,
      pricePerKg: numFromDump(SHEET_COIL, "Q237"),
      currency: "IDR",
      unit: "kg",
    },
    {
      code: "SGCC-1.0",
      name: "GI",
      category: "raw",
      density: 8030,
      pricePerKg: numFromDump(SHEET_COIL, "Q238"),
      currency: "IDR",
      unit: "kg",
    },
  ];
}

describe("POST /api/projects/[id]/segments/[segmentId]/recalculate", () => {
  it("computes structure subtotal from dump-backed constants through recalculate route", async () => {
    const mockedPrisma = prisma as unknown as {
      costingSegment: { findFirst: jest.Mock };
      materialPrice: { findMany: jest.Mock };
      profileData: { findMany: jest.Mock };
      componentCatalog: { findMany: jest.Mock };
      costingProject: { findUnique: jest.Mock };
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
    mockedPrisma.materialPrice.findMany.mockResolvedValue(oracleMaterialRows());
    mockedPrisma.profileData.findMany.mockResolvedValue([{ code: "5060Y-NA06", type: "Pentapost" }]);
    mockedPrisma.componentCatalog.findMany.mockResolvedValue([]);
    mockedPrisma.$transaction.mockImplementation(async (cb: (tx: unknown) => Promise<unknown>) => {
      const tx = {
        costingSection: {
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
    mockedPrisma.costingProject.findUnique.mockResolvedValue({ id: "proj-1", segments: [] });

    const req = new Request("http://localhost", {
      method: "POST",
      body: JSON.stringify({
        nSections: 2,
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
    const d = Number(readDumpCell("3. AHU-Structure", "E2").value);
    const materials = oracleMaterialRows();
    const expectedStructureSubtotal = calculateStructure({
      H: h,
      W: w,
      D: d,
      materials,
    }).reduce((sum, it) => sum + it.subtotal, 0);

    expect(Math.abs(createdSections[0].subtotal - expectedStructureSubtotal)).toBeLessThan(1e-6);
    expect(Math.abs(segmentUpdates[0].subtotal - expectedStructureSubtotal)).toBeLessThan(1e-6);
    expect(json).toEqual({ id: "proj-1", segments: [] });
  });

  it("persists skid, structure, drain pan, and coil subtotals consistent with oracle cells", async () => {
    const mockedPrisma = prisma as unknown as {
      costingSegment: { findFirst: jest.Mock };
      materialPrice: { findMany: jest.Mock };
      profileData: { findMany: jest.Mock };
      componentCatalog: { findMany: jest.Mock };
      costingProject: { findUnique: jest.Mock };
      $transaction: jest.Mock;
    };
    const createdSections: Array<{ category: string; subtotal: number }> = [];

    const h = numFromDump(SHEET_STRUCTURE, "C2", "value");
    const w = numFromDump(SHEET_STRUCTURE, "D2", "value");
    const d = numFromDump(SHEET_STRUCTURE, "E2", "value");

    mockedPrisma.costingSegment.findFirst.mockResolvedValue({
      id: "seg-1",
      projectId: "proj-1",
      type: "ahu",
      dimH: h,
      dimW: w,
      dimD: d,
      qty: 1,
      profileType: "5060Y-NA06",
      ahuRecalcParams: {},
    });
    mockedPrisma.materialPrice.findMany.mockResolvedValue(oracleMaterialRows());
    mockedPrisma.profileData.findMany.mockResolvedValue([{ code: "5060Y-NA06", type: "Pentapost" }]);
    mockedPrisma.componentCatalog.findMany.mockResolvedValue([]);
    mockedPrisma.$transaction.mockImplementation(async (cb: (tx: unknown) => Promise<unknown>) => {
      const tx = {
        costingSection: {
          deleteMany: jest.fn(),
          create: jest.fn(({ data }: { data: { category: string; subtotal: number } }) => {
            createdSections.push({ category: data.category, subtotal: data.subtotal });
            return Promise.resolve(data);
          }),
        },
        costingSegment: {
          update: jest.fn(),
        },
      };
      return cb(tx);
    });
    mockedPrisma.costingProject.findUnique.mockResolvedValue({ id: "proj-1", segments: [] });

    const materials = oracleMaterialRows();
    const coilBody = {
      FH: numFromDump(SHEET_COIL, "F211"),
      FL: numFromDump(SHEET_COIL, "H211"),
      rows: numFromDump(SHEET_COIL, "H209", "value"),
      FPI: numFromDump(SHEET_COIL, "G209", "value"),
      circuits: 1,
      coilFaceMm: numFromDump(SHEET_COIL, "I209"),
      finPackSpanMm: numFromDump(SHEET_COIL, "I236"),
      finPitchFactorG211: numFromDump(SHEET_COIL, "G211"),
      finTubeOdMm: numFromDump(SHEET_COIL, "G236"),
      tubeOdMm: numFromDump(SHEET_COIL, "F237"),
      tubeWallMm: numFromDump(SHEET_COIL, "G237"),
      tubeStretchMm: numFromDump(SHEET_COIL, "H237"),
      tubePrimaryFactor: numFromDump(SHEET_COIL, "F209", "value"),
      headerAssemblyKg: numFromDump(SHEET_COIL, "M238"),
      finLineWaste: numFromDump(SHEET_COIL, "O236"),
      tubeLineWaste: numFromDump(SHEET_COIL, "O237"),
    };

    const req = new Request("http://localhost", {
      method: "POST",
      body: JSON.stringify({
        nSections: 2,
        costingScope: {
          isFullAhu: false,
          includeSkid: true,
          includeStructure: true,
          includeDrainPan: true,
          includeCoil: true,
        },
        coil: coilBody,
      }),
      headers: { "content-type": "application/json" },
    });

    const response = await POST(req, { params: Promise.resolve({ id: "proj-1", segmentId: "seg-1" }) });
    expect(response.status).toBe(200);
    expect(createdSections.map((s) => s.category).sort()).toEqual(["Coil", "Drain Pan", "Skid", "Structure"].sort());

    const byCat = new Map(createdSections.map((s) => [s.category, s.subtotal]));
    const skidOracle = numFromDump(SHEET_SKID, "O25");
    const structOracle = numFromDump(SHEET_STRUCTURE, "O60");
    const coilOracle = numFromDump(SHEET_COIL, "V235");
    const drainOracle =
      numFromDump(SHEET_STRUCTURE, "O38") +
      numFromDump(SHEET_STRUCTURE, "O39") +
      numFromDump(SHEET_STRUCTURE, "O40") +
      numFromDump(SHEET_STRUCTURE, "O41");

    expect(Math.abs((byCat.get("Skid") ?? 0) - skidOracle)).toBeLessThan(0.01);
    expect(Math.abs((byCat.get("Structure") ?? 0) - (structOracle - drainOracle))).toBeLessThan(0.01);
    expect(Math.abs((byCat.get("Drain Pan") ?? 0) - drainOracle)).toBeLessThan(0.01);
    expect(Math.abs((byCat.get("Coil") ?? 0) - coilOracle)).toBeLessThan(0.01);

    const expectedSkid = calculateSkid({ W: w, D: d, materials }).reduce((s, it) => s + it.subtotal, 0);
    const expectedStruct = calculateStructure({ H: h, W: w, D: d, materials }).reduce((s, it) => s + it.subtotal, 0);
    const expectedDrain = calculateDrainPan({ H: h, W: w, D: d, materials }).reduce((s, it) => s + it.subtotal, 0);
    const expectedCoil = calculateCoil({
      ...coilBody,
      materials,
    }).reduce((s, it) => s + it.subtotal, 0);

    expect(Math.abs((byCat.get("Skid") ?? 0) - expectedSkid)).toBeLessThan(1e-6);
    expect(Math.abs((byCat.get("Structure") ?? 0) - expectedStruct)).toBeLessThan(1e-6);
    expect(Math.abs((byCat.get("Drain Pan") ?? 0) - expectedDrain)).toBeLessThan(1e-6);
    expect(Math.abs((byCat.get("Coil") ?? 0) - expectedCoil)).toBeLessThan(1e-6);
  });
});
