import type { QuotationDoc } from "@/lib/generators/document-types";

/** Default sambutan quotation (bisa diganti per dokumen, mendukung beberapa paragraf). */
export const DEFAULT_QUOTATION_INTRO = `Dengan hormat,

Bersama ini kami mengajukan penawaran harga:`;

type SettingsForDoc = {
  companyLogo?: string | null;
  presetSignedByName?: string;
  presetCheckedByName?: string;
  presetApprovedByName?: string;
  presetTtdPrepared?: string | null;
  presetTtdReviewed?: string | null;
  presetTtdApproved?: string | null;
};

type QuotationLike = {
  status: string;
  noSurat: string | null;
  tanggal: Date | string;
  perihal: string | null;
  clientName: string | null;
  clientCompany: string | null;
  clientAddress: string | null;
  clientAttn: string | null;
  clientPhone: string | null;
  projectLocation: string | null;
  ourRef: string | null;
  yourRef: string | null;
  discount: number;
  ppn: number;
  pphEnabled?: boolean;
  pphRate?: number;
  totalBeforeDisc: number;
  totalAfterDisc: number;
  totalPPN: number;
  totalPPH?: number;
  grandTotal: number;
  paymentTerms: string | null;
  deliveryTerms: string | null;
  warrantyTerms: string | null;
  validityDays: number;
  termsConditions: string | null;
  introText?: string | null;
  notes: string | null;
  ttdPrepared?: string | null;
  ttdReviewed?: string | null;
  ttdApproved?: string | null;
  stampPath?: string | null;
  items?: Array<{
    description: string;
    spec?: string | null;
    qty: number;
    uom: string;
    unitPrice: number;
    totalPrice: number;
  }>;
};

/** Merge quotation row + AppSettings for PDF/Excel (names, logos, TTD fallbacks). */
export function mergeQuotationDoc(
  q: QuotationLike,
  settings: SettingsForDoc
): QuotationDoc {
  return {
    status: q.status,
    noSurat: q.noSurat,
    tanggal: q.tanggal,
    perihal: q.perihal,
    clientName: q.clientName,
    clientCompany: q.clientCompany,
    clientAddress: q.clientAddress,
    clientAttn: q.clientAttn,
    clientPhone: q.clientPhone,
    projectLocation: q.projectLocation,
    ourRef: q.ourRef,
    yourRef: q.yourRef,
    discount: q.discount,
    ppn: q.ppn,
    pphEnabled: q.pphEnabled ?? false,
    pphRate: q.pphRate ?? 0,
    totalBeforeDisc: q.totalBeforeDisc,
    totalAfterDisc: q.totalAfterDisc,
    totalPPN: q.totalPPN,
    totalPPH: q.totalPPH ?? 0,
    grandTotal: q.grandTotal,
    paymentTerms: q.paymentTerms,
    deliveryTerms: q.deliveryTerms,
    warrantyTerms: q.warrantyTerms,
    validityDays: q.validityDays,
    termsConditions: q.termsConditions,
    introText:
      q.introText != null && String(q.introText).trim() !== ""
        ? String(q.introText)
        : DEFAULT_QUOTATION_INTRO,
    notes: q.notes,
    signedBy: settings.presetSignedByName?.trim() || null,
    checkedBy: settings.presetCheckedByName?.trim() || null,
    approvedBy: settings.presetApprovedByName?.trim() || null,
    logoPath: settings.companyLogo ?? null,
    ttdPrepared: q.ttdPrepared ?? settings.presetTtdPrepared ?? null,
    ttdReviewed: q.ttdReviewed ?? settings.presetTtdReviewed ?? null,
    ttdApproved: q.ttdApproved ?? settings.presetTtdApproved ?? null,
    stampPath: q.stampPath ?? null,
    lineItems: (q.items ?? []).map((it) => ({
      description: it.description,
      spec: it.spec ?? null,
      qty: it.qty,
      uom: it.uom,
      unitPrice: it.unitPrice,
      totalPrice: it.totalPrice,
    })),
  };
}
