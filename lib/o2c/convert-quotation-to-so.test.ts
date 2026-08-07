import { convertQuotationToSo } from "@/lib/o2c/convert-quotation-to-so";

function makeTx(overrides?: {
  quotation?: Record<string, unknown> | null;
}) {
  const created: { so?: Record<string, unknown>; quoUpdate?: Record<string, unknown> } =
    {};
  const quotation =
    overrides && "quotation" in overrides
      ? overrides.quotation
      : {
          id: "q1",
          organizationId: "org-a",
          customerId: "c1",
          status: "won",
          convertedSoId: null,
          wonAt: null,
          clientName: "Budi",
          clientCompany: "PT Alpha",
          clientAddress: "Jakarta",
          clientAttn: "Budi",
          clientPhone: "081",
          totalBeforeDisc: 1000,
          totalAfterDisc: 900,
          totalPPN: 99,
          grandTotal: 999,
          discountEnabled: true,
          paymentTerms: "DP 50%",
          deliveryTerms: "Ex-work",
          notes: null,
          items: [
            {
              id: "qi1",
              projectId: "p1",
              description: "AHU",
              spec: null,
              qty: 2,
              uom: "Unit",
              unitPrice: 500,
              totalPrice: 1000,
              sortOrder: 0,
            },
          ],
          customer: {
            id: "c1",
            name: "Budi",
            company: "PT Alpha",
            address: "Jakarta",
            attn: "Budi",
            phone: "081",
          },
        };

  const tx = {
    quotation: {
      findFirst: jest.fn(async () => quotation),
      update: jest.fn(async ({ data }: { data: Record<string, unknown> }) => {
        created.quoUpdate = data;
        return { ...quotation, ...data };
      }),
    },
    customer: {
      create: jest.fn(),
      findFirst: jest.fn(async () => quotation?.customer ?? null),
    },
    salesOrder: {
      create: jest.fn(async ({ data }: { data: Record<string, unknown> }) => {
        created.so = data;
        return data;
      }),
    },
    appSettings: {
      findUnique: jest.fn(async () => ({
        quoPrefix: "QT",
        soPrefix: "SO",
        doPrefix: "SJ",
        invPrefix: "INV",
        payPrefix: "PAY",
      })),
    },
    documentSequence: {
      upsert: jest.fn(async () => ({ lastNumber: 1 })),
    },
  };

  return { tx, created };
}

describe("convertQuotationToSo", () => {
  it("copies header/items as price snapshots and marks quotation won", async () => {
    const { tx, created } = makeTx();
    const result = await convertQuotationToSo(tx as never, "org-a", "q1");

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.soNumber).toMatch(/^SO-\d{6}-0001$/);
    expect(created.so?.items).toBeDefined();
    const items = (created.so?.items as { create: Array<{ unitPrice: number; qty: number }> })
      .create;
    expect(items[0].unitPrice).toBe(500);
    expect(items[0].qty).toBe(2);
    expect(created.quoUpdate?.status).toBe("won");
    expect(created.quoUpdate?.convertedSoId).toBe(result.salesOrderId);
  });

  it("rejects draft quotations without forceWon", async () => {
    const { tx } = makeTx({
      quotation: {
        id: "q1",
        organizationId: "org-a",
        status: "draft",
        convertedSoId: null,
        items: [{ id: "qi1", qty: 1, unitPrice: 1, totalPrice: 1, sortOrder: 0, description: "x", projectId: "p1", uom: "Unit", spec: null }],
        customer: null,
        customerId: null,
        clientName: "A",
        clientCompany: "",
        clientAddress: "",
        clientAttn: "",
        clientPhone: "",
        totalBeforeDisc: 1,
        totalAfterDisc: 1,
        totalPPN: 0,
        grandTotal: 1,
        discountEnabled: true,
      },
    });
    const result = await convertQuotationToSo(tx as never, "org-a", "q1");
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.status).toBe(400);
  });

  it("rejects already converted quotations", async () => {
    const { tx } = makeTx({
      quotation: {
        id: "q1",
        organizationId: "org-a",
        status: "won",
        convertedSoId: "so-existing",
        items: [],
        customer: null,
        customerId: "c1",
      },
    });
    const result = await convertQuotationToSo(tx as never, "org-a", "q1");
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.status).toBe(409);
  });
});
