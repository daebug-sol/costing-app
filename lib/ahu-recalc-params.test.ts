import {
  mergeRecalcParams,
  normalizeSectionLayout,
} from "@/lib/ahu-recalc-params";

describe("normalizeSectionLayout", () => {
  it("defaults missing/invalid to horizontal", () => {
    expect(normalizeSectionLayout(undefined)).toBe("horizontal");
    expect(normalizeSectionLayout(null)).toBe("horizontal");
    expect(normalizeSectionLayout("")).toBe("horizontal");
    expect(normalizeSectionLayout("sideways")).toBe("horizontal");
  });

  it("keeps vertical", () => {
    expect(normalizeSectionLayout("vertical")).toBe("vertical");
  });
});

describe("mergeRecalcParams sectionLayout", () => {
  it("keeps stored layout when request omits it", () => {
    const merged = mergeRecalcParams(
      { nSections: 2, sectionLayout: "vertical" },
      {}
    );
    expect(merged.sectionLayout).toBe("vertical");
  });

  it("lets request override stored layout", () => {
    const merged = mergeRecalcParams(
      { sectionLayout: "horizontal" },
      { sectionLayout: "vertical" }
    );
    expect(merged.sectionLayout).toBe("vertical");
  });

  it("normalizes invalid stored/request values", () => {
    expect(
      mergeRecalcParams({ sectionLayout: "nope" as never }, {}).sectionLayout
    ).toBe("horizontal");
    expect(
      mergeRecalcParams({}, { sectionLayout: "nope" }).sectionLayout
    ).toBe("horizontal");
  });
});
