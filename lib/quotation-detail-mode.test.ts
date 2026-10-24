import {
  costingProjectToSectionDocs,
  type CostingProjectApi,
} from "@/lib/quotation-export-mappers";

const bolt = (qty: number) => ({
  sourceType: "material",
  sourceId: "m6",
  name: "Baut M6",
  uom: "pcs",
  qty,
  effectivePrice: 1500,
  subtotal: qty * 1500,
});

// Meja: alas (4 baut + multiplek), kaki (8 baut) > tapak (8 baut).
const project: CostingProjectApi = {
  id: "p1",
  name: "Meja",
  qty: 1,
  totalHPP: 0,
  overhead: 0,
  contingency: 0,
  eskalasi: 0,
  asuransi: 0,
  mobilisasi: 0,
  margin: 0,
  totalSelling: 0,
  segments: [
    {
      type: "manual",
      title: "Meja kerja",
      sortOrder: 0,
      manualGroups: [
        { id: "tapak", parentId: "kaki", sortOrder: 0, name: "Tapak kaki", subtotal: 12_000, items: [bolt(8)] },
        { id: "kaki", parentId: null, sortOrder: 1, name: "Kaki penyangga", subtotal: 12_000, items: [bolt(8)] },
        {
          id: "alas",
          parentId: null,
          sortOrder: 0,
          name: "Alas meja",
          subtotal: 426_000,
          items: [
            { name: "Multiplek 18mm", uom: "lbr", qty: 1, effectivePrice: 420_000, subtotal: 420_000 },
            bolt(4),
          ],
        },
      ],
    },
  ],
} as unknown as CostingProjectApi;

describe("costingProjectToSectionDocs detail mode", () => {
  it("Rata merges the same material across bagian into one section", () => {
    const secs = costingProjectToSectionDocs(project, "flat");
    expect(secs).toHaveLength(1);
    expect(secs[0].category).toBe("Meja kerja");
    expect(secs[0].subtotal).toBe(450_000);
    const m6 = secs[0].lineItems.find((l) => l.description === "Baut M6");
    expect(m6).toMatchObject({ qty: 20, subtotal: 30_000 });
    expect(secs[0].lineItems).toHaveLength(2);
  });

  it("Rata keeps a material with an overridden price on its own line", () => {
    const p = structuredClone(project) as CostingProjectApi;
    const g = p.segments![0].manualGroups![0];
    g.items[0] = { ...bolt(8), effectivePrice: 2000, subtotal: 16_000 };
    const lines = costingProjectToSectionDocs(p, "flat")[0].lineItems.filter(
      (l) => l.description === "Baut M6"
    );
    expect(lines.map((l) => l.qty).sort()).toEqual([12, 8].sort());
  });

  it("Per bagian lists parents before sub-bagian with depth and rolled totals", () => {
    const secs = costingProjectToSectionDocs(project, "nested");
    expect(secs.map((s) => [s.category, s.depth, s.subtotal, s.total])).toEqual([
      ["Alas meja", 1, 426_000, 426_000],
      ["Kaki penyangga", 1, 12_000, 24_000],
      ["Tapak kaki", 2, 12_000, 12_000],
    ]);
  });

  it("Per bagian names a single default group after its segment", () => {
    const p = structuredClone(project) as CostingProjectApi;
    p.segments![0].manualGroups = [
      { id: "g", parentId: null, sortOrder: 0, name: "Kelompok utama", subtotal: 6_000, items: [bolt(4)] },
    ] as never;
    expect(costingProjectToSectionDocs(p, "nested").map((s) => s.category)).toEqual(["Meja kerja"]);
  });

  it("both modes add up to the same amount", () => {
    const sum = (mode: "flat" | "nested") =>
      costingProjectToSectionDocs(project, mode).reduce((s, x) => s + x.subtotal, 0);
    expect(sum("flat")).toBe(sum("nested"));
  });
});
