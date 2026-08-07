import { jsPDF } from "jspdf/dist/jspdf.es.min.js";
import { formatNumber } from "@/lib/utils/format";

export type DeliveryOrderPdfInput = {
  companyName: string;
  companyAddress: string;
  companyPhone: string;
  doNumber: string;
  tanggal: Date | string;
  soNumber: string;
  clientName: string;
  clientCompany: string;
  clientAddress: string;
  shippingAddress: string;
  items: Array<{
    description: string;
    qty: number;
    uom: string;
  }>;
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

export function generateDeliveryOrderPdf(input: DeliveryOrderPdfInput): Uint8Array {
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
  if (input.companyPhone) {
    doc.text(`Telp: ${input.companyPhone}`, M, y);
    y += 6;
  }

  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.text("SURAT JALAN", 210 - M, M + 4, { align: "right" });
  doc.setFontSize(10);
  doc.text(input.doNumber, 210 - M, M + 11, { align: "right" });
  doc.setFont("helvetica", "normal");
  doc.text(fmtDate(input.tanggal), 210 - M, M + 17, { align: "right" });

  y = Math.max(y, M + 24);
  doc.setDrawColor(180);
  doc.line(M, y, 210 - M, y);
  y += 8;

  doc.setFontSize(10);
  doc.text(`Sales Order: ${input.soNumber}`, M, y);
  y += 6;
  doc.text(`Kepada: ${input.clientCompany || input.clientName || "—"}`, M, y);
  y += 5;
  if (input.clientName && input.clientCompany) {
    doc.text(`Up. ${input.clientName}`, M, y);
    y += 5;
  }
  doc.text(`Alamat kirim: ${input.shippingAddress || input.clientAddress || "—"}`, M, y, {
    maxWidth: 180,
  });
  y += 12;

  // Table header
  doc.setFont("helvetica", "bold");
  doc.setFillColor(245, 245, 245);
  doc.rect(M, y - 4, 182, 8, "F");
  doc.text("No", M + 2, y);
  doc.text("Uraian", M + 14, y);
  doc.text("Qty", M + 140, y);
  doc.text("Satuan", M + 160, y);
  y += 8;
  doc.setFont("helvetica", "normal");

  input.items.forEach((it, i) => {
    if (y > 250) {
      doc.addPage();
      y = M;
    }
    doc.text(String(i + 1), M + 2, y);
    doc.text(it.description || "—", M + 14, y, { maxWidth: 120 });
    doc.text(formatNumber(it.qty, 2), M + 140, y);
    doc.text(it.uom || "Unit", M + 160, y);
    y += 8;
  });

  y += 10;
  if (input.notes) {
    doc.text(`Catatan: ${input.notes}`, M, y, { maxWidth: 180 });
    y += 12;
  }

  y = Math.max(y, 230);
  doc.text("Pengirim", M + 20, y);
  doc.text("Penerima", M + 120, y);
  y += 28;
  doc.text("(....................)", M + 10, y);
  doc.text("(....................)", M + 110, y);

  return doc.output("arraybuffer") as unknown as Uint8Array;
}
