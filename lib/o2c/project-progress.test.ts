import {
  computeProjectProgress,
  documentationHref,
  invoiceHref,
  paymentHref,
  salesOrderHref,
  type QuotationWithChain,
} from "@/lib/o2c/project-progress";

function stageMap(q: QuotationWithChain) {
  const p = computeProjectProgress(q);
  return Object.fromEntries(p.stages.map((s) => [s.stage, s]));
}

describe("computeProjectProgress", () => {
  it("won quotation without SO marks Penawaran done and Sales Order current", () => {
    const q = { id: "q1", status: "won", noSurat: "QT-001" };
    const p = computeProjectProgress(q);
    const by = stageMap(q);

    expect(by.quotation.state).toBe("done");
    expect(by["sales-order"].state).toBe("current");
    expect(by.delivery.state).toBe("todo");
    expect(by.invoice.state).toBe("todo");
    expect(by.payment.state).toBe("todo");
    expect(p.latestStage).toBe("quotation");
    expect(p.latestRefId).toBe("q1");
    expect(by.quotation.href).toBe(documentationHref("q1"));
  });

  it("legacy approved/finalized count as won-like for Penawaran", () => {
    for (const status of ["approved", "finalized"]) {
      const by = stageMap({ id: "q", status });
      expect(by.quotation.state).toBe("done");
      expect(by["sales-order"].state).toBe("current");
    }
  });

  it("won → SO (no SJ) marks Sales Order done and Surat Jalan current", () => {
    const q: QuotationWithChain = {
      id: "q2",
      status: "won",
      convertedSoId: "so1",
      customerId: "cust1",
      customer: { id: "cust1", company: "PT A" },
      convertedSo: {
        id: "so1",
        soNumber: "SO-001",
        status: "open",
        deliveries: [],
        invoices: [],
      },
    };
    const p = computeProjectProgress(q);
    const by = stageMap(q);

    expect(by.quotation.state).toBe("done");
    expect(by["sales-order"].state).toBe("done");
    expect(by.delivery.state).toBe("current");
    expect(by.invoice.state).toBe("todo");
    expect(by.payment.state).toBe("todo");
    expect(p.latestStage).toBe("sales-order");
    expect(p.latestRefId).toBe("so1");
    expect(by["sales-order"].href).toBe(salesOrderHref("so1"));
    expect(by.delivery.href).toBe(salesOrderHref("so1"));
  });

  it("draft DO does not complete Surat Jalan", () => {
    const q: QuotationWithChain = {
      id: "q3",
      status: "won",
      convertedSoId: "so1",
      convertedSo: {
        id: "so1",
        soNumber: "SO-001",
        status: "open",
        deliveries: [{ id: "do1", doNumber: "SJ-001", status: "draft" }],
        invoices: [],
      },
    };
    const by = stageMap(q);
    expect(by.delivery.state).toBe("current");
    expect(by.delivery.refId).toBe("do1");
  });

  it("SJ sent → INV marks Invoice current after delivery done", () => {
    const q: QuotationWithChain = {
      id: "q4",
      status: "won",
      convertedSoId: "so1",
      customer: { id: "cust1" },
      convertedSo: {
        id: "so1",
        soNumber: "SO-001",
        status: "partially_delivered",
        deliveries: [{ id: "do1", doNumber: "SJ-001", status: "sent" }],
        invoices: [],
      },
    };
    const p = computeProjectProgress(q);
    const by = stageMap(q);

    expect(by.delivery.state).toBe("done");
    expect(by.invoice.state).toBe("current");
    expect(by.payment.state).toBe("todo");
    expect(p.latestStage).toBe("delivery");
    expect(p.latestRefId).toBe("do1");
    expect(by.delivery.href).toBe(salesOrderHref("so1"));
  });

  it("received DO also completes Surat Jalan", () => {
    const by = stageMap({
      id: "q",
      status: "won",
      convertedSoId: "so1",
      convertedSo: {
        id: "so1",
        status: "delivered",
        deliveries: [{ id: "do1", doNumber: "SJ-001", status: "received" }],
        invoices: [],
      },
    });
    expect(by.delivery.state).toBe("done");
  });

  it("active invoice after SJ marks Invoice done and Pembayaran current", () => {
    const q: QuotationWithChain = {
      id: "q5",
      status: "won",
      convertedSoId: "so1",
      customerId: "cust1",
      convertedSo: {
        id: "so1",
        soNumber: "SO-001",
        status: "delivered",
        deliveries: [{ id: "do1", doNumber: "SJ-001", status: "sent" }],
        invoices: [
          {
            id: "inv1",
            invNumber: "INV-001",
            status: "sent",
            grandTotal: 1_000_000,
            paidTotal: 0,
          },
        ],
      },
    };
    const p = computeProjectProgress(q);
    const by = stageMap(q);

    expect(by.invoice.state).toBe("done");
    expect(by.payment.state).toBe("current");
    expect(p.latestStage).toBe("payment");
    expect(by.invoice.href).toBe(invoiceHref("inv1"));
    expect(by.payment.href).toBe(paymentHref("cust1"));
  });

  it("draft/void invoices do not complete Invoice stage", () => {
    const by = stageMap({
      id: "q",
      status: "won",
      convertedSoId: "so1",
      convertedSo: {
        id: "so1",
        status: "delivered",
        deliveries: [{ id: "do1", status: "sent" }],
        invoices: [
          {
            id: "inv-d",
            status: "draft",
            grandTotal: 100,
            paidTotal: 0,
          },
          {
            id: "inv-v",
            status: "void",
            grandTotal: 100,
            paidTotal: 0,
          },
        ],
      },
    });
    expect(by.invoice.state).toBe("current");
    expect(by.payment.state).toBe("todo");
  });

  it("partial payment keeps Pembayaran current", () => {
    const q: QuotationWithChain = {
      id: "q6",
      status: "won",
      convertedSoId: "so1",
      customer: { id: "cust1" },
      convertedSo: {
        id: "so1",
        status: "delivered",
        deliveries: [{ id: "do1", status: "sent" }],
        invoices: [
          {
            id: "inv1",
            invNumber: "INV-001",
            status: "partially_paid",
            grandTotal: 1_000_000,
            paidTotal: 400_000,
          },
        ],
      },
    };
    const p = computeProjectProgress(q);
    const by = stageMap(q);

    expect(by.invoice.state).toBe("done");
    expect(by.payment.state).toBe("current");
    expect(p.latestStage).toBe("payment");
    expect(by.payment.href).toBe(paymentHref("cust1"));
    expect(by.payment.label).toContain("Sebagian dibayar");
  });

  it("full payment marks Pembayaran done", () => {
    const q: QuotationWithChain = {
      id: "q7",
      status: "won",
      convertedSoId: "so1",
      customer: { id: "cust1" },
      convertedSo: {
        id: "so1",
        status: "closed",
        deliveries: [{ id: "do1", status: "received" }],
        invoices: [
          {
            id: "inv1",
            invNumber: "INV-001",
            status: "paid",
            grandTotal: 500,
            paidTotal: 500,
          },
          {
            id: "inv2",
            invNumber: "INV-002",
            status: "paid",
            grandTotal: 250.5,
            // within 0.01 tolerance
            paidTotal: 250.5,
          },
        ],
      },
    };
    const p = computeProjectProgress(q);
    const by = stageMap(q);

    expect(by.payment.state).toBe("done");
    expect(p.latestStage).toBe("payment");
    expect(p.stages.every((s) => s.state === "done")).toBe(true);
  });

  it("payment uses 0.01 money tolerance", () => {
    const by = stageMap({
      id: "q",
      status: "won",
      convertedSoId: "so1",
      convertedSo: {
        id: "so1",
        status: "closed",
        deliveries: [{ id: "do1", status: "sent" }],
        invoices: [
          {
            id: "inv1",
            status: "paid",
            grandTotal: 100,
            paidTotal: 99.995,
          },
        ],
      },
    });
    expect(by.payment.state).toBe("done");
  });

  it("all non-void invoices must be paid; one partial blocks done", () => {
    const by = stageMap({
      id: "q",
      status: "won",
      convertedSoId: "so1",
      convertedSo: {
        id: "so1",
        status: "delivered",
        deliveries: [{ id: "do1", status: "sent" }],
        invoices: [
          {
            id: "inv1",
            status: "paid",
            grandTotal: 100,
            paidTotal: 100,
          },
          {
            id: "inv2",
            status: "partially_paid",
            grandTotal: 200,
            paidTotal: 50,
          },
        ],
      },
    });
    expect(by.payment.state).toBe("current");
  });

  it("void invoices are ignored for payment completion", () => {
    const by = stageMap({
      id: "q",
      status: "won",
      convertedSoId: "so1",
      convertedSo: {
        id: "so1",
        status: "closed",
        deliveries: [{ id: "do1", status: "sent" }],
        invoices: [
          {
            id: "inv1",
            status: "paid",
            grandTotal: 100,
            paidTotal: 100,
          },
          {
            id: "inv-void",
            status: "void",
            grandTotal: 999,
            paidTotal: 0,
          },
        ],
      },
    });
    expect(by.payment.state).toBe("done");
  });

  it("lost / superseded stop at Penawaran", () => {
    for (const status of ["lost", "superseded"]) {
      const p = computeProjectProgress({
        id: `q-${status}`,
        status,
        noSurat: "QT-X",
      });
      const by = Object.fromEntries(p.stages.map((s) => [s.stage, s]));

      expect(by.quotation.state).toBe("current");
      expect(by["sales-order"].state).toBe("todo");
      expect(by.delivery.state).toBe("todo");
      expect(by.invoice.state).toBe("todo");
      expect(by.payment.state).toBe("todo");
      expect(p.latestStage).toBe("quotation");
      expect(p.latestRefId).toBe(`q-${status}`);
    }
  });

  it("cancelled SO does not complete Sales Order stage", () => {
    const by = stageMap({
      id: "q",
      status: "won",
      convertedSoId: "so1",
      convertedSo: {
        id: "so1",
        soNumber: "SO-001",
        status: "cancelled",
        deliveries: [],
        invoices: [],
      },
    });
    expect(by.quotation.state).toBe("done");
    expect(by["sales-order"].state).toBe("current");
    expect(by.delivery.state).toBe("todo");
  });

  it("convertedSoId alone (without nested SO) still completes Sales Order", () => {
    const p = computeProjectProgress({
      id: "q",
      status: "won",
      convertedSoId: "so-only",
    });
    expect(p.stages.find((s) => s.stage === "sales-order")?.state).toBe("done");
    expect(p.latestStage).toBe("sales-order");
    expect(p.latestRefId).toBe("so-only");
  });
});
