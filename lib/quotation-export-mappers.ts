import type { ProjectDoc, SectionDoc } from "@/lib/generators/document-types";

type LineRow = {
  description: string;
  uom: string;
  qty: number;
  unitPrice: number;
  subtotal: number;
};

type SectionApi = {
  category: string;
  subtotal: number;
  lineItems: LineRow[];
};

type ManualItemApi = {
  name: string;
  uom: string;
  qty: number;
  effectivePrice: number;
  subtotal: number;
};

type ManualGroupApi = {
  name: string;
  subtotal: number;
  items: ManualItemApi[];
};

/** Shape from `GET /api/projects/[id]` JSON (segments). */
export type CostingProjectApi = {
  id: string;
  name: string;
  qty: number;
  dimH?: number | null;
  dimW?: number | null;
  dimD?: number | null;
  totalHPP: number;
  overhead: number;
  contingency: number;
  eskalasi: number;
  asuransi: number;
  mobilisasi: number;
  margin: number;
  segments?: {
    type: string;
    title: string;
    sortOrder?: number;
    subtotal: number;
    ahuModel?: string | null;
    ahuRef?: string | null;
    flowCMH?: number | null;
    qty?: number;
    dimH?: number | null;
    dimW?: number | null;
    dimD?: number | null;
    profileType?: string | null;
    sections?: SectionApi[];
    manualGroups?: ManualGroupApi[];
  }[];
};

function segmentLabel(
  seg: { title?: string; type: string },
  fallback: string,
  ordinal: number
) {
  const t = seg.title?.trim();
  if (t) return t;
  return `${fallback} (${ordinal})`;
}

export function costingProjectToProjectDoc(p: CostingProjectApi): ProjectDoc {
  const firstAhu = p.segments?.find((s) => s.type === "ahu");
  return {
    name: p.name,
    ahuModel: firstAhu?.ahuModel ?? null,
    ahuRef: firstAhu?.ahuRef ?? null,
    flowCMH: firstAhu?.flowCMH ?? null,
    qty: p.qty,
    dimH: firstAhu?.dimH ?? null,
    dimW: firstAhu?.dimW ?? null,
    dimD: firstAhu?.dimD ?? null,
    totalHPP: p.totalHPP,
    overhead: p.overhead,
    contingency: p.contingency,
    eskalasi: p.eskalasi,
    asuransi: p.asuransi,
    mobilisasi: p.mobilisasi,
    margin: p.margin,
  };
}

export function costingProjectToSectionDocs(p: CostingProjectApi): SectionDoc[] {
  const segs = [...(p.segments ?? [])].sort(
    (a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0)
  );
  const multi = segs.length > 1;
  const out: SectionDoc[] = [];

  segs.forEach((seg, segIdx) => {
    const ordinal = segIdx + 1;
    const label = segmentLabel(
      seg,
      seg.type === "manual" ? "Manual" : "AHU",
      ordinal
    );

    if (seg.type === "ahu" && seg.sections?.length) {
      for (const sec of seg.sections) {
        out.push({
          category: multi ? `${label}: ${sec.category}` : sec.category,
          subtotal: sec.subtotal,
          lineItems: sec.lineItems.map((li) => ({
            description: li.description,
            uom: li.uom,
            qty: li.qty,
            unitPrice: li.unitPrice,
            subtotal: li.subtotal,
          })),
        });
      }
    }

    if (seg.type === "manual" && seg.manualGroups?.length) {
      for (const g of seg.manualGroups) {
        out.push({
          category: multi ? `${label} — ${g.name}` : g.name,
          subtotal: g.subtotal,
          lineItems: g.items.map((it) => ({
            description: it.name,
            uom: it.uom,
            qty: it.qty,
            unitPrice: it.effectivePrice,
            subtotal: it.subtotal,
          })),
        });
      }
    }
  });

  return out;
}

/** Spesifikasi penawaran default: judul segmen berurutan (boleh di-override user). */
export function segmentTitlesSpecFromProject(p: CostingProjectApi): string {
  const segs = [...(p.segments ?? [])].sort(
    (a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0)
  );
  if (segs.length === 0) return "";
  return segs
    .map((s, i) => {
      const t = s.title?.trim();
      return t || (s.type === "manual" ? `Manual (${i + 1})` : `AHU (${i + 1})`);
    })
    .join("\n");
}
