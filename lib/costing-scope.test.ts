import {
  normalizeCostingScope,
  requiresCasingDimensions,
  resolveActiveModules,
} from "./costing-scope";

describe("normalizeCostingScope", () => {
  it("defaults to full AHU when undefined", () => {
    const s = normalizeCostingScope(undefined);
    expect(s.isFullAhu).toBe(true);
    expect(resolveActiveModules(s).coil).toBe(true);
  });

  it("respects partial coil-only", () => {
    const s = normalizeCostingScope({
      isFullAhu: false,
      includeCoil: true,
    });
    expect(s.isFullAhu).toBe(false);
    const m = resolveActiveModules(s);
    expect(m.coil).toBe(true);
    expect(m.framePanel).toBe(false);
    expect(requiresCasingDimensions(s)).toBe(false);
  });

  it("infers partial mode when include* is set without isFullAhu", () => {
    const s = normalizeCostingScope({ includeCoil: true });
    expect(s.isFullAhu).toBe(false);
    expect(resolveActiveModules(s).coil).toBe(true);
    expect(resolveActiveModules(s).framePanel).toBe(false);
  });

  it("empty costingScope object stays full AHU", () => {
    const s = normalizeCostingScope({});
    expect(s.isFullAhu).toBe(true);
  });

  it("requires casing dims when frame is included", () => {
    const s = normalizeCostingScope({
      isFullAhu: false,
      includeFramePanel: true,
    });
    expect(requiresCasingDimensions(s)).toBe(true);
  });
});
