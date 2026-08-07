import { jsPDF } from "jspdf/dist/jspdf.es.min.js";
import { formatIDR, formatNumber } from "@/lib/utils/format";

export type InvoicePdfInput = {
  companyName: string;
  companyAddress: string;
  companyPhone: string;
  invNumber: string;
  tanggal: Date | string;
  dueDate?: Date | string | null;
  kind: string;
  clientName: string;
  clientCompany: string;
  clientAddress: string;
  items: Array<{
    description: string;
    qty: number;
    uom: string;
    unitPrice: number;
    totalPrice: number;
  }>;
  subtotal: number;
  discountAmt: number;
  dpp: number;
  ppn: number;
  pph: number;
  grandTotal: number;
  notes?: string | null;
};

function fmtDate(d: Date | string): string {
  const x = typeof d === "string" ? new Date(d) : d;
  return new Intl.DateTimeFormat("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(x);
}

export function generateInvoicePdf(input: InvoicePdfInput): Uint8Array {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const M = 14;
  let y = M;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.text(input.companyName || "Perusahaan", M, y);
  y += 6;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  if (input.companyAddress) {
    doc.text(input.companyAddress, M, y, { maxWidth: 100 });
    y += 8;
  }

  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.text("INVOICE", 210 - M, M + 4, { align: "right" });
  doc.setFontSize(10);
  doc.text(input.invNumber || "DRAFT", 210 - M, M + 11, { align: "right" });
  doc.setFont("helvetica", "normal");
  doc.text(fmtDate(input.tanggal), 210 - M, M + 17, { align: "right" });
  if (input.dueDate) {
    doc.text(`Jatuh tempo: ${fmtDate(input.dueDate)}`, 210 - M, M + 23, {
      align: "right",
    });
  }

  y = Math.max(y, M + 30);
  doc.setDrawColor(180);
  doc.line(M, y, 210 - M, y);
  y += 8;

  doc.setFontSize(10);
  doc.text(`Jenis: ${input.kind.toUpperCase()}`, M, y);
  y += 6;
  doc.text(`Kepada: ${input.clientCompany || input.clientName || "—"}`, M, y);
  y += 5;
  if (input.clientAddress) {
    doc.text(input.clientAddress, M, y, { maxWidth: 100 });
    y += 10;
  } else {
    y += 6;
  }

  doc.setFont("helvetica", "bold");
  doc.setFillColor(245, 245, 245);
  doc.rect(M, y - 4, 182, 8, "F");
  doc.text("Uraian", M + 2, y);
  doc.text("Qty", M + 100, y);
  doc.text("Harga", M + 120, y);
  doc.text("Total", M + 155, y);
  y += 8;
  doc.setFont("helvetica", "normal");

  for (const it of input.items) {
    if (y > 220) {
      doc.addPage();
      y = M;
    }
    doc.text(it.description || "—", M + 2, y, { maxWidth: 90 });
    doc.text(`${formatNumber(it.qty, 2)} ${it.uom}`, M + 100, y);
    doc.text(formatIDR(it.unitPrice), M + 120, y);
    doc.text(formatIDR(it.totalPrice), M + 155, y);
    y += 8;
  }

  y += 6;
  const right = 210 - M;
  const row = (label: string, value: number, bold = false) => {
    if (bold) doc.setFont("helvetica", "bold");
    else doc.setFont("helvetica", "normal");
    doc.text(label, right - 55, y);
    doc.text(formatIDR(value), right, y, { align: "right" });
    y += 6;
  };

  row("Subtotal", input.subtotal);
  if (input.discountAmt > 0) row("Diskon", -input.discountAmt);
  row("DPP", input.dpp);
  row("PPN", input.ppn);
  if (input.pph > 0) row("PPh", input.pph);
  row("Grand Total", input.grandTotal, true);

  if (input.notes) {
    y += 6;
    doc.setFont("helvetica", "normal");
    doc.text(`Catatan: ${input.notes}`, M, y, { maxWidth: 180 });
  }

  return doc.output("arraybuffer") as unknown as Uint8Array;
}
