import { matchesSalesman, resolveSalesmanScope } from "@/lib/dashboard-scope";

describe("resolveSalesmanScope", () => {
  it("forces members and sales to their own name and ignores the request", () => {
    for (const role of ["member", "sales", "pm", "ppic"] as const) {
      expect(
        resolveSalesmanScope({ role, requested: "Budi", displayName: "Rina W." })
      ).toEqual({ mode: "own", salesman: "Rina W." });
    }
  });

  it("gives own scope with no name when the display name is unknown", () => {
    expect(
      resolveSalesmanScope({ role: "sales", requested: "__all__", displayName: null })
    ).toEqual({ mode: "own", salesman: null });
  });

  it("lets owner, admin and ceo see everyone or pick one person", () => {
    for (const role of ["owner", "admin", "ceo"] as const) {
      expect(resolveSalesmanScope({ role, requested: "__all__", displayName: "X" })).toEqual({
        mode: "all",
        salesman: null,
      });
      expect(resolveSalesmanScope({ role, requested: null, displayName: "X" })).toEqual({
        mode: "all",
        salesman: null,
      });
      expect(resolveSalesmanScope({ role, requested: " Budi ", displayName: "X" })).toEqual({
        mode: "person",
        salesman: "Budi",
      });
    }
  });
});

describe("matchesSalesman", () => {
  it("matches trimmed and case-insensitive", () => {
    expect(matchesSalesman(" rina w. ", "Rina W.")).toBe(true);
    expect(matchesSalesman("Budi", "Rina W.")).toBe(false);
    expect(matchesSalesman(null, "Rina W.")).toBe(false);
    expect(matchesSalesman("", "")).toBe(false);
  });
});

import { applySalesmanScope, listSalesmen } from "@/lib/dashboard-scope";

describe("applySalesmanScope", () => {
  const rows = {
    quotations: [
      { id: "q1", salesman: "Rina W.", projectId: "p1" },
      { id: "q2", salesman: "Budi", projectId: "p2" },
      { id: "q3", salesman: null, projectId: "p3" },
    ],
    salesOrders: [
      { id: "s1", quotationId: "q1" },
      { id: "s2", quotationId: "q2" },
      { id: "s3", quotationId: null },
    ],
    invoices: [
      { id: "i1", salesOrderId: "s1" },
      { id: "i2", salesOrderId: "s2" },
      { id: "i3", salesOrderId: null },
    ],
    projects: [{ id: "p1" }, { id: "p2" }, { id: "p3" }, { id: "p4" }],
  };

  it("keeps everything for scope all", () => {
    expect(applySalesmanScope({ mode: "all", salesman: null }, rows)).toEqual(rows);
  });

  it("keeps only the person's quotations and what hangs off them", () => {
    const out = applySalesmanScope({ mode: "own", salesman: " rina w." }, rows);
    expect(out.quotations.map((q) => q.id)).toEqual(["q1"]);
    expect(out.salesOrders.map((s) => s.id)).toEqual(["s1"]);
    expect(out.invoices.map((i) => i.id)).toEqual(["i1"]);
    expect(out.projects.map((p) => p.id)).toEqual(["p1"]);
  });

  it("returns nothing for a person with no name or no matches", () => {
    for (const salesman of [null, "Nobody"]) {
      const out = applySalesmanScope({ mode: "own", salesman }, rows);
      expect(out.quotations).toEqual([]);
      expect(out.salesOrders).toEqual([]);
      expect(out.invoices).toEqual([]);
      expect(out.projects).toEqual([]);
    }
  });
});

describe("listSalesmen", () => {
  it("returns distinct trimmed names sorted, skipping blanks", () => {
    expect(listSalesmen([{ salesman: "Budi" }, { salesman: " Budi " }, { salesman: "" }, { salesman: null }, { salesman: "Andi" }])).toEqual(["Andi", "Budi"]);
  });
});
