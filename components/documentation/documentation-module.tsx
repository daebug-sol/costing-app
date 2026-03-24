"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  AlertTriangle,
  ArrowLeft,
  ChevronDown,
  FileStack,
  FileText,
  Loader2,
  PenLine,
  Plus,
  X,
} from "lucide-react";
import { DocumentationListView } from "@/components/documentation/documentation-list-view";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DEFAULT_QUOTATION_INTRO, mergeQuotationDoc } from "@/lib/merge-quotation-doc";
import type { AppSettingsDoc } from "@/lib/generators/document-types";
import {
  generateDetailedCosting,
  generateInternalDraft,
  generateQuotation,
} from "@/lib/generators/pdfGenerator";
import {
  generateDetailedCostingExcel,
  generateInternalDraftExcel,
  generateQuotationExcel,
} from "@/lib/generators/excelGenerator";
import {
  costingProjectToProjectDoc,
  costingProjectToSectionDocs,
  segmentTitlesSpecFromProject,
  type CostingProjectApi,
} from "@/lib/quotation-export-mappers";
import type { ProjectDoc, SectionDoc } from "@/lib/generators/document-types";
import { computeQuotationTotals } from "@/lib/quotation-financials";
import { formatIDR } from "@/lib/utils/format";
import { toastError, toastSuccess } from "@/store/toastStore";

const SPEC_MAX_CHARS = 4000;

type CostingBreakdown = { project: ProjectDoc; sections: SectionDoc[] };

type AvailableProject = {
  id: string;
  name: string;
  ahuModel: string | null;
  ahuRef: string | null;
  flowCMH: number | null;
  totalSelling: number;
  qty: number;
};

type QuotationItemApi = {
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

type QuotationApi = {
  id: string;
  projectId: string | null;
  status: string;
  noSurat: string | null;
  tanggal: string;
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

type FormLine = {
  localId: string;
  id?: string;
  projectId: string;
  description: string;
  spec: string;
  qty: number;
  uom: string;
  unitPrice: number;
};

type SettingsRow = {
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

function toSettingsDoc(s: SettingsRow): AppSettingsDoc {
  return {
    companyName: s.companyName,
    companyAddress: s.companyAddress,
    companyPhone: s.companyPhone,
    companyEmail: s.companyEmail,
    companyLogo: s.companyLogo,
  };
}

function newLocalId() {
  return `l_${Math.random().toString(36).slice(2, 11)}`;
}

function defaultDesc(p: AvailableProject) {
  const m = p.ahuModel?.trim();
  return m ? `${p.name} — ${m}` : p.name;
}

function defaultSpec(p: AvailableProject) {
  const parts: string[] = [];
  if (p.ahuRef?.trim()) parts.push(p.ahuRef.trim());
  if (p.flowCMH != null) parts.push(`Flow ${p.flowCMH} CMH`);
  return parts.join(" · ") || "";
}

function itemsFromApi(q: QuotationApi): FormLine[] {
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

function fmtDateInput(iso: string) {
  try {
    const d = new Date(iso);
    return d.toISOString().slice(0, 10);
  } catch {
    return "";
  }
}

export function DocumentationModule() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const fromProject = searchParams.get("fromProject");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [creating, setCreating] = useState(false);
  const [quotations, setQuotations] = useState<QuotationApi[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [quotation, setQuotation] = useState<QuotationApi | null>(null);
  const [settings, setSettings] = useState<SettingsRow | null>(null);
  const [available, setAvailable] = useState<AvailableProject[]>([]);
  const [projectQuery, setProjectQuery] = useState("");
  const [pickerOpen, setPickerOpen] = useState(false);

  const [form, setForm] = useState({
    status: "draft",
    noSurat: "",
    tanggal: "",
    perihal: "",
    ourRef: "",
    yourRef: "",
    clientName: "",
    clientCompany: "",
    clientAddress: "",
    clientAttn: "",
    clientPhone: "",
    projectLocation: "",
    discount: 0,
    discountEnabled: true,
    ppn: 11,
    ppnEnabled: true,
    pphEnabled: false,
    pphRate: 0,
    paymentTerms: "",
    deliveryTerms: "",
    warrantyTerms: "",
    validityDays: 14,
    termsConditions: "",
    introText: "",
    notes: "",
    ttdPrepared: "",
    ttdReviewed: "",
    ttdApproved: "",
    stampPath: "",
    items: [] as FormLine[],
  });

  const [exportOpen, setExportOpen] = useState<"pdf" | "excel" | null>(null);
  const fromProjectHandled = useRef(false);
  const [screen, setScreen] = useState<"list" | "editor">("list");
  const [previewMode, setPreviewMode] = useState<"quotation" | "detailed" | "internal">(
    "quotation"
  );
  const [previewBreakdowns, setPreviewBreakdowns] = useState<CostingBreakdown[]>([]);

  const [listSearch, setListSearch] = useState("");
  const [listStatusFilter, setListStatusFilter] = useState<
    "all" | "draft" | "final" | "approved"
  >("all");
  const [listMonthFilter, setListMonthFilter] = useState("");
  const [listDateFilter, setListDateFilter] = useState("");
  const [selectMode, setSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(
    () => new Set()
  );
  const [deletingBulk, setDeletingBulk] = useState(false);

  const availableMonths = useMemo(() => {
    const map = new Map<string, string>();
    for (const q of quotations) {
      const d = new Date(q.tanggal);
      const k = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      if (!map.has(k)) {
        map.set(
          k,
          d.toLocaleDateString("id-ID", { month: "long", year: "numeric" })
        );
      }
    }
    return [...map.entries()]
      .sort((a, b) => b[0].localeCompare(a[0]))
      .map(([value, label]) => ({ value, label }));
  }, [quotations]);

  const filteredListQuotations = useMemo(() => {
    let rows = quotations;
    const s = listSearch.trim().toLowerCase();
    if (s) {
      rows = rows.filter((q) => {
        const t = `${q.noSurat ?? ""} ${q.perihal ?? ""} ${q.id}`.toLowerCase();
        return t.includes(s);
      });
    }
    if (listStatusFilter !== "all") {
      rows = rows.filter(
        (q) => q.status.toLowerCase() === listStatusFilter
      );
    }
    if (listMonthFilter) {
      rows = rows.filter((q) => {
        const d = new Date(q.tanggal);
        const k = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
        return k === listMonthFilter;
      });
    }
    if (listDateFilter) {
      rows = rows.filter((q) => q.tanggal.slice(0, 10) === listDateFilter);
    }
    return rows;
  }, [quotations, listSearch, listStatusFilter, listMonthFilter, listDateFilter]);

  const loadList = useCallback(async () => {
    const r = await fetch("/api/quotations");
    if (r.ok) setQuotations(await r.json());
  }, []);

  const loadSettings = useCallback(async () => {
    const r = await fetch("/api/settings");
    if (r.ok) setSettings(await r.json());
  }, []);

  const loadAvailable = useCallback(async () => {
    const r = await fetch("/api/projects/available");
    if (r.ok) setAvailable(await r.json());
  }, []);

  const loadQuotation = useCallback(async (id: string) => {
    const r = await fetch(`/api/quotations/${id}`);
    if (!r.ok) return;
    const q = (await r.json()) as QuotationApi;
    setQuotation(q);
    setSelectedId(id);
    setForm({
      status: q.status,
      noSurat: q.noSurat ?? "",
      tanggal: fmtDateInput(q.tanggal),
      perihal: q.perihal ?? "",
      ourRef: q.ourRef ?? "",
      yourRef: q.yourRef ?? "",
      clientName: q.clientName ?? "",
      clientCompany: q.clientCompany ?? "",
      clientAddress: q.clientAddress ?? "",
      clientAttn: q.clientAttn ?? "",
      clientPhone: q.clientPhone ?? "",
      projectLocation: q.projectLocation ?? "",
      discount: q.discount,
      discountEnabled: q.discountEnabled ?? true,
      ppn: q.ppn,
      ppnEnabled: q.ppnEnabled ?? true,
      pphEnabled: q.pphEnabled,
      pphRate: q.pphRate,
      paymentTerms: q.paymentTerms ?? "",
      deliveryTerms: q.deliveryTerms ?? "",
      warrantyTerms: q.warrantyTerms ?? "",
      validityDays: q.validityDays,
      termsConditions: q.termsConditions ?? "",
      introText: q.introText ?? "",
      notes: q.notes ?? "",
      ttdPrepared: q.ttdPrepared ?? "",
      ttdReviewed: q.ttdReviewed ?? "",
      ttdApproved: q.ttdApproved ?? "",
      stampPath: q.stampPath ?? "",
      items: itemsFromApi(q),
    });
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      await Promise.all([loadList(), loadSettings(), loadAvailable()]);
      if (!cancelled) setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [loadList, loadSettings, loadAvailable]);

  useEffect(() => {
    const onVis = () => {
      if (document.visibilityState === "visible") void loadSettings();
    };
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, [loadSettings]);

  const idParam = searchParams.get("id");

  useEffect(() => {
    if (loading) return;
    if (idParam && quotations.some((q) => q.id === idParam)) {
      setScreen("editor");
      void loadQuotation(idParam);
    } else if (!idParam && !fromProject) {
      setScreen("list");
    }
  }, [loading, idParam, quotations, loadQuotation, fromProject]);

  const handleCreate = useCallback(async () => {
    if (creating) return;
    setCreating(true);
    try {
      const r = await fetch("/api/quotations", { method: "POST" });
      const body = (await r.json().catch(() => ({}))) as {
        error?: string;
        message?: string;
        id?: string;
      };
      if (!r.ok) {
        const detail =
          typeof body.message === "string" && body.message.trim()
            ? body.message
            : typeof body.error === "string" && body.error.trim()
              ? body.error
              : "";
        toastError(
          detail ? `Gagal membuat penawaran: ${detail}` : "Gagal membuat penawaran"
        );
        return;
      }
      const created = body as QuotationApi;
      await loadList();
      router.push(`/documentation?id=${created.id}`);
      setScreen("editor");
      await loadQuotation(created.id);
      toastSuccess("Penawaran baru dibuat");
    } finally {
      setCreating(false);
    }
  }, [creating, loadList, loadQuotation, router]);

  const handleToggleSelect = useCallback((id: string, checked: boolean) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (checked) next.add(id);
      else next.delete(id);
      return next;
    });
  }, []);

  const handleBulkDelete = useCallback(async () => {
    if (selectedIds.size === 0) return;
    if (
      !confirm(
        `Hapus ${selectedIds.size} file penawaran yang dipilih? Tindakan ini tidak bisa dibatalkan.`
      )
    ) {
      return;
    }
    setDeletingBulk(true);
    try {
      const r = await fetch("/api/quotations/bulk-delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: [...selectedIds] }),
      });
      if (!r.ok) {
        toastError("Gagal menghapus penawaran");
        return;
      }
      setSelectedIds(new Set());
      setSelectMode(false);
      await loadList();
      toastSuccess("Penawaran dihapus");
    } finally {
      setDeletingBulk(false);
    }
  }, [selectedIds, loadList]);

  const openQuotation = useCallback(
    (id: string) => {
      router.push(`/documentation?id=${id}`);
      setScreen("editor");
      void loadQuotation(id);
    },
    [router, loadQuotation]
  );

  const backToList = useCallback(() => {
    router.push("/documentation");
    setScreen("list");
    setQuotation(null);
    setSelectedId(null);
  }, [router]);

  useEffect(() => {
    if (!fromProject || !settings || loading || fromProjectHandled.current) return;
    fromProjectHandled.current = true;
    let cancelled = false;
    (async () => {
      const r = await fetch("/api/quotations", { method: "POST" });
      if (!r.ok || cancelled) return;
      const created = (await r.json()) as QuotationApi;
      const proj =
        available.find((p) => p.id === fromProject) ??
        (await fetch(`/api/projects/${fromProject}`).then((x) =>
          x.ok ? x.json() : null
        )) as AvailableProject | null;
      if (!proj || cancelled) {
        router.replace(`/documentation?id=${created.id}`);
        setScreen("editor");
        await loadQuotation(created.id);
        return;
      }
      const detailRes = await fetch(`/api/projects/${fromProject}`);
      const fullDetail = detailRes.ok
        ? ((await detailRes.json()) as CostingProjectApi)
        : null;
      const autoSpec = fullDetail
        ? segmentTitlesSpecFromProject(fullDetail)
        : "";
      const specLine =
        (autoSpec && autoSpec.slice(0, SPEC_MAX_CHARS)) ||
        defaultSpec(proj) ||
        null;
      const body = {
        items: [
          {
            projectId: proj.id,
            description: defaultDesc(proj),
            spec: specLine,
            qty: 1,
            uom: "Unit",
          },
        ],
        ppn: settings.ppnRate,
        discount: 0,
        discountEnabled: true,
        ppnEnabled: true,
        pphEnabled: false,
        pphRate: 0,
      };
      const put = await fetch(`/api/quotations/${created.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!put.ok || cancelled) return;
      await loadList();
      router.replace(`/documentation?id=${created.id}`);
      setScreen("editor");
      await loadQuotation(created.id);
    })();
  }, [fromProject, settings, available, loading, loadList, loadQuotation, router]);

  const previewTotals = useMemo(() => {
    const lineTotals = form.items.map((it) => it.qty * it.unitPrice);
    const dEff = form.discountEnabled ? form.discount : 0;
    const pEff = form.ppnEnabled ? form.ppn : 0;
    return computeQuotationTotals(lineTotals, dEff, pEff, {
      pphEnabled: form.pphEnabled,
      pphPercent: form.pphRate,
    });
  }, [
    form.items,
    form.discount,
    form.discountEnabled,
    form.ppn,
    form.ppnEnabled,
    form.pphEnabled,
    form.pphRate,
  ]);

  /** TTD images: quotation override wins; otherwise Settings preset (same as mergeQuotationDoc). */
  const effectiveTtdPrepared = useMemo(() => {
    if (form.ttdPrepared?.startsWith("data:")) return form.ttdPrepared;
    return settings?.presetTtdPrepared ?? "";
  }, [form.ttdPrepared, settings?.presetTtdPrepared]);

  const effectiveTtdReviewed = useMemo(() => {
    if (form.ttdReviewed?.startsWith("data:")) return form.ttdReviewed;
    return settings?.presetTtdReviewed ?? "";
  }, [form.ttdReviewed, settings?.presetTtdReviewed]);

  const effectiveTtdApproved = useMemo(() => {
    if (form.ttdApproved?.startsWith("data:")) return form.ttdApproved;
    return settings?.presetTtdApproved ?? "";
  }, [form.ttdApproved, settings?.presetTtdApproved]);

  const mergedPayloadForDoc = useMemo(() => {
    const base = quotation ?? ({} as QuotationApi);
    return {
      status: form.status,
      noSurat: form.noSurat || null,
      tanggal: form.tanggal
        ? new Date(form.tanggal).toISOString()
        : new Date().toISOString(),
      perihal: form.perihal || null,
      clientName: form.clientName || null,
      clientCompany: form.clientCompany || null,
      clientAddress: form.clientAddress || null,
      clientAttn: form.clientAttn || null,
      clientPhone: form.clientPhone || null,
      projectLocation: form.projectLocation || null,
      ourRef: form.ourRef || null,
      yourRef: form.yourRef || null,
      discount: form.discountEnabled ? form.discount : 0,
      discountEnabled: form.discountEnabled,
      ppn: form.ppnEnabled ? form.ppn : 0,
      ppnEnabled: form.ppnEnabled,
      pphEnabled: form.pphEnabled,
      pphRate: form.pphRate,
      totalBeforeDisc: previewTotals.totalBeforeDisc,
      totalAfterDisc: previewTotals.totalAfterDisc,
      totalPPN: previewTotals.totalPPN,
      totalPPH: previewTotals.totalPPH,
      grandTotal: previewTotals.grandTotal,
      paymentTerms: form.paymentTerms || null,
      deliveryTerms: form.deliveryTerms || null,
      warrantyTerms: form.warrantyTerms || null,
      validityDays: form.validityDays,
      termsConditions: form.termsConditions || null,
      introText: form.introText.trim() || null,
      notes: form.notes || null,
      ttdPrepared: form.ttdPrepared || null,
      ttdReviewed: form.ttdReviewed || null,
      ttdApproved: form.ttdApproved || null,
      stampPath: form.stampPath || null,
      items: form.items.map((it) => ({
        description: it.description,
        spec: it.spec || null,
        qty: it.qty,
        uom: it.uom,
        unitPrice: it.unitPrice,
        totalPrice: it.qty * it.unitPrice,
      })),
    };
  }, [quotation, form, previewTotals]);

  const mergedDocForExport = useMemo(() => {
    if (!settings) return null;
    return mergeQuotationDoc(mergedPayloadForDoc, settings);
  }, [mergedPayloadForDoc, settings]);

  const save = async () => {
    if (!quotation) return;
    setSaving(true);
    try {
      const tanggalIso =
        form.tanggal && !Number.isNaN(new Date(form.tanggal).getTime())
          ? new Date(form.tanggal).toISOString()
          : new Date().toISOString();
      const body = {
        status: form.status,
        noSurat: form.noSurat || null,
        tanggal: tanggalIso,
        perihal: form.perihal || null,
        ourRef: form.ourRef || null,
        yourRef: form.yourRef || null,
        clientName: form.clientName || null,
        clientCompany: form.clientCompany || null,
        clientAddress: form.clientAddress || null,
        clientAttn: form.clientAttn || null,
        clientPhone: form.clientPhone || null,
        projectLocation: form.projectLocation || null,
        discount: form.discount,
        discountEnabled: form.discountEnabled,
        ppn: form.ppn,
        ppnEnabled: form.ppnEnabled,
        pphEnabled: form.pphEnabled,
        pphRate: form.pphRate,
        paymentTerms: form.paymentTerms,
        deliveryTerms: form.deliveryTerms,
        warrantyTerms: form.warrantyTerms,
        validityDays: form.validityDays,
        termsConditions: form.termsConditions,
        introText: form.introText || null,
        notes: form.notes || null,
        ttdPrepared: form.ttdPrepared || null,
        ttdReviewed: form.ttdReviewed || null,
        ttdApproved: form.ttdApproved || null,
        stampPath: form.stampPath || null,
        items: form.items.map((it) => ({
          id: it.id,
          projectId: it.projectId,
          description: it.description,
          spec: it.spec || null,
          qty: it.qty,
          uom: it.uom,
        })),
      };
      const r = await fetch(`/api/quotations/${quotation.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (r.ok) {
        const updated = (await r.json()) as QuotationApi;
        setQuotation(updated);
        await loadList();
        setForm((prev) => ({
          ...prev,
          discountEnabled: updated.discountEnabled ?? true,
          ppnEnabled: updated.ppnEnabled ?? true,
          ttdPrepared: updated.ttdPrepared ?? "",
          ttdReviewed: updated.ttdReviewed ?? "",
          ttdApproved: updated.ttdApproved ?? "",
          stampPath: updated.stampPath ?? "",
          introText: updated.introText ?? "",
          items: itemsFromApi(updated),
        }));
        toastSuccess("Disimpan");
      } else {
        const err = (await r.json().catch(() => ({}))) as {
          error?: string;
          message?: string;
        };
        const base =
          typeof err?.error === "string" ? err.error : "Gagal menyimpan";
        const detail =
          typeof err?.message === "string" && err.message.trim()
            ? ` — ${err.message}`
            : "";
        toastError(`${base}${detail}`);
      }
    } catch {
      toastError("Gagal menyimpan");
    } finally {
      setSaving(false);
    }
  };

  const addProject = (p: AvailableProject) => {
    void (async () => {
      let spec = defaultSpec(p);
      try {
        const r = await fetch(`/api/projects/${p.id}`);
        if (r.ok) {
          const full = (await r.json()) as CostingProjectApi;
          const auto = segmentTitlesSpecFromProject(full);
          if (auto) spec = auto.slice(0, SPEC_MAX_CHARS);
        }
      } catch {
        /* keep defaultSpec */
      }
      setForm((prev) => ({
        ...prev,
        items: [
          ...prev.items,
          {
            localId: newLocalId(),
            projectId: p.id,
            description: defaultDesc(p),
            spec,
            qty: 1,
            uom: "Unit",
            unitPrice: p.totalSelling,
          },
        ],
      }));
      setPickerOpen(false);
      setProjectQuery("");
    })();
  };

  const updateLine = (localId: string, patch: Partial<FormLine>) => {
    setForm((prev) => ({
      ...prev,
      items: prev.items.map((it) => {
        if (it.localId !== localId) return it;
        const next = { ...it, ...patch };
        return next;
      }),
    }));
  };

  const removeLine = (localId: string) => {
    setForm((prev) => ({
      ...prev,
      items: prev.items.filter((it) => it.localId !== localId),
    }));
  };

  const fileToBase64 = (file: File): Promise<string> =>
    new Promise((resolve, reject) => {
      const r = new FileReader();
      r.onload = () => resolve(String(r.result ?? ""));
      r.onerror = reject;
      r.readAsDataURL(file);
    });

  async function compressImageFile(file: File): Promise<string> {
    try {
      const bmp = await createImageBitmap(file);
      const canvas = document.createElement("canvas");
      const maxW = 1000;
      const w = Math.min(maxW, bmp.width);
      const h = (bmp.height * w) / bmp.width;
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext("2d");
      if (!ctx) return fileToBase64(file);
      ctx.drawImage(bmp, 0, 0, w, h);
      return canvas.toDataURL("image/jpeg", 0.85);
    } catch {
      return fileToBase64(file);
    }
  }

  const fetchBreakdowns = async (): Promise<CostingBreakdown[]> => {
    const ids = [...new Set(form.items.map((i) => i.projectId))];
    const out: CostingBreakdown[] = [];
    for (const pid of ids) {
      const r = await fetch(`/api/projects/${pid}`);
      if (!r.ok) continue;
      const raw = (await r.json()) as CostingProjectApi;
      out.push({
        project: costingProjectToProjectDoc(raw),
        sections: costingProjectToSectionDocs(raw),
      });
    }
    return out;
  };

  useEffect(() => {
    if (screen !== "editor" || previewMode === "quotation") {
      setPreviewBreakdowns([]);
      return;
    }
    let cancelled = false;
    void (async () => {
      const ids = [...new Set(form.items.map((i) => i.projectId))];
      const out: CostingBreakdown[] = [];
      for (const pid of ids) {
        const r = await fetch(`/api/projects/${pid}`);
        if (!r.ok) continue;
        const raw = (await r.json()) as CostingProjectApi;
        out.push({
          project: costingProjectToProjectDoc(raw),
          sections: costingProjectToSectionDocs(raw),
        });
      }
      if (!cancelled) setPreviewBreakdowns(out);
    })();
    return () => {
      cancelled = true;
    };
  }, [screen, previewMode, form.items]);

  const runExport = async (
    kind: "pdf" | "excel",
    variant: "internal" | "quotation" | "detailed"
  ) => {
    if (!settings || !mergedDocForExport) return;
    const qDoc = mergedDocForExport;
    const sDoc = toSettingsDoc(settings);
    const breakdowns = await fetchBreakdowns();
    let blob: Blob;
    let name: string;
    if (kind === "pdf") {
      if (variant === "quotation") {
        blob = generateQuotation(qDoc, sDoc);
        name = "quotation.pdf";
      } else if (variant === "internal") {
        blob = generateInternalDraft(qDoc, sDoc, breakdowns);
        name = "internal-draft.pdf";
      } else {
        blob = generateDetailedCosting(qDoc, sDoc, breakdowns);
        name = "detailed-costing.pdf";
      }
    } else {
      if (variant === "quotation") {
        blob = await generateQuotationExcel(qDoc, sDoc);
        name = "quotation.xlsx";
      } else if (variant === "internal") {
        blob = await generateInternalDraftExcel(qDoc, sDoc, breakdowns);
        name = "internal-draft.xlsx";
      } else {
        blob = await generateDetailedCostingExcel(qDoc, sDoc, breakdowns);
        name = "detailed-costing.xlsx";
      }
    }
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = name;
    a.click();
    URL.revokeObjectURL(url);
    setExportOpen(null);
  };

  const filteredAvailable = useMemo(() => {
    const q = projectQuery.trim().toLowerCase();
    if (!q) return available;
    return available.filter((p) => {
      const label = `${p.name} ${p.ahuModel ?? ""}`.toLowerCase();
      return label.includes(q);
    });
  }, [available, projectQuery]);

  useEffect(() => {
    if (!settings || !quotation) return;
    setForm((prev) => {
      if (prev.items.length > 0) return prev;
      return {
        ...prev,
        ppn: settings.ppnRate,
        paymentTerms: settings.paymentTerms,
        deliveryTerms: settings.deliveryTerms,
        warrantyTerms: settings.warrantyTerms,
        validityDays: settings.validityDays,
        termsConditions: settings.termsConditions ?? "",
      };
    });
  }, [settings, quotation]);

  if (loading || !settings) {
    return (
      <div className="flex min-h-[calc(100vh-3.5rem)] items-center justify-center bg-muted/40">
        <Loader2 className="size-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (screen === "list") {
    return (
      <div className="min-h-[calc(100vh-3.5rem)] bg-muted/40">
        <DocumentationListView
          quotations={filteredListQuotations.map((q) => ({
            id: q.id,
            noSurat: q.noSurat,
            perihal: q.perihal,
            tanggal: q.tanggal,
            status: q.status,
            grandTotal: q.grandTotal,
          }))}
          onCreate={() => void handleCreate()}
          creating={creating}
          onOpen={(id) => openQuotation(id)}
          selectMode={selectMode}
          onSelectModeChange={(v) => {
            setSelectMode(v);
            if (!v) setSelectedIds(new Set());
          }}
          selectedIds={selectedIds}
          onToggleSelect={handleToggleSelect}
          onDeleteSelected={() => void handleBulkDelete()}
          deleting={deletingBulk}
          search={listSearch}
          onSearchChange={setListSearch}
          statusFilter={listStatusFilter}
          onStatusFilterChange={setListStatusFilter}
          monthFilter={listMonthFilter}
          onMonthFilterChange={setListMonthFilter}
          availableMonths={availableMonths}
          dateFilter={listDateFilter}
          onDateFilterChange={setListDateFilter}
        />
      </div>
    );
  }

  const company = settings.companyName;
  const addrLine = [settings.companyAddress, `${settings.companyPhone} | ${settings.companyEmail}`]
    .filter(Boolean)
    .join(" ");
  const presetSigned = settings.presetSignedByName?.trim() || "—";
  const presetChecked = settings.presetCheckedByName?.trim() || "—";
  const presetApproved = settings.presetApprovedByName?.trim() || "—";

  return (
    <div className="bg-muted relative flex h-[calc(100vh-3.5rem)] min-h-0 flex-col overflow-hidden">
      <div className="bg-card/95 border-border z-30 flex shrink-0 flex-col gap-2 border-b px-4 py-2.5 backdrop-blur sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="gap-1 shrink-0 text-muted-foreground"
            onClick={() => backToList()}
          >
            <ArrowLeft className="size-4" />
            Kembali
          </Button>
          <Input
            value={form.perihal}
            onChange={(e) => setForm((f) => ({ ...f, perihal: e.target.value }))}
            placeholder="Nama penawaran"
            className="border-input h-9 min-w-[10rem] flex-1 sm:max-w-md"
            aria-label="Nama penawaran"
          />
          <Select
            value={form.status}
            onValueChange={(v) => setForm((f) => ({ ...f, status: v }))}
          >
            <SelectTrigger className="h-9 w-[130px] shrink-0">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="draft">Draft</SelectItem>
              <SelectItem value="final">Final</SelectItem>
              <SelectItem value="approved">Approved</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex shrink-0 flex-wrap items-center justify-end gap-2">
          <Button
            type="button"
            size="sm"
            disabled={!quotation || saving}
            onClick={() => void save()}
          >
            {saving ? <Loader2 className="size-4 animate-spin" /> : "Simpan"}
          </Button>
          <Button
            type="button"
            size="sm"
            className="border-red-700/90 bg-[#E5252A] text-white hover:bg-[#c91f24] dark:border-red-600 dark:bg-[#E5252A] dark:hover:bg-[#c91f24]"
            onClick={() => setExportOpen("pdf")}
          >
            Export PDF <ChevronDown className="ml-1 size-4" />
          </Button>
          <Button
            type="button"
            size="sm"
            className="border-emerald-700/90 bg-[#217346] text-white hover:bg-[#1a5c38] dark:border-emerald-600 dark:bg-[#217346] dark:hover:bg-[#1a5c38]"
            onClick={() => setExportOpen("excel")}
          >
            Export Excel <ChevronDown className="ml-1 size-4" />
          </Button>
        </div>
      </div>

      <div className="grid min-h-0 flex-1 grid-cols-1 gap-4 overflow-hidden p-4 lg:grid-cols-[minmax(0,34%)_minmax(0,66%)]">
        <Card className="border-border flex min-h-0 flex-col overflow-hidden">
          <CardContent className="flex min-h-0 flex-1 flex-col overflow-hidden p-0">
            <Tabs
              defaultValue="identitas"
              className="flex min-h-0 w-full flex-1 flex-col"
            >
              <TabsList className="grid w-full shrink-0 grid-cols-5 rounded-none border-b bg-muted/40 px-1">
                <TabsTrigger value="identitas" className="text-xs">
                  Identitas
                </TabsTrigger>
                <TabsTrigger value="klien" className="text-xs">
                  Klien
                </TabsTrigger>
                <TabsTrigger value="items" className="text-xs">
                  Item
                </TabsTrigger>
                <TabsTrigger value="syarat" className="text-xs">
                  S&K
                </TabsTrigger>
                <TabsTrigger value="ttd" className="text-xs">
                  TTD
                </TabsTrigger>
              </TabsList>

              <TabsContent
                value="identitas"
                className="mt-0 min-h-0 flex-1 space-y-3 overflow-y-auto p-4"
              >
                <div className="grid gap-2">
                  <Label>No. Surat</Label>
                  <Input
                    value={form.noSurat}
                    onChange={(e) => setForm((f) => ({ ...f, noSurat: e.target.value }))}
                  />
                </div>
                <div className="grid gap-2">
                  <Label>Tanggal</Label>
                  <Input
                    type="date"
                    value={form.tanggal}
                    onChange={(e) => setForm((f) => ({ ...f, tanggal: e.target.value }))}
                  />
                </div>
                <div className="grid gap-2">
                  <Label>Perihal</Label>
                  <Input
                    value={form.perihal}
                    onChange={(e) => setForm((f) => ({ ...f, perihal: e.target.value }))}
                  />
                </div>
                <div className="grid gap-2">
                  <Label>Sambutan (sebelum tabel)</Label>
                  <p className="text-muted-foreground text-xs leading-snug">
                    Teks pembuka surat. Tekan Enter untuk baris baru; baris kosong untuk jeda antar
                    paragraf.
                  </p>
                  <textarea
                    className="border-input bg-background ring-offset-background placeholder:text-muted-foreground focus-visible:ring-ring flex min-h-[120px] w-full rounded-md border px-3 py-2 text-sm focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
                    value={form.introText}
                    placeholder={DEFAULT_QUOTATION_INTRO}
                    onChange={(e) => setForm((f) => ({ ...f, introText: e.target.value }))}
                  />
                </div>
                <div className="grid gap-2">
                  <Label>Our Ref</Label>
                  <Input
                    value={form.ourRef}
                    onChange={(e) => setForm((f) => ({ ...f, ourRef: e.target.value }))}
                  />
                </div>
                <div className="grid gap-2">
                  <Label>Your Ref</Label>
                  <Input
                    value={form.yourRef}
                    onChange={(e) => setForm((f) => ({ ...f, yourRef: e.target.value }))}
                  />
                </div>
              </TabsContent>

              <TabsContent
                value="klien"
                className="mt-0 min-h-0 flex-1 space-y-3 overflow-y-auto p-4"
              >
                <div className="grid gap-2">
                  <Label>Nama Klien</Label>
                  <Input
                    value={form.clientName}
                    onChange={(e) => setForm((f) => ({ ...f, clientName: e.target.value }))}
                  />
                </div>
                <div className="grid gap-2">
                  <Label>Perusahaan</Label>
                  <Input
                    value={form.clientCompany}
                    onChange={(e) => setForm((f) => ({ ...f, clientCompany: e.target.value }))}
                  />
                </div>
                <div className="grid gap-2">
                  <Label>Alamat</Label>
                  <textarea
                    className="border-input bg-background ring-offset-background placeholder:text-muted-foreground focus-visible:ring-ring flex min-h-[80px] w-full rounded-md border px-3 py-2 text-sm focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
                    value={form.clientAddress}
                    onChange={(e) => setForm((f) => ({ ...f, clientAddress: e.target.value }))}
                  />
                </div>
                <div className="grid gap-2">
                  <Label>Attn</Label>
                  <Input
                    value={form.clientAttn}
                    onChange={(e) => setForm((f) => ({ ...f, clientAttn: e.target.value }))}
                  />
                </div>
                <div className="grid gap-2">
                  <Label>No. Telp</Label>
                  <Input
                    value={form.clientPhone}
                    onChange={(e) => setForm((f) => ({ ...f, clientPhone: e.target.value }))}
                  />
                </div>
                <div className="grid gap-2">
                  <Label>Lokasi Proyek</Label>
                  <Input
                    value={form.projectLocation}
                    onChange={(e) => setForm((f) => ({ ...f, projectLocation: e.target.value }))}
                  />
                </div>
              </TabsContent>

              <TabsContent
                value="items"
                className="mt-0 min-h-0 flex-1 space-y-4 overflow-y-auto p-4"
              >
                <div className="relative">
                  <Label className="mb-1 block">Tambah item dari Costing...</Label>
                  <Input
                    placeholder="Cari nama / model..."
                    value={projectQuery}
                    onChange={(e) => {
                      setProjectQuery(e.target.value);
                      setPickerOpen(true);
                    }}
                    onFocus={() => setPickerOpen(true)}
                  />
                  {pickerOpen && (
                    <div className="border-input absolute z-20 mt-1 max-h-56 w-full overflow-auto rounded-md border bg-white shadow-lg">
                      {filteredAvailable.length === 0 ? (
                        <div className="text-muted-foreground p-3 text-sm">
                          Tidak ada proyek final/approved dengan harga jual &gt; 0.
                        </div>
                      ) : (
                        filteredAvailable.map((p) => (
                          <button
                            key={p.id}
                            type="button"
                            className="hover:bg-muted/40 flex w-full items-start gap-2 px-3 py-2 text-left text-sm"
                            onClick={() => addProject(p)}
                          >
                            <Plus className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                            <span>
                              <span className="font-medium">{p.name}</span>
                              {p.ahuModel ? (
                                <span className="text-muted-foreground"> · {p.ahuModel}</span>
                              ) : null}
                              <span className="block text-xs text-emerald-700">
                                {formatIDR(p.totalSelling)}
                              </span>
                            </span>
                          </button>
                        ))
                      )}
                    </div>
                  )}
                </div>

                <div className="overflow-x-auto rounded-md border">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-muted/40">
                      <tr>
                        <th className="px-2 py-2">No</th>
                        <th className="px-2 py-2">Deskripsi</th>
                        <th className="px-2 py-2">Spesifikasi</th>
                        <th className="px-2 py-2">Qty</th>
                        <th className="px-2 py-2">UOM</th>
                        <th className="px-2 py-2">Harga Sat.</th>
                        <th className="px-2 py-2">Total</th>
                        <th className="w-8" />
                      </tr>
                    </thead>
                    <tbody>
                      {form.items.map((it, idx) => {
                        const apiItem = quotation?.items?.find((x) => x.id === it.id);
                        const live =
                          apiItem?.project?.totalSelling ??
                          available.find((p) => p.id === it.projectId)?.totalSelling;
                        const stale =
                          live != null && Math.abs(live - it.unitPrice) > 0.5;
                        return (
                          <tr key={it.localId} className="border-t">
                            <td className="px-2 py-2 align-top">{idx + 1}</td>
                            <td className="px-2 py-2 align-top">
                              <Input
                                value={it.description}
                                onChange={(e) =>
                                  updateLine(it.localId, { description: e.target.value })
                                }
                              />
                            </td>
                            <td className="px-2 py-2 align-top">
                              <textarea
                                className="border-input field-sizing-content min-h-[72px] w-full min-w-[12rem] max-w-[min(100%,22rem)] rounded border px-2 py-1.5 text-xs leading-snug"
                                value={it.spec}
                                maxLength={SPEC_MAX_CHARS}
                                rows={4}
                                placeholder="Judul segmen dari costing (urut). Enter = baris baru. Maks. 4000 karakter."
                                onChange={(e) =>
                                  updateLine(it.localId, {
                                    spec: e.target.value.slice(0, SPEC_MAX_CHARS),
                                  })
                                }
                              />
                              <p className="text-muted-foreground mt-0.5 text-[10px]">
                                {it.spec.length}/{SPEC_MAX_CHARS}
                              </p>
                            </td>
                            <td className="px-2 py-2 align-top">
                              <Input
                                type="number"
                                min={1}
                                className="w-20"
                                value={it.qty}
                                onChange={(e) =>
                                  updateLine(it.localId, {
                                    qty: Math.max(1, Math.floor(Number(e.target.value)) || 1),
                                  })
                                }
                              />
                            </td>
                            <td className="px-2 py-2 align-top">
                              <Input
                                className="w-20"
                                value={it.uom}
                                onChange={(e) =>
                                  updateLine(it.localId, { uom: e.target.value })
                                }
                              />
                            </td>
                            <td className="px-2 py-2 align-top">
                              <div className="flex items-center gap-1">
                                <span className="text-xs whitespace-nowrap">
                                  {formatIDR(it.unitPrice)}
                                </span>
                                {stale ? (
                                  <span title="Harga costing di engine sudah berubah; harga penawaran tidak diubah otomatis.">
                                    <AlertTriangle className="size-4 text-amber-500" />
                                  </span>
                                ) : null}
                              </div>
                            </td>
                            <td className="px-2 py-2 align-top text-xs">
                                  {formatIDR(it.qty * it.unitPrice)}
                            </td>
                            <td className="px-2 py-2 align-top">
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="size-8"
                                onClick={() => removeLine(it.localId)}
                              >
                                <X className="size-4" />
                              </Button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                <div className="space-y-2 rounded-lg border bg-white p-4 text-sm">
                  <div className="flex justify-between">
                    <span>Subtotal</span>
                    <span>{formatIDR(previewTotals.totalBeforeDisc)}</span>
                  </div>
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={form.discountEnabled}
                        onCheckedChange={(v) =>
                          setForm((f) => ({ ...f, discountEnabled: v }))
                        }
                      />
                      <span>Diskon (%)</span>
                    </div>
                    <Input
                      type="number"
                      min={0}
                      className="w-24"
                      disabled={!form.discountEnabled}
                      value={form.discount}
                      onChange={(e) =>
                        setForm((f) => ({
                          ...f,
                          discount: Math.max(0, Number(e.target.value) || 0),
                        }))
                      }
                    />
                    <span className="text-right">
                      {form.discountEnabled ? (
                        <>
                          -
                          {formatIDR(
                            Math.max(
                              0,
                              previewTotals.totalBeforeDisc -
                                previewTotals.totalAfterDisc
                            )
                          )}
                        </>
                      ) : (
                        formatIDR(0)
                      )}
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={form.pphEnabled}
                        onCheckedChange={(v) =>
                          setForm((f) => ({ ...f, pphEnabled: v }))
                        }
                      />
                      <span>PPH / PPh (%)</span>
                    </div>
                    {form.pphEnabled ? (
                      <Input
                        type="number"
                        min={0}
                        className="w-24"
                        value={form.pphRate}
                        onChange={(e) =>
                          setForm((f) => ({
                            ...f,
                            pphRate: Math.max(0, Number(e.target.value) || 0),
                          }))
                        }
                      />
                    ) : (
                      <span />
                    )}
                    <span>
                      {form.pphEnabled
                        ? formatIDR(previewTotals.totalPPH)
                        : formatIDR(0)}
                    </span>
                  </div>
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={form.ppnEnabled}
                        onCheckedChange={(v) =>
                          setForm((f) => ({ ...f, ppnEnabled: v }))
                        }
                      />
                      <span>PPN (%)</span>
                    </div>
                    <Input
                      type="number"
                      min={0}
                      className="w-24"
                      disabled={!form.ppnEnabled}
                      value={form.ppn}
                      onChange={(e) =>
                        setForm((f) => ({
                          ...f,
                          ppn: Math.max(0, Number(e.target.value) || 0),
                        }))
                      }
                    />
                    <span>
                      {form.ppnEnabled
                        ? formatIDR(previewTotals.totalPPN)
                        : formatIDR(0)}
                    </span>
                  </div>
                  <div className="flex justify-between border-t pt-2 text-base font-bold text-emerald-800">
                    <span>Grand Total</span>
                    <span>{formatIDR(previewTotals.grandTotal)}</span>
                  </div>
                </div>
              </TabsContent>

              <TabsContent
                value="syarat"
                className="mt-0 min-h-0 flex-1 space-y-3 overflow-y-auto p-4"
              >
                <div className="grid gap-2">
                  <Label>Pembayaran</Label>
                  <Input
                    value={form.paymentTerms}
                    onChange={(e) => setForm((f) => ({ ...f, paymentTerms: e.target.value }))}
                  />
                </div>
                <div className="grid gap-2">
                  <Label>Pengiriman</Label>
                  <Input
                    value={form.deliveryTerms}
                    onChange={(e) => setForm((f) => ({ ...f, deliveryTerms: e.target.value }))}
                  />
                </div>
                <div className="grid gap-2">
                  <Label>Garansi</Label>
                  <Input
                    value={form.warrantyTerms}
                    onChange={(e) => setForm((f) => ({ ...f, warrantyTerms: e.target.value }))}
                  />
                </div>
                <div className="flex items-end gap-2">
                  <div className="grid flex-1 gap-2">
                    <Label>Validitas (hari)</Label>
                    <Input
                      type="number"
                      min={0}
                      value={form.validityDays}
                      onChange={(e) =>
                        setForm((f) => ({
                          ...f,
                          validityDays: Math.max(0, Math.round(Number(e.target.value)) || 0),
                        }))
                      }
                    />
                  </div>
                </div>
                <div className="grid gap-2">
                  <Label>T&amp;C</Label>
                  <textarea
                    className="border-input bg-background min-h-[100px] w-full rounded-md border px-3 py-2 text-sm"
                    value={form.termsConditions}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, termsConditions: e.target.value }))
                    }
                  />
                </div>
                <div className="grid gap-2">
                  <Label>Catatan</Label>
                  <textarea
                    className="border-input bg-background min-h-[80px] w-full rounded-md border px-3 py-2 text-sm"
                    value={form.notes}
                    onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                  />
                </div>
              </TabsContent>

              <TabsContent
                value="ttd"
                className="mt-0 min-h-0 flex-1 space-y-4 overflow-y-auto p-4"
              >
                <p className="text-muted-foreground text-xs leading-relaxed">
                  Nama PJ diisi di{" "}
                  <span className="font-medium text-foreground">Settings → Penanggung jawab</span>.
                  Logo perusahaan di{" "}
                  <span className="font-medium text-foreground">Settings → Company Profile → Logo</span>.
                </p>
                {(
                  [
                    {
                      label: "Dibuat oleh",
                      name: presetSigned,
                      formKey: "ttdPrepared" as const,
                    },
                    {
                      label: "Diperiksa",
                      name: presetChecked,
                      formKey: "ttdReviewed" as const,
                    },
                    {
                      label: "Disetujui",
                      name: presetApproved,
                      formKey: "ttdApproved" as const,
                    },
                  ] as const
                ).map((row) => (
                  <div key={row.formKey} className="flex items-end gap-2">
                    <div className="grid min-w-0 flex-1 gap-1">
                      <Label>{row.label}</Label>
                      <Input readOnly value={row.name} className="bg-muted/40" />
                    </div>
                    <div className="flex shrink-0 flex-col items-end gap-1 pb-0.5">
                      <Input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        id={`ttd-${row.formKey}`}
                        onChange={async (e) => {
                          const f = e.target.files?.[0];
                          if (!f) return;
                          const b64 = await compressImageFile(f);
                          setForm((prev) => ({ ...prev, [row.formKey]: b64 }));
                        }}
                      />
                      <Button type="button" variant="outline" size="sm" asChild>
                        <label htmlFor={`ttd-${row.formKey}`} className="cursor-pointer">
                          Upload TTD
                        </label>
                      </Button>
                      {(() => {
                        const eff =
                          row.formKey === "ttdPrepared"
                            ? effectiveTtdPrepared
                            : row.formKey === "ttdReviewed"
                              ? effectiveTtdReviewed
                              : effectiveTtdApproved;
                        return eff?.startsWith("data:") ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={eff}
                            alt=""
                            className="mt-1 max-h-14 border bg-white object-contain p-0.5"
                          />
                        ) : null;
                      })()}
                    </div>
                  </div>
                ))}
                <div className="border-t pt-4">
                  <Label>Upload stamp (cap)</Label>
                  <p className="text-muted-foreground mt-0.5 text-xs">
                    Ditampilkan di PDF jika status{" "}
                    <span className="font-medium">Approved</span>, di depan tanda tangan
                    kolom Disetujui (seperti stempel basah).
                  </p>
                  <Input
                    type="file"
                    accept="image/*"
                    className="mt-2 max-w-xs"
                    onChange={async (e) => {
                      const f = e.target.files?.[0];
                      if (!f) return;
                      const b64 = await compressImageFile(f);
                      setForm((prev) => ({ ...prev, stampPath: b64 }));
                    }}
                  />
                  {form.stampPath?.startsWith("data:") ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={form.stampPath}
                      alt="Stamp"
                      className="mt-2 max-h-24 rotate-[-8deg] border bg-white object-contain p-1 opacity-50"
                    />
                  ) : null}
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        <div className="flex min-h-0 min-w-0 flex-col gap-2 overflow-hidden">
          <div className="flex shrink-0 flex-wrap gap-2">
            <Button
              type="button"
              variant={previewMode === "quotation" ? "default" : "outline"}
              size="sm"
              className="gap-1"
              onClick={() => setPreviewMode("quotation")}
            >
              <FileText className="size-3.5" />
              Quotation
            </Button>
            <Button
              type="button"
              variant={previewMode === "detailed" ? "default" : "outline"}
              size="sm"
              className="gap-1"
              onClick={() => setPreviewMode("detailed")}
            >
              <PenLine className="size-3.5" />
              Detailed costing
            </Button>
            <Button
              type="button"
              variant={previewMode === "internal" ? "default" : "outline"}
              size="sm"
              className="gap-1"
              onClick={() => setPreviewMode("internal")}
            >
              <FileStack className="size-3.5" />
              Internal costing
            </Button>
          </div>
          <div className="relative min-h-0 flex-1 overflow-y-auto rounded-lg border border-border bg-muted/30 p-2 sm:p-3">
            <div
              className={`relative z-0 mx-auto box-border w-full max-w-[min(100%,56rem)] rounded-md bg-white p-6 shadow-md sm:p-8 ${
                form.status === "draft"
                  ? "ring-2 ring-inset ring-red-500/75"
                  : "border border-border"
              }`}
            >
            {form.status === "draft" ? (
              <div
                className="pointer-events-none absolute inset-0 z-0 flex items-center justify-center text-6xl font-bold text-red-500/15"
                style={{ transform: "rotate(-28deg)" }}
              >
                DRAFT
              </div>
            ) : null}
            <div className="relative z-[1] text-sm leading-relaxed">
              <div className="flex gap-4">
                {settings.companyLogo?.startsWith("data:") ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={settings.companyLogo}
                    alt=""
                    className="h-14 w-28 object-contain"
                  />
                ) : (
                  <div className="h-14 w-28 bg-muted" />
                )}
                <div>
                  <div className="font-bold uppercase">{company}</div>
                  <div className="text-muted-foreground mt-1 text-xs">{addrLine}</div>
                </div>
              </div>
              <div className="my-4 border-t border-border" />
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <div>Kepada Yth.</div>
                  <div className="font-medium">{form.clientCompany || form.clientName || "—"}</div>
                  {form.clientName && form.clientCompany ? (
                    <div>Up. {form.clientName}</div>
                  ) : null}
                  <div className="text-muted-foreground mt-2 whitespace-pre-wrap text-xs">
                    {form.clientAddress || "—"}
                  </div>
                </div>
                <div className="text-right text-xs">
                  <div>
                    No : <span className="font-medium">{form.noSurat || "—"}</span>
                  </div>
                  <div>
                    Tgl:{" "}
                    {form.tanggal
                      ? new Date(form.tanggal).toLocaleDateString("id-ID", {
                          day: "numeric",
                          month: "long",
                          year: "numeric",
                        })
                      : "—"}
                  </div>
                </div>
              </div>
              <div className="mt-4">
                Perihal: <span className="font-medium">{form.perihal || "—"}</span>
              </div>
              <div className="mt-4 whitespace-pre-wrap">
                {form.introText.trim()
                  ? form.introText
                  : DEFAULT_QUOTATION_INTRO}
              </div>

              <table className="mt-4 w-full table-fixed border-collapse border border-border text-xs">
                <colgroup>
                  <col className="w-[5%]" />
                  <col className="min-w-0 w-[30%]" />
                  <col className="w-[10%]" />
                  <col className="w-[9%]" />
                  <col className="w-[23%]" />
                  <col className="w-[23%]" />
                </colgroup>
                <thead>
                  <tr className="bg-muted/40">
                    <th className="border border-border px-1 py-1 text-center">No</th>
                    <th className="border border-border px-1 py-1 text-center">Deskripsi</th>
                    <th className="border border-border px-1 py-1 text-center">Qty</th>
                    <th className="border border-border px-1 py-1 text-center">UOM</th>
                    <th className="border border-border px-1 py-1 text-center">Harga Sat.</th>
                    <th className="border border-border px-1 py-1 text-center">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {form.items.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="border border-border px-2 py-3 text-center text-muted-foreground">
                        Belum ada item
                      </td>
                    </tr>
                  ) : (
                    form.items.map((it, i) => (
                      <tr key={it.localId}>
                        <td className="border border-border px-1 py-1 text-center align-top">
                          {i + 1}
                        </td>
                        <td className="border border-border px-1 py-1 align-top break-words">
                          <div className="break-words">{it.description}</div>
                          {it.spec ? (
                            <div className="text-muted-foreground mt-1 text-[10px] whitespace-pre-wrap break-words [overflow-wrap:anywhere]">
                              {it.spec}
                            </div>
                          ) : null}
                        </td>
                        <td className="border border-border px-1 py-1 text-center align-top tabular-nums">
                          {it.qty}
                        </td>
                        <td className="border border-border px-1 py-1 text-center align-top break-words">
                          {it.uom}
                        </td>
                        <td className="border border-border px-1 py-1 text-right align-top tabular-nums whitespace-normal break-all">
                          {formatIDR(it.unitPrice)}
                        </td>
                        <td className="border border-border px-1 py-1 text-right align-top tabular-nums whitespace-normal break-all">
                          {formatIDR(it.qty * it.unitPrice)}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>

              {previewMode === "detailed" && previewBreakdowns.length > 0 ? (
                <div className="mt-6 border-t border-border pt-4 text-xs">
                  <div className="font-semibold text-foreground">Rincian per kategori</div>
                  {previewBreakdowns.map((cb) => (
                    <div key={cb.project.name} className="mt-3">
                      <div className="text-foreground font-medium">{cb.project.name}</div>
                      <div className="text-muted-foreground mt-1 space-y-0.5 pl-2">
                        {cb.sections.map((sec, si) => (
                          <div
                            key={`${cb.project.name}-${si}-${sec.category}`}
                            className="flex justify-between gap-4"
                          >
                            <span className="min-w-0 break-words">{sec.category}</span>
                            <span className="tabular-nums shrink-0">
                              {formatIDR(sec.subtotal)}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              ) : null}

              {previewMode === "internal" && previewBreakdowns.length > 0 ? (
                <div className="mt-6 border-t border-dashed border-border pt-4 text-xs">
                  <div className="font-semibold text-foreground">Internal — ringkasan biaya per proyek</div>
                  {previewBreakdowns.map((cb) => (
                    <div key={cb.project.name} className="mt-3">
                      <div className="text-foreground font-medium">{cb.project.name}</div>
                      <div className="text-muted-foreground mt-1 space-y-0.5 pl-2">
                        {cb.sections.map((sec, si) => (
                          <div
                            key={`${cb.project.name}-int-${si}-${sec.category}`}
                            className="flex justify-between gap-4"
                          >
                            <span className="min-w-0 break-words">{sec.category}</span>
                            <span className="tabular-nums shrink-0">
                              {formatIDR(sec.subtotal)}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              ) : null}

              <div className="mt-4 space-y-1 text-right text-xs">
                <div>
                  Subtotal : {formatIDR(previewTotals.totalBeforeDisc)}
                </div>
                {form.discountEnabled ? (
                  <div>
                    Diskon {form.discount}% : -
                    {formatIDR(
                      Math.max(
                        0,
                        previewTotals.totalBeforeDisc - previewTotals.totalAfterDisc
                      )
                    )}
                  </div>
                ) : (
                  <div>Diskon : {formatIDR(0)}</div>
                )}
                {form.pphEnabled ? (
                  <div>
                    PPH {form.pphRate}% : {formatIDR(previewTotals.totalPPH)}
                  </div>
                ) : null}
                {form.ppnEnabled ? (
                  <div>
                    PPN {form.ppn}% : {formatIDR(previewTotals.totalPPN)}
                  </div>
                ) : (
                  <div>PPN : {formatIDR(0)}</div>
                )}
                <div className="text-base font-bold text-emerald-800">
                  Grand Total: {formatIDR(previewTotals.grandTotal)}
                </div>
              </div>

              {form.notes ? (
                <div className="mt-6 text-xs">
                  <div className="font-medium">Catatan:</div>
                  <div className="whitespace-pre-wrap">{form.notes}</div>
                </div>
              ) : null}

              <div className="mt-6 text-xs">
                <div className="font-medium">Syarat &amp; Ketentuan:</div>
                <ul className="mt-1 list-inside list-disc space-y-0.5">
                  <li>Pembayaran : {form.paymentTerms || "—"}</li>
                  <li>Pengiriman : {form.deliveryTerms || "—"}</li>
                  <li>Garansi : {form.warrantyTerms || "—"}</li>
                  <li>Validitas : {form.validityDays} hari</li>
                </ul>
                {form.termsConditions ? (
                  <p className="mt-2 whitespace-pre-wrap">{form.termsConditions}</p>
                ) : null}
              </div>

              <div className="mt-10 grid grid-cols-3 gap-2 text-center text-xs">
                <div className="relative">
                  <div>Dibuat oleh,</div>
                  {effectiveTtdPrepared?.startsWith("data:") ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={effectiveTtdPrepared}
                      alt=""
                      className="mx-auto mt-2 max-h-14 object-contain"
                    />
                  ) : (
                    <div className="mt-10" />
                  )}
                  <div className="mt-2 font-medium">{presetSigned}</div>
                </div>
                <div className="relative">
                  <div>Diperiksa,</div>
                  {effectiveTtdReviewed?.startsWith("data:") ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={effectiveTtdReviewed}
                      alt=""
                      className="mx-auto mt-2 max-h-14 object-contain"
                    />
                  ) : (
                    <div className="mt-10" />
                  )}
                  <div className="mt-2 font-medium">{presetChecked}</div>
                </div>
                <div className="relative">
                  <div>Disetujui,</div>
                  <div className="relative mx-auto mt-2 flex min-h-[4rem] items-center justify-center">
                    {effectiveTtdApproved?.startsWith("data:") ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={effectiveTtdApproved}
                        alt=""
                        className="relative z-10 max-h-14 object-contain"
                      />
                    ) : (
                      <div className="h-14 w-full max-w-[120px]" />
                    )}
                    {form.status === "approved" && form.stampPath?.startsWith("data:") ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={form.stampPath}
                        alt=""
                        className="pointer-events-none absolute left-1/2 top-1/2 z-20 max-h-[4.5rem] w-auto -translate-x-1/2 -translate-y-1/2 rotate-[-12deg] object-contain opacity-50"
                      />
                    ) : null}
                  </div>
                  <div className="relative z-[1] mt-2 font-medium">{presetApproved}</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      </div>

      <Dialog open={exportOpen !== null} onOpenChange={(o) => !o && setExportOpen(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {exportOpen === "pdf" ? "Export PDF" : "Export Excel"}
            </DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-2">
            <Button
              variant="secondary"
              onClick={() =>
                void runExport(exportOpen === "excel" ? "excel" : "pdf", "internal")
              }
            >
              Internal Draft
            </Button>
            <Button
              variant="secondary"
              onClick={() =>
                void runExport(exportOpen === "excel" ? "excel" : "pdf", "quotation")
              }
            >
              Quotation
            </Button>
            <Button
              variant="secondary"
              onClick={() =>
                void runExport(exportOpen === "excel" ? "excel" : "pdf", "detailed")
              }
            >
              Detailed Costing
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
