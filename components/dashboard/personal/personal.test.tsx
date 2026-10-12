import { renderToStaticMarkup } from "react-dom/server";
import { FollowUpList } from "@/components/dashboard/personal/follow-up-list";
import { greetingForHour } from "@/components/dashboard/personal/greeting-card";
import { RichLine } from "@/components/dashboard/personal/rich-line";
import { TargetCard } from "@/components/dashboard/personal/target-card";
import { I18nProvider } from "@/components/i18n-provider";
import { EMPTY_DASHBOARD_RESPONSE } from "@/lib/dashboard-contract";

const wrap = (node: React.ReactNode) => renderToStaticMarkup(<I18nProvider>{node}</I18nProvider>);
const personal = EMPTY_DASHBOARD_RESPONSE.personal;

describe("greetingForHour", () => {
  it("maps hours to the four greetings", () => {
    expect(greetingForHour(0)).toBe("malam");
    expect(greetingForHour(10)).toBe("pagi");
    expect(greetingForHour(11)).toBe("siang");
    expect(greetingForHour(14)).toBe("siang");
    expect(greetingForHour(15)).toBe("sore");
    expect(greetingForHour(17)).toBe("sore");
    expect(greetingForHour(18)).toBe("malam");
  });
});

describe("RichLine", () => {
  it("renders **bold** segments with the given tone classes in order", () => {
    const html = renderToStaticMarkup(
      <RichLine text="Ada **3 butir** dan **1 order**." tones={["signal", "positive"]} />
    );
    expect(html).toContain('<b class="text-signal font-semibold">3 butir</b>');
    expect(html).toContain('<b class="text-positive font-semibold">1 order</b>');
    expect(html.startsWith("<span>Ada ")).toBe(true);
  });
});

describe("FollowUpList", () => {
  it("shows titles, parties and the overdue tag", () => {
    const html = wrap(
      <FollowUpList
        total={1}
        items={[{ id: "i1", kind: "invoice-overdue", ref: "INV-0412", party: "PT Arga", dueLabel: "overdue", overdueDays: 1 }]}
      />
    );
    expect(html).toContain("Tagih faktur INV-0412");
    expect(html).toContain("PT Arga");
    expect(html).toContain("Terlambat 1 hari");
  });

  it("shows an empty state", () => {
    expect(wrap(<FollowUpList total={0} items={[]} />)).toContain("Tidak ada tindak lanjut");
  });
});

describe("TargetCard", () => {
  it("asks to set a target when none exists and draws no meter", () => {
    const html = wrap(<TargetCard personal={personal} canEditTarget onSaved={() => {}} now={new Date("2026-10-11T00:00:00Z")} />);
    expect(html).toContain("Atur target");
    expect(html).not.toContain("<circle");
  });

  it("shows remaining and meter with a target", () => {
    const html = wrap(
      <TargetCard
        canEditTarget
        onSaved={() => {}}
        now={new Date("2026-10-11T00:00:00Z")}
        personal={{ ...personal, monthlyTarget: 450_000_000, bookedThisMonth: 270_000_000, remaining: 180_000_000, progressPct: 60, idealPct: 35.5, paceDeltaValue: 110_000_000, daysLeftInMonth: 20, bestMonth: { month: "2026-08", booked: 420_000_000 } }}
      />
    );
    expect(html).toContain("Sisa Rp 180 jt");
    expect(html).toContain("<circle");
    expect(html).toContain("Rp 420 jt");
  });
});
