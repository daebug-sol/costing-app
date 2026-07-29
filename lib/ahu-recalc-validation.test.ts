import { validateAhuRecalculateContext } from "./ahu-recalc-validation";

describe("validateAhuRecalculateContext", () => {
  const dims = { dimH: 1420, dimW: 1930, dimD: 1625 };

  it("accepts Full AHU with only casing dims (no module params)", () => {
    const r = validateAhuRecalculateContext({ ...dims, merged: {} });
    expect(r).toEqual({ ok: true });
  });

  it("treats accessDoor.height 0 as missing and falls back to casing H", () => {
    const r = validateAhuRecalculateContext({
      ...dims,
      merged: {
        accessDoor: { qty: 1, height: 0 },
        nSections: 3,
        sectionLayout: "horizontal",
      },
    });
    expect(r).toEqual({ ok: true });
  });

  it("rejects Full AHU when casing dims missing", () => {
    const r = validateAhuRecalculateContext({
      dimH: null,
      dimW: null,
      dimD: null,
      merged: {},
    });
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.message).toMatch(/Dimensi casing/i);
    }
  });

  it("requires electric heater load only in partial scope", () => {
    const partial = validateAhuRecalculateContext({
      ...dims,
      merged: {
        costingScope: {
          isFullAhu: false,
          includeElectricHeater: true,
        },
      },
    });
    expect(partial.ok).toBe(false);
    if (!partial.ok) {
      expect(partial.message).toMatch(/Electric Heater/i);
    }

    const full = validateAhuRecalculateContext({
      ...dims,
      merged: { electricHeater: { totalLoadKW: 0 } },
    });
    expect(full).toEqual({ ok: true });
  });
});
