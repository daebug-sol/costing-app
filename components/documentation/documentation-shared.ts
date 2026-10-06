import { type QuotationListRow } from "@/components/documentation/documentation-list-view";
import type { AppSettingsDoc } from "@/lib/generators/document-types";
import { type CostingProjectApi } from "@/lib/quotation-export-mappers";
import type { ProjectDoc, SectionDoc } from "@/lib/generators/document-types";
import { type QuotationProgressSalesOrder } from "@/lib/o2c/project-progress";

export const SPEC_MAX_CHARS = 4000;

/** Session cache for project detail fetches (preview / export / addProject). */
export const projectDetailCache = new Map<string, CostingProjectApi>();

export async function fetchProjectDetailCached(
  pid: string
): Promise<CostingProjectApi | null> {
  const hit = projectDetailCache.get(pid);
  if (hit) return hit;
  const r = await fetch(`/api/projects/${pid}`);
  if (!r.ok) return null;
  const raw = (await r.json()) as CostingProjectApi;
  projectDetailCache.set(pid, raw);
  return raw;
}

export async function readErr(res: Response): Promise<string> {
  try {
    const j = (await res.json()) as { error?: string };
    if (j?.error) return j.error;
  } catch {
    /* ignore */
  }
  return res.statusText || "Request failed";
}

export type CostingBreakdown = { project: ProjectDoc; sections: SectionDoc[] };

export type AvailableProject = {
  id: string;
  name: string;
  ahuModel: string | null;
  ahuRef: string | null;
  flowCMH: number | null;
  totalSelling: number;
  qty: number;
};

export type QuotationItemApi = {
  id: string;
  projectId: string;
  description: string;
  spec: string | null;
  qty: number;
  uom: string;
  unitPrice: number;
  totalPrice: number;
  project?: {
    id: string;
    name: string;
    ahuModel: string | null;
    ahuRef: string | null;
    totalSelling: number;
    flowCMH: number | null;
    qty: number;
  };
};

export type CustomerOption = {
  id: string;
  name: string;
  company: string;
  address: string;
  attn: string;
  phone: string;
};

export type QuotationApi = {
  id: string;
  projectId: string | null;
  customerId?: string | null;
  customer?: { id: string; name?: string | null; company?: string | null } | null;
  status: string;
  noSurat: string | null;
  tanggal: string;
  perihal: string | null;
  clientName: string | null;
  clientCompany: string | null;
  salesman?: string | null;
  clientAddress: string | null;
  clientAttn: string | null;
  clientPhone: string | null;
  projectLocation: string | null;
  ourRef: string | null;
  yourRef: string | null;
  revision?: number;
  convertedSoId?: string | null;
  convertedSo?: QuotationProgressSalesOrder | null;
  updatedAt?: string;
  discount: number;
  discountEnabled?: boolean;
  ppn: number;
  ppnEnabled?: boolean;
  pphEnabled: boolean;
  pphRate: number;
  totalBeforeDisc: number;
  totalAfterDisc: number;
  totalPPN: number;
  totalPPH: number;
  grandTotal: number;
  paymentTerms: string | null;
  deliveryTerms: string | null;
  warrantyTerms: string | null;
  validityDays: number;
  termsConditions: string | null;
  introText: string | null;
  notes: string | null;
  ttdPrepared: string | null;
  ttdReviewed: string | null;
  ttdApproved: string | null;
  stampPath: string | null;
  items?: QuotationItemApi[];
};

export function toListRow(q: QuotationApi): QuotationListRow {
  return {
    id: q.id,
    status: q.status,
    noSurat: q.noSurat,
    perihal: q.perihal,
    tanggal: q.tanggal,
    grandTotal: q.grandTotal,
    updatedAt: q.updatedAt,
    customerId: q.customerId,
    customer: q.customer,
    convertedSoId: q.convertedSoId,
    convertedSo: q.convertedSo,
  };
}

export function folderNameFor(q: QuotationApi): string {
  const company = q.customer?.company?.trim();
  if (company) return company;
  const name = q.customer?.name?.trim();
  if (name) return name;
  return "Tanpa pelanggan";
}

export function folderKeyFor(q: QuotationApi): string {
  if (q.customer?.id) return `cust:${q.customer.id}`;
  if (q.customerId) return `cust:${q.customerId}`;
  return "none";
}

export type FormLine = {
  localId: string;
  id?: string;
  projectId: string;
  description: string;
  spec: string;
  qty: number;
  uom: string;
  unitPrice: number;
};

export type SettingsRow = {
  companyName: string;
  companyAddress: string;
  companyPhone: string;
  companyEmail: string;
  companyLogo: string | null;
  presetSignedByName: string;
  presetCheckedByName: string;
  presetApprovedByName: string;
  presetTtdPrepared: string | null;
  presetTtdReviewed: string | null;
  presetTtdApproved: string | null;
  paymentTerms: string;
  deliveryTerms: string;
  warrantyTerms: string;
  validityDays: number;
  ppnRate: number;
  termsConditions: string;
};

export function toSettingsDoc(s: SettingsRow): AppSettingsDoc {
  return {
    companyName: s.companyName,
    companyAddress: s.companyAddress,
    companyPhone: s.companyPhone,
    companyEmail: s.companyEmail,
    companyLogo: s.companyLogo,
  };
}

export function newLocalId() {
  return `l_${Math.random().toString(36).slice(2, 11)}`;
}

export function defaultDesc(p: AvailableProject) {
  const m = p.ahuModel?.trim();
  return m ? `${p.name} — ${m}` : p.name;
}

export function defaultSpec(p: AvailableProject) {
  const parts: string[] = [];
  if (p.ahuRef?.trim()) parts.push(p.ahuRef.trim());
  if (p.flowCMH != null) parts.push(`Flow ${p.flowCMH} CMH`);
  return parts.join(" · ") || "";
}

export function itemsFromApi(q: QuotationApi): FormLine[] {
  return (q.items ?? []).map((it) => ({
    localId: it.id,
    id: it.id,
    projectId: it.projectId,
    description: it.description,
    spec: it.spec ?? "",
    qty: it.qty,
    uom: it.uom,
    unitPrice: it.unitPrice,
  }));
}

export function fmtDateInput(iso: string) {
  try {
    const d = new Date(iso);
    return d.toISOString().slice(0, 10);
  } catch {
    return "";
  }
}
