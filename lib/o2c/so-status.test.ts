import {
  deriveSoStatusFromDelivered,
  remainingQty,
  validateDeliveryQtys,
} from "@/lib/o2c/so-status";

describe("so-status / delivery qty", () => {
  it("derives open / partial / delivered", () => {
    expect(
      deriveSoStatusFromDelivered(
        [
          { qty: 2, deliveredQty: 0 },
          { qty: 1, deliveredQty: 0 },
        ],
        "open"
      )
    ).toBe("open");

    expect(
      deriveSoStatusFromDelivered(
        [
          { qty: 2, deliveredQty: 1 },
          { qty: 1, deliveredQty: 0 },
        ],
        "open"
      )
    ).toBe("partially_delivered");

    expect(
      deriveSoStatusFromDelivered(
        [
          { qty: 2, deliveredQty: 2 },
          { qty: 1, deliveredQty: 1 },
        ],
        "open"
      )
    ).toBe("delivered");
  });

  it("preserves closed/cancelled", () => {
    expect(
      deriveSoStatusFromDelivered([{ qty: 1, deliveredQty: 1 }], "closed")
    ).toBe("closed");
  });

  it("validates remaining qty", () => {
    const soItems = [
      { id: "a", qty: 5, deliveredQty: 3 },
      { id: "b", qty: 2, deliveredQty: 0 },
    ];
    expect(remainingQty(5, 3)).toBe(2);

    expect(
      validateDeliveryQtys(soItems, [{ soItemId: "a", qtyDelivered: 2 }]).ok
    ).toBe(true);

    const over = validateDeliveryQtys(soItems, [
      { soItemId: "a", qtyDelivered: 3 },
    ]);
    expect(over.ok).toBe(false);

    const missing = validateDeliveryQtys(soItems, [
      { soItemId: "missing", qtyDelivered: 1 },
    ]);
    expect(missing.ok).toBe(false);
  });
});
