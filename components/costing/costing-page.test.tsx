import { renderToStaticMarkup } from "react-dom/server";
import { I18nProvider } from "@/components/i18n-provider";
import { MarginsCard } from "@/components/costing/margins-card";
import { ProjectPriceBar } from "@/components/costing/project-price-bar";
import { AddItemMenu } from "@/components/costing/add-item-menu";
import { SegmentCard } from "@/components/costing/segment-card";
import type { CostingWorkspaceState } from "@/components/costing/use-costing-workspace";
import { formatIDR } from "@/lib/utils/format";

const wrap = (node: React.ReactNode) =>
  renderToStaticMarkup(<I18nProvider>{node}</I18nProvider>);

const zeroTotals = {
  hpp: 0,
  oh: 0,
  cont: 0,
  esk: 0,
  asu: 0,
  mob: 0,
  totalCost: 0,
  marginAmt: 0,
  sellingBeforeAdjustment: 0,
  adjPctAmt: 0,
  adjFlatAmt: 0,
  selling: 0,
  perUnit: 0,
};

describe("ProjectPriceBar", () => {
  it("shows the three prices, zero for an empty project", () => {
    const html = wrap(<ProjectPriceBar totals={zeroTotals} saveState="idle" onRetry={() => {}} qty={1} onQtyCommit={() => {}} />);
    expect(html).toContain("Total biaya");
    expect(html).toContain("Harga jual");
    expect(html).toContain("Per unit");
    expect(html).toContain(formatIDR(0));
  });

  it("shows Tersimpan after a save", () => {
    const html = wrap(<ProjectPriceBar totals={zeroTotals} saveState="saved" onRetry={() => {}} qty={1} onQtyCommit={() => {}} />);
    expect(html).toContain("Tersimpan");
  });

  it("offers Coba lagi when saving failed", () => {
    const html = wrap(<ProjectPriceBar totals={zeroTotals} saveState="error" onRetry={() => {}} qty={1} onQtyCommit={() => {}} />);
    expect(html).toContain("Gagal menyimpan");
    expect(html).toContain("Coba lagi");
  });
});

describe("MarginsCard", () => {
  it("renders the six labeled fields", () => {
    const html = wrap(
      <MarginsCard
        marginPct={{ overhead: 5, contingency: 3, eskalasi: 0, asuransi: 0, mobilisasi: 0, margin: 20 }}
        setMarginPct={() => {}}
        useEsk
        useAsu
        useMob
        totals={zeroTotals}
        onSaveMargins={() => {}}
        onToggles={() => {}}
        saveState="idle"
      />
    );
    for (const label of ["Overhead", "Kontinjensi", "Eskalasi", "Asuransi", "Mobilisasi", "Margin"]) {
      expect(html).toContain(label);
    }
    expect(html.split("<" + "input").length - 1).toBeGreaterThanOrEqual(6);
  });
});

const edStub = (over: Record<string, unknown> = {}) =>
  ({
    ahuModuleEnabled: false,
    addManualItem: () => {},
    addManualGroupItem: () => {},
    addSegment: async () => {},
    showToast: () => {},
    confirm: async () => true,
    deleteSegment: async () => {},
    patchSegment: async () => {},
    moveSegment: () => {},
    segments: [],
    ...over,
  }) as unknown as CostingWorkspaceState;

describe("AddItemMenu", () => {
  it("empty state offers Single Item and Group Item and hides Auto-AHU when the module is off", () => {
    const html = wrap(<AddItemMenu ed={edStub()} variant="empty" />);
    expect(html).toContain("Single Item");
    expect(html).toContain("Group Item");
    expect(html).not.toContain("Auto-AHU");
  });

  it("empty state shows Auto-AHU when the module is on", () => {
    const html = wrap(<AddItemMenu ed={edStub({ ahuModuleEnabled: true })} variant="empty" />);
    expect(html).toContain("Auto-AHU");
  });

  it("inline variant is a labeled Tambah item button", () => {
    const html = wrap(<AddItemMenu ed={edStub()} variant="inline" />);
    expect(html).toContain("Tambah item");
  });
});

describe("SegmentCard", () => {
  const seg = { id: "s1", title: "Foo", type: "manual", subtotal: 0 } as unknown as CostingWorkspaceState["segments"][number];

  it("renders the name, an item menu and a collapsed toggle without grip or chevron", () => {
    const html = wrap(<SegmentCard ed={edStub()} seg={seg} index={0} open={false} onToggle={() => {}} />);
    expect(html).toContain("Foo");
    expect(html).toContain("Menu item Foo");
    expect(html).toContain("Buka atau tutup Foo");
    expect(html).toContain('aria-expanded="false"');
    expect(html).not.toContain("lucide-grip-vertical");
    expect(html).not.toContain("lucide-chevron");
  });
});
