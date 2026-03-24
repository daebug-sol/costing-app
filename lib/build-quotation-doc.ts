import type { QuotationDoc } from "@/lib/generators/document-types";
import { DEFAULT_QUOTATION_INTRO } from "@/lib/merge-quotation-doc";

type ItemLike = {
  description: string;
  spec?: string | null;
  qty: number;
  uom: string;
  unitPrice: number;
  totalPrice: number;
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
  signedBy: string | null;
  checkedBy: string | null;
  approvedBy: string | null;
  logoPath: string | null;
  ttdPrepared?: string | null;
  ttdReviewed?: string | null;
  ttdApproved?: string | null;
  stampPath?: string | null;
  items?: ItemLike[];
};

export function quotationToDoc(q: QuotationLike): QuotationDoc {
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
    signedBy: q.signedBy,
    checkedBy: q.checkedBy,
    approvedBy: q.approvedBy,
    logoPath: q.logoPath,
    ttdPrepared: q.ttdPrepared ?? null,
    ttdReviewed: q.ttdReviewed ?? null,
    ttdApproved: q.ttdApproved ?? null,
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
