import ExcelJS from "exceljs";
import {
  computeCostSummary,
  finite,
  marginTogglesFromProject,
} from "@/lib/cost-summary";
import { formatIDR, formatNumber } from "@/lib/utils/format";
import type {
  AppSettingsDoc,
  QuotationDoc,
  SectionDoc,
  ProjectDoc,
} from "@/lib/generators/document-types";

const NAVY = "FF1E3A8A";
const SLATE100 = "FFF1F5F9";
const WHITE = "FFFFFFFF";

function styleHeaderRow(row: ExcelJS.Row) {
  row.eachCell((cell) => {
    cell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: NAVY },
    };
    cell.font = { bold: true, color: { argb: WHITE } };
    cell.alignment = { vertical: "middle", wrapText: true };
  });
}

function styleSubtotalRow(row: ExcelJS.Row) {
  row.eachCell((cell) => {
    cell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: SLATE100 },
    };
  });
}

function idrCell(cell: ExcelJS.Cell, n: number) {
  cell.value = formatIDR(n);
  cell.alignment = { horizontal: "right" };
}

function numCell(cell: ExcelJS.Cell, n: number, maxFrac = 3) {
  cell.value = formatNumber(n, maxFrac);
  cell.alignment = { horizontal: "right" };
}

function autoWidth(sheet: ExcelJS.Worksheet, maxCol: number) {
  for (let c = 1; c <= maxCol; c++) {
    let max = 10;
    sheet.eachRow((row) => {
      const cell = row.getCell(c);
      const v = cell.value;
      const len = v == null ? 0 : String(v).length;
      if (len > max) max = Math.min(len + 2, 48);
    });
    sheet.getColumn(c).width = max;
  }
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

async function workbookToBlob(wb: ExcelJS.Workbook): Promise<Blob> {
  const buf = await wb.xlsx.writeBuffer();
  return new Blob([buf], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
}

function addFinancialSummaryRows(
  sheet: ExcelJS.Worksheet,
  quotation: QuotationDoc,
  startRow: number
) {
  let r = startRow;
  const discAmt = Math.max(0, quotation.totalBeforeDisc - quotation.totalAfterDisc);
  const rows: [string, string][] = [
    ["Subtotal", formatIDR(quotation.totalBeforeDisc)],
  ];
  if (quotation.discount > 0 || discAmt > 0) {
    rows.push([
      `Diskon (${formatNumber(quotation.discount, 2)}%)`,
      `-${formatIDR(discAmt)}`,
    ]);
  }
  if (quotation.pphEnabled && (quotation.totalPPH ?? 0) > 0) {
    rows.push([
      `PPH (${formatNumber(quotation.pphRate ?? 0, 2)}%)`,
      formatIDR(quotation.totalPPH ?? 0),
    ]);
  }
  rows.push(
    [`PPN (${formatNumber(quotation.ppn, 2)}%)`, formatIDR(quotation.totalPPN)],
    ["Grand total", formatIDR(quotation.grandTotal)]
  );

  for (const [a, b] of rows) {
    sheet.getCell(r, 1).value = a;
    sheet.getCell(r, 2).value = b;
    if (a === "Grand total") sheet.getRow(r).font = { bold: true };
    r++;
  }
  return r;
}

function addLineItemsTableSheet(
  sheet: ExcelJS.Worksheet,
  quotation: QuotationDoc,
  settings: AppSettingsDoc,
  docTitle: string
) {
  let r = 1;
  sheet.getCell(r, 1).value = settings.companyName;
  sheet.getCell(r, 1).font = { bold: true, size: 14 };
  r += 2;

  sheet.getCell(r, 1).value = docTitle;
  sheet.getCell(r, 1).font = { bold: true, size: 11 };
  r += 1;
  sheet.getCell(r, 1).value = `Klien: ${quotation.clientCompany ?? quotation.clientName ?? "—"}`;
  r += 2;

  if (docTitle === "Quotation") {
    sheet.mergeCells(r, 1, r, 7);
    const cell = sheet.getCell(r, 1);
    cell.value = quotation.introText;
    cell.alignment = { wrapText: true, vertical: "top" };
    const lineCount = Math.max(2, quotation.introText.split(/\n/).length);
    sheet.getRow(r).height = Math.min(200, 12 + lineCount * 14);
    r += 2;
  }

  const hdr = sheet.getRow(r);
  hdr.getCell(1).value = "No";
  hdr.getCell(2).value = "Deskripsi";
  hdr.getCell(3).value = "Spesifikasi";
  hdr.getCell(4).value = "Qty";
  hdr.getCell(5).value = "UOM";
  hdr.getCell(6).value = "Harga satuan";
  hdr.getCell(7).value = "Total";
  styleHeaderRow(hdr);
  r++;

  const items = quotation.lineItems ?? [];
  if (items.length === 0) {
    sheet.getCell(r, 1).value = "—";
    sheet.getCell(r, 2).value = "Belum ada item penawaran.";
    r += 2;
  } else {
    items.forEach((li, i) => {
      const row = sheet.getRow(r);
      row.getCell(1).value = i + 1;
      row.getCell(2).value = li.description;
      row.getCell(2).alignment = { wrapText: true, vertical: "top" };
      row.getCell(3).value = li.spec ?? "";
      row.getCell(3).alignment = { wrapText: true, vertical: "top" };
      numCell(row.getCell(4), li.qty, 0);
      row.getCell(5).value = li.uom;
      idrCell(row.getCell(6), li.unitPrice);
      idrCell(row.getCell(7), li.totalPrice);
      const descLines = String(li.description).split(/\r?\n/).length;
      const specLines = String(li.spec ?? "").split(/\r?\n/).length;
      row.height = Math.min(
        220,
        Math.max(16, (Math.max(descLines, 1) + Math.max(specLines, 1)) * 13)
      );
      r++;
    });
  }

  r += 1;
  addFinancialSummaryRows(sheet, quotation, r);
}

function addSummarySheetInternal(
  sheet: ExcelJS.Worksheet,
  quotation: QuotationDoc,
  project: ProjectDoc,
  settings: AppSettingsDoc
) {
  let r = 1;
  sheet.getCell(r, 1).value = settings.companyName;
  sheet.getCell(r, 1).font = { bold: true, size: 14 };
  r += 2;

  const s = summaryFromProject(project);
  const rows: [string, string][] = [
    ["Dokumen", "Internal Draft — Costing"],
    ["Proyek", project.name],
    ["Model AHU", project.ahuModel ?? "—"],
    [
      "Dimensi (H×W×D mm)",
      `${project.dimH ?? "—"} × ${project.dimW ?? "—"} × ${project.dimD ?? "—"}`,
    ],
    ["Flow (CMH)", project.flowCMH != null ? formatNumber(project.flowCMH) : "—"],
    ["Qty", String(project.qty)],
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
  for (const [a, b] of rows) {
    sheet.getCell(r, 1).value = a;
    sheet.getCell(r, 2).value = b;
    r++;
  }
  r += 1;
  sheet.getCell(r, 1).value = "Ringkasan penawaran";
  sheet.getCell(r, 1).font = { bold: true };
  r += 1;
  addFinancialSummaryRows(sheet, quotation, r);
}

function addBreakdownSheet(
  sheet: ExcelJS.Worksheet,
  sections: SectionDoc[],
  includeUnitDetail: boolean
) {
  let r = 1;
  const sorted = [...sections].sort((a, b) => a.category.localeCompare(b.category));

  for (const sec of sorted) {
    const head = sheet.getRow(r);
    head.getCell(1).value = sec.category;
    head.getCell(1).font = { bold: true, size: 12 };
    r++;

    const hdr = sheet.getRow(r);
    if (includeUnitDetail) {
      hdr.getCell(1).value = "Deskripsi";
      hdr.getCell(2).value = "UOM";
      hdr.getCell(3).value = "Qty";
      hdr.getCell(4).value = "Harga sat.";
      hdr.getCell(5).value = "Subtotal";
    } else {
      hdr.getCell(1).value = "Deskripsi";
      hdr.getCell(2).value = "Subtotal";
    }
    styleHeaderRow(hdr);
    r++;

    for (const li of sec.lineItems) {
      const row = sheet.getRow(r);
      if (includeUnitDetail) {
        row.getCell(1).value = li.description;
        row.getCell(2).value = li.uom;
        numCell(row.getCell(3), li.qty);
        idrCell(row.getCell(4), li.unitPrice);
        idrCell(row.getCell(5), li.subtotal);
      } else {
        row.getCell(1).value = li.description;
        idrCell(row.getCell(2), li.subtotal);
      }
      r++;
    }

    const sub = sheet.getRow(r);
    if (includeUnitDetail) {
      sub.getCell(4).value = "Subtotal kategori";
      sub.getCell(4).font = { bold: true };
      idrCell(sub.getCell(5), sec.subtotal);
    } else {
      sub.getCell(1).value = "Subtotal kategori";
      sub.getCell(1).font = { bold: true };
      idrCell(sub.getCell(2), sec.subtotal);
    }
    styleSubtotalRow(sub);
    r += 2;
  }

  const cols = includeUnitDetail ? 5 : 2;
  autoWidth(sheet, cols);
}

/** Sheet1: quotation items + financials. */
export async function generateQuotationExcel(
  quotation: QuotationDoc,
  settings: AppSettingsDoc
): Promise<Blob> {
  const wb = new ExcelJS.Workbook();
  const s1 = wb.addWorksheet("Quotation");
  addLineItemsTableSheet(s1, quotation, settings, "Quotation");
  autoWidth(s1, 7);
  return workbookToBlob(wb);
}

/** Sheet1 summary + Sheet2 category lines with unit prices (internal). */
export async function generateInternalDraftExcel(
  quotation: QuotationDoc,
  settings: AppSettingsDoc,
  costingBreakdowns: Array<{ project: ProjectDoc; sections: SectionDoc[] }>
): Promise<Blob> {
  const wb = new ExcelJS.Workbook();
  const s1 = wb.addWorksheet("Summary");
  if (costingBreakdowns.length === 0) {
    addLineItemsTableSheet(s1, quotation, settings, "Internal Draft");
  } else {
    addSummarySheetInternal(s1, quotation, costingBreakdowns[0]!.project, settings);
  }
  autoWidth(s1, 2);

  costingBreakdowns.forEach((cb, idx) => {
    const s2 = wb.addWorksheet(
      costingBreakdowns.length > 1 ? `Breakdown ${idx + 1}` : "Category breakdown"
    );
    addBreakdownSheet(s2, cb.sections, true);
  });

  return workbookToBlob(wb);
}

/** Sheet1 summary + Sheet2 rincian part per kategori (sama kedalaman dengan internal). */
export async function generateDetailedCostingExcel(
  quotation: QuotationDoc,
  settings: AppSettingsDoc,
  costingBreakdowns: Array<{ project: ProjectDoc; sections: SectionDoc[] }>
): Promise<Blob> {
  const wb = new ExcelJS.Workbook();
  const s1 = wb.addWorksheet("Summary");
  addLineItemsTableSheet(s1, quotation, settings, "Detailed Costing");
  autoWidth(s1, 7);

  costingBreakdowns.forEach((cb, idx) => {
    const s2 = wb.addWorksheet(
      costingBreakdowns.length > 1 ? `Categories ${idx + 1}` : "Category breakdown"
    );
    addBreakdownSheet(s2, cb.sections, true);
  });

  return workbookToBlob(wb);
}
