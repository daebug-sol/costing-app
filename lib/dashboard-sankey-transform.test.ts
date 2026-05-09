import { transformCostingToSankey } from "@/lib/dashboard-sankey-transform";

describe("transformCostingToSankey", () => {
  it("builds forward-only links and filters zero values", () => {
    const data = transformCostingToSankey({
      rawContributions: [
        { rawCategory: "Raw Aluminum", subAssembly: "Frame & Casing", value: 100 },
        { rawCategory: "Copper Tube", subAssembly: "Coil System", value: 120 },
      ],
      hpp: 220,
      overhead: 10,
      contingency: 5,
      eskalasi: 0,
      asuransi: 0,
      mobilisasi: 0,
      margin: 30,
      grossTotal: 265,
      discount: 15,
      netSelling: 250,
      ppn: 27.5,
      pph: 0,
      grandTotal: 277.5,
    });

    expect(data.nodes.length).toBeGreaterThan(0);
    expect(data.links.some((link) => link.value <= 0)).toBe(false);
    expect(data.links.some((link) => link.source === link.target)).toBe(false);
    expect(
      data.links.some(
        (link) => link.source === "node:gross-total" && link.target === "node:discount"
      )
    ).toBe(true);
  });
});

