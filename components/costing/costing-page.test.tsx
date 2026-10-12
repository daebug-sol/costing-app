import { renderToStaticMarkup } from "react-dom/server";
import { I18nProvider } from "@/components/i18n-provider";
import { MarginsCard } from "@/components/costing/margins-card";
import { ProjectPriceBar } from "@/components/costing/project-price-bar";
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
    const html = wrap(<ProjectPriceBar totals={zeroTotals} saveState="idle" onRetry={() => {}} />);
    expect(html).toContain("Total biaya");
    expect(html).toContain("Harga jual");
    expect(html).toContain("Per unit");
    expect(html).toContain(formatIDR(0));
  });

  it("shows Tersimpan after a save", () => {
    const html = wrap(<ProjectPriceBar totals={zeroTotals} saveState="saved" onRetry={() => {}} />);
    expect(html).toContain("Tersimpan");
  });

  it("offers Coba lagi when saving failed", () => {
    const html = wrap(<ProjectPriceBar totals={zeroTotals} saveState="error" onRetry={() => {}} />);
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
    expect((html.match(/<input/g) ?? []).length).toBeGreaterThanOrEqual(6);
  });
});
