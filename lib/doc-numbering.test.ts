import { formatDocumentNumber, periodYYYYMM } from "@/lib/doc-numbering";
import { DOC_TYPES } from "@/lib/o2c/status";

describe("doc-numbering helpers", () => {
  it("formats PREFIX-YYYYMM-seq4", () => {
    expect(formatDocumentNumber("QT", "202608", 1)).toBe("QT-202608-0001");
    expect(formatDocumentNumber("SO", "202601", 42)).toBe("SO-202601-0042");
  });

  it("builds YYYYMM period", () => {
    expect(periodYYYYMM(new Date("2026-08-04T12:00:00.000Z"))).toBe("202608");
  });

  it("exposes expected doc types", () => {
    expect(DOC_TYPES.QUO).toBe("QUO");
    expect(DOC_TYPES.SO).toBe("SO");
    expect(DOC_TYPES.DO).toBe("DO");
    expect(DOC_TYPES.INV).toBe("INV");
    expect(DOC_TYPES.PAY).toBe("PAY");
  });
});

describe("nextDocumentNumber (transaction mock)", () => {
  it("increments sequence per org/period and formats with prefix", async () => {
    const { nextDocumentNumber } = await import("@/lib/doc-numbering");

    let lastNumber = 0;
    const tx = {
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
        upsert: jest.fn(async () => {
          lastNumber += 1;
          return { lastNumber };
        }),
      },
    };

    const a = await nextDocumentNumber(DOC_TYPES.QUO, "org-a", tx as never, {
      at: new Date("2026-08-04T00:00:00.000Z"),
    });
    const b = await nextDocumentNumber(DOC_TYPES.QUO, "org-a", tx as never, {
      at: new Date("2026-08-04T00:00:00.000Z"),
    });

    expect(a).toBe("QT-202608-0001");
    expect(b).toBe("QT-202608-0002");
    expect(tx.documentSequence.upsert).toHaveBeenCalledTimes(2);
  });

  it("keeps separate counters per org when upsert keys differ", async () => {
    const { nextDocumentNumber } = await import("@/lib/doc-numbering");
    const counters = new Map<string, number>();

    const tx = {
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
        upsert: jest.fn(
          async (args: {
            where: {
              organizationId_docType_period: {
                organizationId: string;
                docType: string;
                period: string;
              };
            };
          }) => {
            const key = JSON.stringify(args.where.organizationId_docType_period);
            const n = (counters.get(key) ?? 0) + 1;
            counters.set(key, n);
            return { lastNumber: n };
          }
        ),
      },
    };

    const at = new Date("2026-08-04T00:00:00.000Z");
    const a1 = await nextDocumentNumber(DOC_TYPES.QUO, "org-a", tx as never, {
      at,
    });
    const b1 = await nextDocumentNumber(DOC_TYPES.QUO, "org-b", tx as never, {
      at,
    });
    const a2 = await nextDocumentNumber(DOC_TYPES.QUO, "org-a", tx as never, {
      at,
    });

    expect(a1).toBe("QT-202608-0001");
    expect(b1).toBe("QT-202608-0001");
    expect(a2).toBe("QT-202608-0002");
  });
});
