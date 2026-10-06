"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { type CustomerFolder } from "@/components/documentation/documentation-list-view";
import { mergeQuotationDoc } from "@/lib/merge-quotation-doc";
import { costingProjectToProjectDoc, costingProjectToSectionDocs, quotationSubAssemblyLineItemsFromProjects, segmentTitlesSpecFromProject, type CostingProjectApi } from "@/lib/quotation-export-mappers";
import { computeProjectProgress, documentationHref } from "@/lib/o2c/project-progress";
import { computeQuotationTotals } from "@/lib/quotation-financials";
import { toastError, toastSuccess } from "@/store/toastStore";
import { useUiWorkflowStore } from "@/store/uiWorkflowStore";
import { useConfirm } from "@/components/confirm-dialog";
import { SPEC_MAX_CHARS, fetchProjectDetailCached, readErr, CostingBreakdown, AvailableProject, CustomerOption, QuotationApi, toListRow, folderNameFor, folderKeyFor, FormLine, SettingsRow, toSettingsDoc, newLocalId, defaultDesc, defaultSpec, itemsFromApi, fmtDateInput } from "./documentation-shared";

export function useDocumentationEditor() {
  const [confirm, confirmDialog] = useConfirm();
  const router = useRouter();
  const searchParams = useSearchParams();
  const fromProject = searchParams.get("fromProject");

  const setDocumentationUi = useUiWorkflowStore((s) => s.setDocumentationUi);
  const screen = useUiWorkflowStore((s) => s.documentation.screen);
  const previewMode = useUiWorkflowStore((s) => s.documentation.previewMode);
  const listSearch = useUiWorkflowStore((s) => s.documentation.listSearch);
  const listStatusFilter = useUiWorkflowStore(
    (s) => s.documentation.listStatusFilter
  );
  const listMonthFilter = useUiWorkflowStore(
    (s) => s.documentation.listMonthFilter
  );
  const listDateFilter = useUiWorkflowStore(
    (s) => s.documentation.listDateFilter
  );

  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [creating, setCreating] = useState(false);
  const [quotations, setQuotations] = useState<QuotationApi[]>([]);
  const [quotation, setQuotation] = useState<QuotationApi | null>(null);
  const [settings, setSettings] = useState<SettingsRow | null>(null);
  const [available, setAvailable] = useState<AvailableProject[]>([]);
  const [projectQuery, setProjectQuery] = useState("");
  const [pickerOpen, setPickerOpen] = useState(false);

  const [customers, setCustomers] = useState<CustomerOption[]>([]);
  const [o2cBusy, setO2cBusy] = useState(false);

  const [form, setForm] = useState({
    status: "draft",
    noSurat: "",
    tanggal: "",
    perihal: "",
    ourRef: "",
    yourRef: "",
    customerId: "",
    salesman: "",
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
  const [previewBreakdowns, setPreviewBreakdowns] = useState<CostingBreakdown[]>([]);

  const [selectMode, setSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(
    () => new Set()
  );
  const [deletingBulk, setDeletingBulk] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);

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
        const t =
          `${q.noSurat ?? ""} ${q.perihal ?? ""} ${q.id} ${q.customer?.name ?? ""} ${q.customer?.company ?? ""}`.toLowerCase();
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

  const customerFolders = useMemo((): CustomerFolder[] => {
    type Acc = {
      key: string;
      name: string;
      projects: QuotationApi[];
      totalValue: number;
      latestMs: number;
    };
    const map = new Map<string, Acc>();
    for (const q of filteredListQuotations) {
      const key = folderKeyFor(q);
      const name = folderNameFor(q);
      const updatedMs = q.updatedAt
        ? new Date(q.updatedAt).getTime()
        : new Date(q.tanggal).getTime();
      const existing = map.get(key);
      if (!existing) {
        map.set(key, {
          key,
          name,
          projects: [q],
          totalValue: q.grandTotal,
          latestMs: updatedMs,
        });
      } else {
        existing.projects.push(q);
        existing.totalValue += q.grandTotal;
        if (updatedMs > existing.latestMs) existing.latestMs = updatedMs;
      }
    }
    return [...map.values()]
      .sort((a, b) => b.latestMs - a.latestMs)
      .map((folder) => ({
        key: folder.key,
        name: folder.name,
        totalValue: folder.totalValue,
        projects: [...folder.projects]
          .sort(
            (a, b) =>
              new Date(b.tanggal).getTime() - new Date(a.tanggal).getTime()
          )
          .map(toListRow),
      }));
  }, [filteredListQuotations]);

  const loadList = useCallback(async () => {
    const r = await fetch("/api/quotations?view=documents");
    if (r.ok) setQuotations(await r.json());
  }, []);

  const loadSettings = useCallback(async () => {
    const r = await fetch("/api/settings");
    if (r.ok) {
      setSettings(await r.json());
      setLoadError(null);
    } else {
      setLoadError(await readErr(r));
    }
  }, []);

  const loadAvailable = useCallback(async () => {
    const r = await fetch("/api/projects/available");
    if (r.ok) setAvailable(await r.json());
  }, []);

  const loadCustomers = useCallback(async () => {
    const r = await fetch("/api/customers");
    if (r.ok) setCustomers((await r.json()) as CustomerOption[]);
  }, []);

  const loadQuotation = useCallback(async (id: string) => {
    const r = await fetch(`/api/quotations/${id}`);
    if (!r.ok) return;
    const q = (await r.json()) as QuotationApi;
    setQuotation(q);
    setDocumentationUi({ selectedId: id });
    setForm({
      status: q.status,
      noSurat: q.noSurat ?? "",
      tanggal: fmtDateInput(q.tanggal),
      perihal: q.perihal ?? "",
      ourRef: q.ourRef ?? "",
      yourRef: q.yourRef ?? "",
      customerId: q.customerId ?? "",
      salesman: q.salesman ?? "",
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
  }, [setDocumentationUi]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      await Promise.all([
        loadList(),
        loadSettings(),
        loadAvailable(),
        loadCustomers(),
      ]);
      if (!cancelled) setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [loadList, loadSettings, loadAvailable, loadCustomers]);

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
      setDocumentationUi({ screen: "editor" });
      void loadQuotation(idParam);
    } else if (!idParam && !fromProject) {
      setDocumentationUi({ screen: "list" });
    }
  }, [
    loading,
    idParam,
    quotations,
    loadQuotation,
    fromProject,
    setDocumentationUi,
  ]);

  const handleCreate = useCallback(async () => {
    if (creating) return;
    setCreating(true);
    try {
      const r = await fetch("/api/quotations", { method: "POST" });
      const body = (await r.json().catch(() => ({}))) as {
        error?: string;
        message?: string;
        code?: string;
        id?: string;
      };
      if (!r.ok) {
        if (body.code === "PLAN_LIMIT_REACHED") {
          toastError(
            body.error?.trim() ||
              "Free plan limit reached. Upgrade to Standard to create more."
          );
          return;
        }
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
      setDocumentationUi({ screen: "editor" });
      await loadQuotation(created.id);
      toastSuccess("Penawaran baru dibuat");
    } finally {
      setCreating(false);
    }
  }, [creating, loadList, loadQuotation, router, setDocumentationUi]);

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
    const ok = await confirm({
      title: `Hapus ${selectedIds.size} file penawaran?`,
      description: "Tindakan ini tidak bisa dibatalkan.",
    });
    if (!ok) return;
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
  }, [selectedIds, loadList, confirm]);

  const openQuotation = useCallback(
    (id: string) => {
      router.push(`/documentation?id=${id}`);
      setDocumentationUi({ screen: "editor" });
      void loadQuotation(id);
    },
    [router, loadQuotation, setDocumentationUi]
  );

  const handleToggleExpand = useCallback((id: string) => {
    setExpandedId((prev) => (prev === id ? null : id));
  }, []);

  const openLatestStage = useCallback(
    (id: string) => {
      const q = quotations.find((row) => row.id === id);
      if (!q) {
        openQuotation(id);
        return;
      }
      const progress = computeProjectProgress(q);
      const stage = progress.stages.find((s) => s.stage === progress.latestStage);
      const href = stage?.href ?? documentationHref(id);
      if (progress.latestStage === "quotation" || href.startsWith("/documentation")) {
        openQuotation(id);
        return;
      }
      router.push(href);
    },
    [quotations, openQuotation, router]
  );

  const backToList = useCallback(() => {
    router.push("/documentation");
    setDocumentationUi({ screen: "list", selectedId: null });
    setQuotation(null);
  }, [router, setDocumentationUi]);

  useEffect(() => {
    if (!fromProject || !settings || loading || fromProjectHandled.current) return;
    fromProjectHandled.current = true;
    const cancelled = false;
    (async () => {
      const r = await fetch("/api/quotations", { method: "POST" });
      if (!r.ok || cancelled) {
        if (!cancelled && !r.ok) {
          const errBody = (await r.json().catch(() => ({}))) as {
            error?: string;
            code?: string;
          };
          toastError(
            errBody.code === "PLAN_LIMIT_REACHED"
              ? errBody.error?.trim() ||
                  "Free plan limit reached. Upgrade to Standard to create more."
              : errBody.error?.trim() || "Gagal membuat penawaran"
          );
        }
        return;
      }
      const created = (await r.json()) as QuotationApi;
      const proj =
        available.find((p) => p.id === fromProject) ??
        (await fetch(`/api/projects/available`)
          .then(async (x) => {
            if (!x.ok) return null;
            const list = (await x.json()) as AvailableProject[];
            return list.find((p) => p.id === fromProject) ?? null;
          })
          .catch(() => null));
      if (!proj || cancelled) {
        router.replace(`/documentation?id=${created.id}`);
        setDocumentationUi({ screen: "editor" });
        await loadQuotation(created.id);
        return;
      }
      const fullDetail = await fetchProjectDetailCached(fromProject);
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
      setDocumentationUi({ screen: "editor" });
      await loadQuotation(created.id);
    })();
  }, [
    fromProject,
    settings,
    available,
    loading,
    loadList,
    loadQuotation,
    router,
    setDocumentationUi,
  ]);

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
  }, [form, previewTotals]);

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
        customerId: form.customerId || null,
        salesman: form.salesman || null,
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
        const full = await fetchProjectDetailCached(p.id);
        if (full) {
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

  const fetchBreakdowns = async (): Promise<{
    breakdowns: CostingBreakdown[];
    projectsById: Map<string, CostingProjectApi>;
  }> => {
    const ids = [...new Set(form.items.map((i) => i.projectId))];
    const results = await Promise.all(ids.map((pid) => fetchProjectDetailCached(pid)));
    const out: CostingBreakdown[] = [];
    const projectsById = new Map<string, CostingProjectApi>();
    for (let i = 0; i < ids.length; i++) {
      const raw = results[i];
      const pid = ids[i];
      if (!raw || !pid) continue;
      projectsById.set(pid, raw);
      out.push({
        project: costingProjectToProjectDoc(raw),
        sections: costingProjectToSectionDocs(raw),
      });
    }
    return { breakdowns: out, projectsById };
  };

  const formProjectIdsKey = [...new Set(form.items.map((i) => i.projectId))]
    .sort()
    .join("\0");

  useEffect(() => {
    if (screen !== "editor" || previewMode === "quotation") {
      setPreviewBreakdowns([]);
      return;
    }
    let cancelled = false;
    void (async () => {
      const ids = formProjectIdsKey ? formProjectIdsKey.split("\0") : [];
      const results = await Promise.all(ids.map((pid) => fetchProjectDetailCached(pid)));
      if (cancelled) return;
      const out: CostingBreakdown[] = [];
      for (const raw of results) {
        if (!raw) continue;
        out.push({
          project: costingProjectToProjectDoc(raw),
          sections: costingProjectToSectionDocs(raw),
        });
      }
      setPreviewBreakdowns(out);
    })();
    return () => {
      cancelled = true;
    };
  }, [screen, previewMode, formProjectIdsKey]);

  const runExport = async (
    kind: "pdf" | "excel",
    variant: "internal" | "quotation" | "detailed"
  ) => {
    if (!settings || !mergedDocForExport) return;
    const sDoc = toSettingsDoc(settings);
    const { breakdowns, projectsById } = await fetchBreakdowns();
    const qDoc =
      variant === "quotation"
        ? {
            ...mergedDocForExport,
            lineItems: quotationSubAssemblyLineItemsFromProjects(
              form.items.map((it) => ({
                projectId: it.projectId,
                qty: it.qty,
                unitPrice: it.unitPrice,
                description: it.description,
                spec: it.spec,
              })),
              projectsById
            ),
          }
        : mergedDocForExport;
    let blob: Blob;
    let name: string;
    if (kind === "pdf") {
      const {
        generateDetailedCosting,
        generateInternalDraft,
        generateQuotation,
      } = await import("@/lib/generators/pdfGenerator");
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
      const {
        generateDetailedCostingExcel,
        generateInternalDraftExcel,
        generateQuotationExcel,
      } = await import("@/lib/generators/excelGenerator");
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


  return {
    confirm,
    confirmDialog,
    router,
    searchParams,
    fromProject,
    setDocumentationUi,
    screen,
    previewMode,
    listSearch,
    listStatusFilter,
    listMonthFilter,
    listDateFilter,
    loading,
    setLoading,
    loadError,
    setLoadError,
    saving,
    setSaving,
    creating,
    setCreating,
    quotations,
    setQuotations,
    quotation,
    setQuotation,
    settings,
    setSettings,
    available,
    setAvailable,
    projectQuery,
    setProjectQuery,
    pickerOpen,
    setPickerOpen,
    customers,
    setCustomers,
    o2cBusy,
    setO2cBusy,
    form,
    setForm,
    exportOpen,
    setExportOpen,
    fromProjectHandled,
    previewBreakdowns,
    setPreviewBreakdowns,
    selectMode,
    setSelectMode,
    selectedIds,
    setSelectedIds,
    deletingBulk,
    setDeletingBulk,
    expandedId,
    setExpandedId,
    availableMonths,
    filteredListQuotations,
    customerFolders,
    loadList,
    loadSettings,
    loadAvailable,
    loadCustomers,
    loadQuotation,
    idParam,
    handleCreate,
    handleToggleSelect,
    handleBulkDelete,
    openQuotation,
    handleToggleExpand,
    openLatestStage,
    backToList,
    previewTotals,
    effectiveTtdPrepared,
    effectiveTtdReviewed,
    effectiveTtdApproved,
    mergedPayloadForDoc,
    mergedDocForExport,
    save,
    addProject,
    updateLine,
    removeLine,
    fileToBase64,
    fetchBreakdowns,
    formProjectIdsKey,
    runExport,
    filteredAvailable,
    compressImageFile,
  };
}

export type DocumentationEditor = ReturnType<typeof useDocumentationEditor>;

/** Editor state once settings are loaded (narrowed non-null) plus derived company strings. */
export type EditorCtx = Omit<DocumentationEditor, "settings"> & {
  settings: NonNullable<DocumentationEditor["settings"]>;
  company: string;
  addrLine: string;
  presetSigned: string;
  presetChecked: string;
  presetApproved: string;
};
