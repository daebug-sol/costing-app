import { GState } from "jspdf";
import { jsPDF } from "jspdf/dist/jspdf.es.min.js";
import {
  computeCostSummary,
  finite,
  marginTogglesFromProject,
} from "@/lib/cost-summary";
import type {
  AppSettingsDoc,
  ProjectDoc,
  QuotationDoc,
  SectionDoc,
} from "@/lib/generators/document-types";
import { wrapMultilineForPdf } from "@/lib/pdf-text-wrap";
import { formatIDR, formatNumber } from "@/lib/utils/format";

export type {
  AppSettingsDoc,
  LineItemDoc,
  ProjectDoc,
  QuotationDoc,
  SectionDoc,
} from "@/lib/generators/document-types";

const MARGIN = 14;
const LINE = 5.2;

function fmtDate(d: Date | string): string {
  const x = typeof d === "string" ? new Date(d) : d;
  return new Intl.DateTimeFormat("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(x);
}

function addLogo(
  doc: jsPDF,
  data: string | null | undefined,
  x: number,
  y: number,
  maxW: number,
  maxH: number
) {
  if (!data || typeof data !== "string" || !data.startsWith("data:image")) return;
  const fmt = data.toLowerCase().includes("png") ? "PNG" : "JPEG";
  try {
    doc.addImage(data, fmt, x, y, maxW, maxH);
  } catch {
    /* ignore bad image data */
  }
}

function addStampOverlay(
  doc: jsPDF,
  data: string | null | undefined,
  cx: number,
  cy: number,
  maxW: number,
  maxH: number
) {
  if (!data || typeof data !== "string" || !data.startsWith("data:image")) return;
  const fmt = data.toLowerCase().includes("png") ? "PNG" : "JPEG";
  try {
    doc.saveGraphicsState();
    doc.setGState(new GState({ opacity: 0.5 }));
    const angle = (-14 * Math.PI) / 180;
    doc.addImage(
      data,
      fmt,
      cx - maxW / 2,
      cy - maxH / 2,
      maxW,
      maxH,
      undefined,
      "SLOW",
      angle
    );
    doc.restoreGraphicsState();
  } catch {
    try {
      doc.addImage(data, fmt, cx - maxW / 2, cy - maxH / 2, maxW, maxH);
    } catch {
      /* ignore */
    }
  }
}

function applyDraftWatermark(doc: jsPDF, status: string) {
  if (status.toLowerCase() !== "draft") return;
  const n = doc.getNumberOfPages();
  for (let i = 1; i <= n; i++) {
    doc.setPage(i);
    const W = doc.internal.pageSize.getWidth();
    const H = doc.internal.pageSize.getHeight();
    doc.setDrawColor(220, 60, 60);
    doc.setLineWidth(0.6);
    doc.rect(MARGIN - 2, MARGIN - 2, W - 2 * (MARGIN - 2), H - 2 * (MARGIN - 2));
    doc.setTextColor(255, 140, 140);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(48);
    doc.text("DRAFT", W / 2, H / 2, { align: "center", angle: 35 });
    doc.setTextColor(0, 0, 0);
  }
  doc.setPage(n);
}

function newDoc(): jsPDF {
  return new jsPDF({ unit: "mm", format: "a4", compress: true });
}

function ensureSpace(doc: jsPDF, y: number, need: number): number {
  const H = doc.internal.pageSize.getHeight();
  if (y + need > H - MARGIN) {
    doc.addPage();
    return MARGIN;
  }
  return y;
}

/** Sambutan multiline sebelum tabel item (Enter = baris baru; baris kosong = jeda paragraf). */
function drawQuotationIntro(doc: jsPDF, yIn: number, introText: string): number {
  const W = doc.internal.pageSize.getWidth();
  const maxW = W - 2 * MARGIN;
  let y = yIn;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  const lines = introText.split(/\r?\n/);
  for (const raw of lines) {
    if (raw === "") {
      y += LINE * 0.45;
      continue;
    }
    const wrapped = doc.splitTextToSize(raw, maxW) as string[];
    for (const w of wrapped) {
      y = ensureSpace(doc, y, LINE);
      doc.text(w, MARGIN, y);
      y += LINE;
    }
  }
  return y + 2;
}

function wrapLines(doc: jsPDF, text: string, maxW: number): string[] {
  return doc.splitTextToSize(text, maxW) as string[];
}

function summaryFromProject(project: ProjectDoc) {
  return computeCostSummary(
    finite(project.totalHPP, 0),
    project.qty,
    {
      overhead: project.overhead,
      contingency: project.contingency,
      eskalasi: project.eskalasi,
      asuransi: project.asuransi,
      mobilisasi: project.mobilisasi,
      margin: project.margin,
    },
    marginTogglesFromProject(project)
  );
}

function drawLetterhead(
  doc: jsPDF,
  quotation: QuotationDoc,
  settings: AppSettingsDoc,
  title: string
): number {
  let y = MARGIN;
  const W = doc.internal.pageSize.getWidth();
  const contentW = W - 2 * MARGIN;

  addLogo(doc, settings.companyLogo, MARGIN, y, 30, 15);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text(settings.companyName, MARGIN + 34, y + 5);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  const headAddr = wrapLines(
    doc,
    [settings.companyAddress, `${settings.companyPhone} · ${settings.companyEmail}`]
      .filter(Boolean)
      .join("\n"),
    contentW - 34
  );
  doc.text(headAddr, MARGIN + 34, y + 10);
  y += 24;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.text(title, MARGIN, y);
  y += LINE + 2;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  const toLines = [
    quotation.clientCompany ?? quotation.clientName ?? "Klien",
    quotation.clientName && quotation.clientCompany
      ? `Up. ${quotation.clientName}`
      : null,
    quotation.clientAddress,
    quotation.clientPhone ? `Telp: ${quotation.clientPhone}` : null,
  ].filter(Boolean) as string[];
  doc.text("Kepada Yth.,", MARGIN, y);
  y += LINE;
  for (const line of toLines) {
    for (const wl of wrapLines(doc, line, contentW)) {
      doc.text(wl, MARGIN, y);
      y += LINE * 0.9;
    }
  }
  y += LINE * 0.5;
  doc.text(`No. Surat: ${quotation.noSurat ?? "—"}`, MARGIN, y);
  doc.text(`Tanggal: ${fmtDate(quotation.tanggal)}`, W - MARGIN - 2, y, {
    align: "right",
  });
  y += LINE;
  doc.text(`Perihal: ${quotation.perihal ?? "—"}`, MARGIN, y);
  y += LINE;
  if (quotation.ourRef) {
    doc.text(`Our Ref: ${quotation.ourRef}`, MARGIN, y);
    y += LINE;
  }
  if (quotation.yourRef) {
    doc.text(`Your Ref: ${quotation.yourRef}`, MARGIN, y);
    y += LINE;
  }
  if (quotation.projectLocation) {
    doc.text(`Lokasi proyek: ${quotation.projectLocation}`, MARGIN, y);
    y += LINE;
  }
  y += LINE;
  return y;
}

/** Gambar teks rata kanan di x=rightX; jika lebih lebar dari maxW mm, kecilkan font sementara. */
function textRightInColumn(
  doc: jsPDF,
  text: string,
  rightX: number,
  y: number,
  maxWmm: number,
  baseSize: number
) {
  doc.setFontSize(baseSize);
  let size = baseSize;
  while (size > 6 && doc.getTextWidth(text) > maxWmm) {
    size -= 1;
    doc.setFontSize(size);
  }
  doc.text(text, rightX, y, { align: "right" });
  doc.setFontSize(baseSize);
}

/** Kolom tabel penawaran: balance — deskripsi tidak terlalu lebar; Harga sat. & Total lebih lapang. */
function quotationTableColumns(doc: jsPDF) {
  const W = doc.internal.pageSize.getWidth();
  const xEdge = W - MARGIN;
  const wNo = 9;
  const wTot = 48;
  const wUnit = 48;
  const wUom = 14;
  const wQty = 22;
  const g = 2;

  const totRight = xEdge;
  const unitRight = totRight - wTot - g;
  const uomLeft = unitRight - wUnit - g - wUom;
  const qtyRight = uomLeft - g;

  const descLeft = MARGIN + wNo + g;
  const descRight = qtyRight - g;
  const descWidthMm = Math.max(26, descRight - descLeft);

  return {
    colNo: MARGIN + 2,
    descLeft,
    descRight,
    descWidthMm,
    qtyRight,
    qtyCenter: qtyRight - wQty / 2,
    uomLeft,
    wUom,
    wQty,
    unitRight,
    unitCenter: unitRight - wUnit / 2,
    wUnit,
    totRight,
    totCenter: totRight - wTot / 2,
    wTot,
    noCenter: MARGIN + wNo / 2,
    descCenter: (descLeft + descRight) / 2,
  };
}

export function drawQuotationLineItemsTable(
  doc: jsPDF,
  quotation: QuotationDoc,
  yIn: number
): number {
  const items = quotation.lineItems ?? [];
  let y = yIn;
  const W = doc.internal.pageSize.getWidth();
  const c = quotationTableColumns(doc);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.text("No", c.noCenter, y, { align: "center" });
  doc.text("Deskripsi", c.descCenter, y, { align: "center" });
  doc.text("Qty", c.qtyCenter, y, { align: "center" });
  doc.text("UOM", c.uomLeft + c.wUom / 2, y, { align: "center" });
  doc.text("Harga Sat.", c.unitCenter, y, { align: "center" });
  doc.text("Total", c.totCenter, y, { align: "center" });
  y += LINE * 0.8;
  doc.line(MARGIN, y, W - MARGIN, y);
  y += LINE * 0.7;
  doc.setFont("helvetica", "normal");

  if (items.length === 0) {
    doc.setFont("helvetica", "italic");
    doc.text("Belum ada item penawaran.", MARGIN, y);
    y += LINE * 2;
    doc.setFont("helvetica", "normal");
    return y;
  }

  items.forEach((li, idx) => {
    const descLines = li.description.trim()
      ? wrapMultilineForPdf(doc, li.description, c.descWidthMm)
      : [""];
    const spec = li.spec?.trim();
    const specLines = spec
      ? wrapMultilineForPdf(doc, spec, c.descWidthMm)
      : [];
    y = ensureSpace(
      doc,
      y,
      Math.max(2, descLines.length + specLines.length) * LINE + LINE * 2
    );
    doc.text(String(idx + 1), c.noCenter, y, { align: "center" });
    doc.text(descLines, c.descLeft, y);
    let rowH = descLines.length * LINE * 0.85;
    if (specLines.length) {
      doc.setFontSize(7);
      doc.setTextColor(60, 60, 60);
      doc.text(specLines, c.descLeft, y + rowH);
      doc.setFontSize(8);
      doc.setTextColor(0, 0, 0);
      rowH += specLines.length * LINE * 0.72;
    }
    doc.text(String(li.qty), c.qtyCenter, y, { align: "center" });
    doc.text(li.uom, c.uomLeft + c.wUom / 2, y, { align: "center" });
    textRightInColumn(
      doc,
      formatIDR(li.unitPrice),
      c.unitRight,
      y,
      c.wUnit - 1,
      8
    );
    textRightInColumn(
      doc,
      formatIDR(li.totalPrice),
      c.totRight,
      y,
      c.wTot - 1,
      8
    );
    y += Math.max(LINE * 1.2, rowH) + 2;
  });

  return y + LINE;
}

export function drawTotalsBlock(doc: jsPDF, quotation: QuotationDoc, yIn: number): number {
  let y = yIn;
  const W = doc.internal.pageSize.getWidth();
  const discAmt = Math.max(0, quotation.totalBeforeDisc - quotation.totalAfterDisc);
  const amtRight = W - MARGIN - 2;
  const labelX = W - 70;
  const amtMaxW = Math.max(36, amtRight - labelX - 4);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.text("Subtotal", labelX, y);
  textRightInColumn(doc, formatIDR(quotation.totalBeforeDisc), amtRight, y, amtMaxW, 9);
  y += LINE;
  if (quotation.discount > 0 || discAmt > 0) {
    doc.text(`Diskon (${formatNumber(quotation.discount, 2)}%)`, labelX, y);
    textRightInColumn(doc, `-${formatIDR(discAmt)}`, amtRight, y, amtMaxW, 9);
    y += LINE;
  }
  if (quotation.pphEnabled && (quotation.totalPPH ?? 0) > 0) {
    doc.text(`PPH (${formatNumber(quotation.pphRate ?? 0, 2)}%)`, labelX, y);
    textRightInColumn(doc, formatIDR(quotation.totalPPH ?? 0), amtRight, y, amtMaxW, 9);
    y += LINE;
  }
  doc.text(`PPN (${formatNumber(quotation.ppn, 2)}%)`, labelX, y);
  textRightInColumn(doc, formatIDR(quotation.totalPPN), amtRight, y, amtMaxW, 9);
  y += LINE;
  doc.setFont("helvetica", "bold");
  doc.text("Grand Total", labelX, y);
  textRightInColumn(doc, formatIDR(quotation.grandTotal), amtRight, y, amtMaxW, 9);
  doc.setFont("helvetica", "normal");
  y += LINE + 2;
  return y;
}

function drawTermsAndSig(doc: jsPDF, quotation: QuotationDoc, yIn: number): number {
  let y = yIn;
  const W = doc.internal.pageSize.getWidth();
  const contentW = W - 2 * MARGIN;

  y = ensureSpace(doc, y, LINE * 8);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.text("Syarat & ketentuan", MARGIN, y);
  y += LINE;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  const tc = [
    `Pembayaran: ${quotation.paymentTerms ?? "—"}`,
    `Pengiriman: ${quotation.deliveryTerms ?? "—"}`,
    `Garansi: ${quotation.warrantyTerms ?? "—"}`,
    `Validitas penawaran: ${quotation.validityDays} hari`,
  ];
  if (quotation.termsConditions?.trim()) {
    tc.push(quotation.termsConditions.trim());
  }
  for (const t of tc) {
    for (const line of wrapLines(doc, t, contentW)) {
      y = ensureSpace(doc, y, LINE);
      doc.text(line, MARGIN, y);
      y += LINE * 0.85;
    }
  }
  if (quotation.notes?.trim()) {
    y += LINE * 0.5;
    doc.setFont("helvetica", "italic");
    for (const line of wrapLines(doc, `Catatan: ${quotation.notes}`, contentW)) {
      y = ensureSpace(doc, y, LINE);
      doc.text(line, MARGIN, y);
      y += LINE * 0.85;
    }
    doc.setFont("helvetica", "normal");
  }

  y += LINE * 2;
  y = ensureSpace(doc, y, 40);
  const colW = (contentW - 10) / 3;
  const sigY = y;
  const blocks = [
    { label: "Dibuat oleh", name: quotation.signedBy, img: quotation.ttdPrepared },
    { label: "Diperiksa", name: quotation.checkedBy, img: quotation.ttdReviewed },
    { label: "Disetujui", name: quotation.approvedBy, img: quotation.ttdApproved },
  ];
  blocks.forEach((b, i) => {
    const x = MARGIN + i * (colW + 5);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.text(b.label, x, sigY);
    const imgY = sigY + 2;
    const showStamp =
      i === 2 &&
      quotation.status?.toLowerCase() === "approved" &&
      quotation.stampPath;

    if (showStamp) {
      // Signature first, then stamp on top (like a physical stamp on top of ink).
      addLogo(doc, b.img, x, imgY, colW - 4, 14);
      const cx = x + (colW - 4) / 2;
      const cy = imgY + 7;
      addStampOverlay(doc, quotation.stampPath, cx, cy, 36, 36);
    } else {
      addLogo(doc, b.img, x, imgY, colW - 4, 14);
    }
    doc.text(b.name ?? "________________", x, imgY + 18);
  });

  return sigY + 40;
}

/** Customer quotation PDF — line items from `quotation.lineItems` only. */
export function generateQuotation(
  quotation: QuotationDoc,
  settings: AppSettingsDoc
): Blob {
  const doc = newDoc();
  let y = drawLetterhead(doc, quotation, settings, "SURAT PENAWARAN HARGA");
  y = drawQuotationIntro(doc, y, quotation.introText);
  y = drawQuotationLineItemsTable(doc, quotation, y);
  y = drawTotalsBlock(doc, quotation, y);
  drawTermsAndSig(doc, quotation, y);
  applyDraftWatermark(doc, quotation.status);
  return doc.output("blob");
}

function drawCategoryBreakdownBlock(
  doc: jsPDF,
  project: ProjectDoc,
  sections: SectionDoc[],
  yIn: number
): number {
  let y = yIn;
  const W = doc.internal.pageSize.getWidth();
  y = ensureSpace(doc, y, LINE * 3);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.text(`Rincian per kategori — ${project.name}`, MARGIN, y);
  y += LINE + 1;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);

  for (const sec of sections) {
    y = ensureSpace(doc, y, LINE * 2);
    doc.text(sec.category, MARGIN, y);
    doc.text(formatIDR(sec.subtotal), W - MARGIN - 2, y, { align: "right" });
    y += LINE;
  }
  return y + LINE;
}

/** Detailed costing: quotation table + per-category subtotals per linked project. */
export function generateDetailedCosting(
  quotation: QuotationDoc,
  settings: AppSettingsDoc,
  costingBreakdowns: Array<{ project: ProjectDoc; sections: SectionDoc[] }>
): Blob {
  const doc = newDoc();
  let y = drawLetterhead(doc, quotation, settings, "PENAWARAN — RINCIAN BIAYA");
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.text("Bersama ini kami mengajukan penawaran harga:", MARGIN, y);
  y += LINE + 2;
  y = drawQuotationLineItemsTable(doc, quotation, y);
  y = drawTotalsBlock(doc, quotation, y);

  for (const { project, sections } of costingBreakdowns) {
    y = drawCategoryBreakdownBlock(doc, project, sections, y);
  }

  drawTermsAndSig(doc, quotation, y);
  applyDraftWatermark(doc, quotation.status);
  return doc.output("blob");
}

function drawInternalCostStack(
  doc: jsPDF,
  project: ProjectDoc,
  sections: SectionDoc[],
  yIn: number
): number {
  let y = yIn;
  const W = doc.internal.pageSize.getWidth();
  for (const sec of sections) {
    y = ensureSpace(doc, y, LINE * 4);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.text(sec.category, MARGIN, y);
    y += LINE;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.text("Deskripsi", MARGIN, y);
    doc.text("UOM", MARGIN + 78, y);
    doc.text("Qty", MARGIN + 92, y);
    doc.text("Harga sat.", MARGIN + 108, y);
    doc.text("Subtotal", W - MARGIN - 2, y, { align: "right" });
    y += LINE * 0.7;
    doc.line(MARGIN, y, W - MARGIN, y);
    y += LINE * 0.5;

    for (const li of sec.lineItems) {
      const descLines = wrapMultilineForPdf(doc, li.description, 72);
      y = ensureSpace(doc, y, descLines.length * LINE + LINE);
      doc.text(descLines, MARGIN, y);
      doc.text(li.uom, MARGIN + 78, y);
      doc.text(formatNumber(li.qty, 3), MARGIN + 92, y);
      doc.text(formatIDR(li.unitPrice), MARGIN + 108, y);
      doc.text(formatIDR(li.subtotal), W - MARGIN - 2, y, { align: "right" });
      y += Math.max(LINE, descLines.length * LINE * 0.85);
    }
    doc.setFont("helvetica", "bold");
    doc.text("Subtotal kategori", MARGIN + 78, y);
    doc.text(formatIDR(sec.subtotal), W - MARGIN - 2, y, { align: "right" });
    doc.setFont("helvetica", "normal");
    y += LINE + 2;
  }

  const s = summaryFromProject(project);
  y = ensureSpace(doc, y, LINE * 12);
  doc.setFont("helvetica", "bold");
  doc.text("Ringkasan biaya", MARGIN, y);
  y += LINE + 1;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  const rows: [string, string][] = [
    ["Total HPP", formatIDR(s.hpp)],
    [`Overhead (${formatNumber(project.overhead, 2)}%)`, formatIDR(s.oh)],
    [`Contingency (${formatNumber(project.contingency, 2)}%)`, formatIDR(s.cont)],
    [`Eskalasi (${formatNumber(project.eskalasi, 2)}%)`, formatIDR(s.esk)],
    [`Asuransi (${formatNumber(project.asuransi, 2)}%)`, formatIDR(s.asu)],
    [`Mobilisasi (${formatNumber(project.mobilisasi, 2)}%)`, formatIDR(s.mob)],
    ["Total biaya", formatIDR(s.totalCost)],
    [`Margin (${formatNumber(project.margin, 2)}%)`, formatIDR(s.marginAmt)],
    ["Harga jual (est.)", formatIDR(s.selling)],
  ];
  for (const [k, v] of rows) {
    doc.text(k, MARGIN, y);
    doc.text(v, W - MARGIN - 2, y, { align: "right" });
    y += LINE;
  }
  return y + LINE;
}

/** Internal draft: quotation lines + financials + full HPP stack per costing project. */
export function generateInternalDraft(
  quotation: QuotationDoc,
  settings: AppSettingsDoc,
  costingBreakdowns: Array<{ project: ProjectDoc; sections: SectionDoc[] }>
): Blob {
  const doc = newDoc();
  let y = MARGIN;
  const W = doc.internal.pageSize.getWidth();
  const contentW = W - 2 * MARGIN;

  addLogo(doc, settings.companyLogo, MARGIN, y, 28, 14);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.text(settings.companyName, MARGIN + 32, y + 6);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  const addrLines = wrapLines(
    doc,
    [settings.companyAddress, `${settings.companyPhone} · ${settings.companyEmail}`]
      .filter(Boolean)
      .join("\n"),
    contentW - 32
  );
  doc.text(addrLines, MARGIN + 32, y + 11);
  y += 22;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text("INTERNAL COSTING DRAFT", MARGIN, y);
  y += LINE + 2;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.text(`No. Surat: ${quotation.noSurat ?? "—"} · ${fmtDate(quotation.tanggal)}`, MARGIN, y);
  y += LINE + 2;

  y = drawQuotationLineItemsTable(doc, quotation, y);
  y = drawTotalsBlock(doc, quotation, y);

  for (const { project, sections } of costingBreakdowns) {
    y = ensureSpace(doc, y, LINE * 3);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.text(`Costing detail — ${project.name}`, MARGIN, y);
    y += LINE + 1;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.text(`Model: ${project.ahuModel ?? "—"}`, MARGIN, y);
    y += LINE;
    doc.text(
      `Dimensi (H×W×D mm): ${project.dimH ?? "—"} × ${project.dimW ?? "—"} × ${project.dimD ?? "—"}`,
      MARGIN,
      y
    );
    y += LINE;
    doc.text(
      `Flow: ${project.flowCMH != null ? formatNumber(project.flowCMH) : "—"} CMH`,
      MARGIN,
      y
    );
    y += LINE + 2;
    y = drawInternalCostStack(doc, project, sections, y);
  }

  y = drawTermsAndSig(doc, quotation, y);
  applyDraftWatermark(doc, quotation.status);
  return doc.output("blob");
}
