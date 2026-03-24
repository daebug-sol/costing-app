export type AppSettingsDoc = {
  companyName: string;
  companyAddress: string;
  companyPhone: string;
  companyEmail: string;
  companyLogo?: string | null;
};

export type LineItemDoc = {
  description: string;
  uom: string;
  qty: number;
  unitPrice: number;
  subtotal: number;
};

export type SectionDoc = {
  category: string;
  subtotal: number;
  lineItems: LineItemDoc[];
};

export type ProjectDoc = {
  name: string;
  ahuModel: string | null;
  ahuRef: string | null;
  flowCMH: number | null;
  qty: number;
  dimH: number | null;
  dimW: number | null;
  dimD: number | null;
  totalHPP: number;
  overhead: number;
  contingency: number;
  eskalasi: number;
  asuransi: number;
  mobilisasi: number;
  margin: number;
};

export type QuotationLineItemDoc = {
  description: string;
  spec?: string | null;
  qty: number;
  uom: string;
  unitPrice: number;
  totalPrice: number;
};

export type QuotationDoc = {
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
  /** Discount percentage (e.g. 5 = 5%). */
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
  /** Sambutan sebelum tabel penawaran; generator memakai default jika kosong. */
  introText: string;
  notes: string | null;
  signedBy: string | null;
  checkedBy: string | null;
  approvedBy: string | null;
  /** Letterhead logo — use company logo from settings in generators. */
  logoPath: string | null;
  ttdPrepared: string | null;
  ttdReviewed: string | null;
  ttdApproved: string | null;
  stampPath: string | null;
  /** When set, PDF/Excel use these rows instead of a single project line. */
  lineItems?: QuotationLineItemDoc[];
};
