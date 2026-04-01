import type {
  ProjectDoc,
  QuotationLineItemDoc,
  SectionDoc,
} from "@/lib/generators/document-types";
import { parseAhuRecalcParams, resolveDamperModes } from "@/lib/ahu-recalc-params";
import {
  describeCostingScopeLabel,
  normalizeCostingScope,
  resolveActiveModules,
} from "@/lib/costing-scope";
import { formatNumber } from "@/lib/utils/format";

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
    /** Persisted AHU recalc options (coil, damper FA/RA, fan motor, …). */
    ahuRecalcParams?: unknown;
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

function segmentSpecLineFullAhu(
  seg: NonNullable<CostingProjectApi["segments"]>[number]
): string {
  const parts: string[] = [];
  if (seg.type === "ahu") {
    if (seg.ahuModel?.trim()) parts.push(`Model: ${seg.ahuModel.trim()}`);
    if (seg.ahuRef?.trim()) parts.push(`Ref: ${seg.ahuRef.trim()}`);
  }
  const h = seg.dimH ?? null;
  const w = seg.dimW ?? null;
  const d = seg.dimD ?? null;
  if (h != null && w != null && d != null) {
    parts.push(`Dimensi H×W×D: ${h} × ${w} × ${d} mm`);
  } else if (h != null || w != null || d != null) {
    parts.push(`Dimensi: ${h ?? "—"} × ${w ?? "—"} × ${d ?? "—"} mm`);
  }
  if (seg.flowCMH != null) parts.push(`Flow: ${formatNumber(seg.flowCMH)} CMH`);
  if (seg.profileType?.trim()) parts.push(`Profil: ${seg.profileType.trim()}`);
  return parts.join(" · ");
}

function coilThermoSpecFromParams(
  coil: ReturnType<typeof parseAhuRecalcParams>["coil"]
): string {
  if (!coil) return "";
  const parts: string[] = [];
  if (coil.Qc != null && Number.isFinite(coil.Qc)) {
    parts.push(`Qc: ${formatNumber(coil.Qc)} kW`);
  }
  if (coil.Qs != null && Number.isFinite(coil.Qs)) {
    parts.push(`Qs: ${formatNumber(coil.Qs)} kW`);
  }
  if (coil.FH != null && coil.FL != null) {
    parts.push(`Dimensi coil: ${coil.FH} × ${coil.FL} mm`);
  } else if (coil.FH != null) {
    parts.push(`FH: ${coil.FH} mm`);
  } else if (coil.FL != null) {
    parts.push(`FL: ${coil.FL} mm`);
  }
  if (coil.rows != null) parts.push(`Rows: ${coil.rows}`);
  if (coil.FPI != null) parts.push(`FPI: ${formatNumber(coil.FPI)}`);
  if (coil.circuits != null) parts.push(`Sirkuit: ${coil.circuits}`);
  return parts.join(" · ");
}

function partialAhuSummaryLine(
  seg: NonNullable<CostingProjectApi["segments"]>[number]
): string {
  const params = parseAhuRecalcParams(seg.ahuRecalcParams);
  const scope = normalizeCostingScope(params.costingScope);
  const m = resolveActiveModules(scope);
  const head: string[] = [describeCostingScopeLabel(scope)];
  if (seg.type === "ahu") {
    if (seg.ahuModel?.trim()) head.push(`Model: ${seg.ahuModel.trim()}`);
    if (seg.ahuRef?.trim()) head.push(`Ref: ${seg.ahuRef.trim()}`);
  }
  if (m.coil) {
    const c = coilThermoSpecFromParams(params.coil);
    if (c) head.push(c);
  }
  if (m.damper) {
    const dm = params.damper ?? {};
    if (dm.W != null && dm.H != null) {
      head.push(`Damper ${dm.W}×${dm.H} mm`);
    }
    const { fa, ra } = resolveDamperModes(params.damper);
    head.push(fa && ra ? "FA+RA" : fa ? "FA" : "RA");
  }
  if (m.fanMotor) {
    const fm = params.fanMotor ?? {};
    if (fm.fanModel?.trim()) head.push(`Fan: ${fm.fanModel.trim()}`);
    if (fm.motorKW != null) head.push(`Motor: ${formatNumber(fm.motorKW)} kW`);
  }
  const h = seg.dimH ?? null;
  const w = seg.dimW ?? null;
  const d = seg.dimD ?? null;
  if (
    (m.framePanel || m.skid || m.structure || m.drainPan) &&
    h != null &&
    w != null &&
    d != null
  ) {
    head.push(`Casing H×W×D: ${h} × ${w} × ${d} mm`);
  }
  if ((m.framePanel || scope.isFullAhu) && seg.profileType?.trim()) {
    head.push(`Profil: ${seg.profileType.trim()}`);
  }
  if (seg.flowCMH != null && (scope.isFullAhu || m.fanMotor)) {
    head.push(`Flow: ${formatNumber(seg.flowCMH)} CMH`);
  }
  return head.filter(Boolean).join(" · ");
}

/**
 * Spesifikasi per baris BOM / sub-assembly — untuk modular costing, tiap kategori
 * boleh hanya menampilkan data yang relevan (mis. Coil → termodinamika + dimensi coil).
 */
export function ahuSegmentSpecForCategory(
  seg: NonNullable<CostingProjectApi["segments"]>[number],
  category: string
): string {
  if (seg.type !== "ahu") return segmentSpecLineFromSegment(seg);
  const params = parseAhuRecalcParams(seg.ahuRecalcParams);
  const scope = normalizeCostingScope(params.costingScope);
  if (scope.isFullAhu) return segmentSpecLineFullAhu(seg);

  const m = resolveActiveModules(scope);
  const shortCat =
    category.includes(": ") && category.split(": ").length > 1
      ? (category.split(": ").pop()?.trim() ?? category)
      : category.trim();

  const headerBits: string[] = [];
  if (seg.ahuModel?.trim()) headerBits.push(`Model: ${seg.ahuModel.trim()}`);
  if (seg.ahuRef?.trim()) headerBits.push(`Ref: ${seg.ahuRef.trim()}`);
  const header = headerBits.join(" · ");

  if (shortCat === "Coil" && m.coil) {
    const coil = coilThermoSpecFromParams(params.coil);
    return [header, coil].filter(Boolean).join(" · ");
  }
  if (shortCat === "Damper" && m.damper) {
    const dm = params.damper ?? {};
    const dim =
      dm.W != null && dm.H != null ? `Damper ${dm.W}×${dm.H} mm` : "";
    const { fa, ra } = resolveDamperModes(params.damper);
    const mode = fa && ra ? "FA + RA" : fa ? "FA" : "RA";
    return [header, dim, `Mode: ${mode}`].filter(Boolean).join(" · ");
  }
  if (shortCat === "Fan & Motor" && m.fanMotor) {
    const fm = params.fanMotor ?? {};
    const bits: string[] = [];
    if (header) bits.push(header);
    if (fm.fanModel?.trim()) bits.push(`Fan: ${fm.fanModel.trim()}`);
    if (fm.motorKW != null) bits.push(`Motor: ${formatNumber(fm.motorKW)} kW`);
    if (fm.motorPoles != null) bits.push(`${fm.motorPoles} pol`);
    if (fm.qty != null) bits.push(`Qty: ${fm.qty}`);
    if (seg.flowCMH != null) bits.push(`Flow: ${formatNumber(seg.flowCMH)} CMH`);
    return bits.join(" · ");
  }
  if (
    (shortCat === "Frame & Panel" ||
      shortCat === "Skid" ||
      shortCat === "Structure" ||
      shortCat === "Drain Pan") &&
    (m.framePanel || m.skid || m.structure || m.drainPan)
  ) {
    return segmentSpecLineFullAhu(seg);
  }

  return partialAhuSummaryLine(seg);
}

/**
 * Saran judul perihal quotation (user boleh override di form).
 * Contoh: coil-only → "Quotation for AHU Coil Replacement / Sparepart".
 */
export function defaultQuotationPerihalForAhuSegment(
  seg: NonNullable<CostingProjectApi["segments"]>[number]
): string | null {
  if (seg.type !== "ahu") return null;
  const scope = normalizeCostingScope(
    parseAhuRecalcParams(seg.ahuRecalcParams).costingScope
  );
  if (scope.isFullAhu) return null;
  const m = resolveActiveModules(scope);
  const n =
    Number(m.framePanel) +
    Number(m.skid) +
    Number(m.structure) +
    Number(m.drainPan) +
    Number(m.coil) +
    Number(m.damper) +
    Number(m.fanMotor);
  if (n !== 1) return null;
  if (m.coil) return "Quotation for AHU Coil Replacement / Sparepart";
  if (m.damper) return "Quotation for AHU Damper / Sparepart";
  if (m.fanMotor) return "Quotation for AHU Fan & Motor / Sparepart";
  if (m.framePanel || m.skid || m.structure || m.drainPan) {
    return "Quotation for AHU Casing Components / Sparepart";
  }
  return null;
}

/** Satu baris teks spesifikasi otomatis dari segmen AHU/manual (model, dimensi, flow, …). */
export function segmentSpecLineFromSegment(
  seg: NonNullable<CostingProjectApi["segments"]>[number]
): string {
  if (seg.type === "ahu") {
    const scope = normalizeCostingScope(
      parseAhuRecalcParams(seg.ahuRecalcParams).costingScope
    );
    if (!scope.isFullAhu) return partialAhuSummaryLine(seg);
  }
  return segmentSpecLineFullAhu(seg);
}

/** Alokasi `lineTotal` ke tiap bobot proporsional; hasil bilangan bulat (IDR) dan jumlah = lineTotal. */
export function allocateProportionalTotals(
  lineTotal: number,
  weights: number[]
): number[] {
  const n = weights.length;
  if (n === 0) return [];
  const sumW = weights.reduce((a, b) => a + b, 0);
  const target = Math.round(lineTotal);
  if (sumW <= 0) {
    const base = Math.floor(target / n);
    const rem = target - base * n;
    return weights.map((_, i) => base + (i < rem ? 1 : 0));
  }
  const raw = weights.map((w) => (target * w) / sumW);
  const rounded = raw.map((x) => Math.round(x));
  let diff = target - rounded.reduce((a, b) => a + b, 0);
  let i = rounded.length - 1;
  while (diff !== 0 && i >= 0) {
    if (diff > 0) {
      rounded[i] = (rounded[i] ?? 0) + 1;
      diff -= 1;
    } else {
      rounded[i] = (rounded[i] ?? 0) - 1;
      diff += 1;
    }
    i--;
  }
  return rounded;
}

type SectionRollupMeta = {
  category: string;
  weight: number;
  spec: string;
};

function buildSubAssemblyRollupMeta(p: CostingProjectApi): SectionRollupMeta[] {
  const segs = [...(p.segments ?? [])].sort(
    (a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0)
  );
  const multi = segs.length > 1;
  const out: SectionRollupMeta[] = [];

  segs.forEach((seg, segIdx) => {
    const ordinal = segIdx + 1;
    const label = segmentLabel(
      seg,
      seg.type === "manual" ? "Manual" : "AHU",
      ordinal
    );
    if (seg.type === "ahu" && seg.sections?.length) {
      for (const sec of seg.sections) {
        const spec = ahuSegmentSpecForCategory(seg, sec.category);
        out.push({
          category: multi ? `${label}: ${sec.category}` : sec.category,
          weight: Math.max(0, sec.subtotal),
          spec,
        });
      }
    }

    if (seg.type === "manual" && seg.manualGroups?.length) {
      const specManual = segmentSpecLineFromSegment(seg);
      for (const g of seg.manualGroups) {
        out.push({
          category: multi ? `${label} — ${g.name}` : g.name,
          weight: Math.max(0, g.subtotal),
          spec: specManual,
        });
      }
    }
  });

  return out;
}

export type QuotationFormLineRollup = {
  projectId: string;
  qty: number;
  unitPrice: number;
  /** Jika proyek tidak punya segmen terstruktur. */
  description?: string;
  spec?: string | null;
};

/**
 * Baris penawaran pelanggan: satu baris per sub-assembly (kategori/section),
 * harga mengikuti alokasi proporsional dari total jual baris penawaran.
 * Spesifikasi diisi otomatis dari data segmen (model, dimensi, flow).
 */
export function quotationSubAssemblyLineItemsFromProjects(
  formLines: QuotationFormLineRollup[],
  projectsById: Map<string, CostingProjectApi>
): QuotationLineItemDoc[] {
  const result: QuotationLineItemDoc[] = [];

  for (const line of formLines) {
    const p = projectsById.get(line.projectId);
    const lineTotal = Math.round(line.qty * line.unitPrice);

    if (!p) {
      result.push({
        description: line.description ?? "Item",
        spec: line.spec ?? null,
        qty: line.qty,
        uom: "Unit",
        unitPrice: line.unitPrice,
        totalPrice: lineTotal,
      });
      continue;
    }

    const meta = buildSubAssemblyRollupMeta(p);
    if (meta.length === 0) {
      const titles = segmentTitlesSpecFromProject(p);
      const specCombined =
        line.spec?.trim() || (titles.trim() ? titles : null);
      result.push({
        description: line.description ?? p.name,
        spec: specCombined,
        qty: line.qty,
        uom: "Unit",
        unitPrice: line.unitPrice,
        totalPrice: lineTotal,
      });
      continue;
    }

    const weights = meta.map((m) => m.weight);
    const totals = allocateProportionalTotals(lineTotal, weights);
    meta.forEach((m, i) => {
      const t = totals[i] ?? 0;
      result.push({
        description: m.category,
        spec: m.spec.trim() ? m.spec : null,
        qty: 1,
        uom: "Unit",
        unitPrice: t,
        totalPrice: t,
      });
    });
  }

  return result;
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
