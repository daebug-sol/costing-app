import { renderToStaticMarkup } from "react-dom/server";
import { DotMeter } from "@/components/dot/dot-meter";
import { DotNumber } from "@/components/dot/dot-number";
import { DotRing } from "@/components/dot/dot-ring";
import { Sparkline } from "@/components/dot/sparkline";

const count = (html: string, needle: string) => html.split(needle).length - 1;

describe("dot primitives", () => {
  it("DotMeter draws `cols` dots, lights the share and marks the pace pointer", () => {
    const html = renderToStaticMarkup(
      <DotMeter value={50} cols={20} pace={25} label="Target tercapai 50 persen" />
    );
    expect(html).toContain('aria-label="Target tercapai 50 persen"');
    expect(count(html, "<circle")).toBe(20);
    expect(count(html, "fill-signal")).toBe(1);
    expect(count(html, "fill-foreground")).toBe(9); // 10 lit, one of them is the pointer
  });

  it("DotMeter without pace has no signal dot", () => {
    const html = renderToStaticMarkup(<DotMeter value={0} cols={10} label="Kosong" />);
    expect(count(html, "fill-signal")).toBe(0);
    expect(count(html, "fill-foreground")).toBe(0);
  });

  it("DotRing renders every dot and its centre content", () => {
    const html = renderToStaticMarkup(
      <DotRing value={60} label="60 persen" pointer>
        <DotNumber>60%</DotNumber>
      </DotRing>
    );
    expect(count(html, "<circle")).toBe(72);
    expect(count(html, "fill-signal")).toBe(1);
    expect(html).toContain("60%");
  });

  it("Sparkline renders nothing for fewer than two points and is aria-hidden otherwise", () => {
    expect(renderToStaticMarkup(<Sparkline data={[1]} tone="signal" direction="down" />)).toBe("");
    const html = renderToStaticMarkup(
      <Sparkline data={[1, 2, 3]} reference={2} tone="positive" direction="up" />
    );
    expect(html).toContain('aria-hidden="true"');
    expect(html).toContain("fill-positive");
  });
});
