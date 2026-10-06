"use client";

import { toastError } from "@/store/toastStore";
import { type DragEndEvent, type DragStartEvent, KeyboardSensor, PointerSensor, useSensor, useSensors } from "@dnd-kit/core";
import { arrayMove, sortableKeyboardCoordinates } from "@dnd-kit/sortable";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { Badge } from "@/components/ui/badge";
import type { AhuRecalcParams } from "@/lib/ahu-recalc-params";
import { computeCostSummary, finite } from "@/lib/cost-summary";
import { groupByMonthAndDay } from "@/lib/group-by-month-day";
import { useConfirm } from "@/components/confirm-dialog";
import { useCostingStore, type CostingSegmentDetail } from "@/store/costingStore";
import { EMPTY_BOOL_MAP, mergeOpenSegmentsForProject, useUiWorkflowStore } from "@/store/uiWorkflowStore";
import { catKey } from "./costing-workspace-shared";

export function useCostingWorkspace() {
  const [confirm, confirmDialog] = useConfirm();
  const router = useRouter();
  const searchParams = useSearchParams();
  const projectFromUrl = searchParams.get("project");

  const projects = useCostingStore((s) => s.projects);
  const currentProject = useCostingStore((s) => s.currentProject);
  const modules = useCostingStore((s) => s.modules);
  const isCalculating = useCostingStore((s) => s.isCalculating);
  const isLoading = useCostingStore((s) => s.isLoading);
  const loadProjects = useCostingStore((s) => s.loadProjects);
  const loadProject = useCostingStore((s) => s.loadProject);
  const createProject = useCostingStore((s) => s.createProject);
  const updateProject = useCostingStore((s) => s.updateProject);
  const updateSegment = useCostingStore((s) => s.updateSegment);
  const addSegment = useCostingStore((s) => s.addSegment);
  const deleteSegment = useCostingStore((s) => s.deleteSegment);
  const reorderSegments = useCostingStore((s) => s.reorderSegments);
  const recalculateSegment = useCostingStore((s) => s.recalculateSegment);
  const overrideItem = useCostingStore((s) => s.overrideItem);
  const resetItem = useCostingStore((s) => s.resetItem);
  const setSectionOverride = useCostingStore((s) => s.setSectionOverride);
  const resetSegmentMarkup = useCostingStore((s) => s.resetSegmentMarkup);
  const updateMargins = useCostingStore((s) => s.updateMargins);
  const ahuModuleEnabled = modules.ahu;

  const search = useUiWorkflowStore((s) => s.costing.sidebar.search);
  const statusFilter = useUiWorkflowStore((s) => s.costing.sidebar.statusFilter);
  const monthFilter = useUiWorkflowStore((s) => s.costing.sidebar.monthFilter);
  const dateFilter = useUiWorkflowStore((s) => s.costing.sidebar.dateFilter);
  const sidebarCollapsed = useUiWorkflowStore((s) => s.costing.sidebar.collapsed);
  const setCostingSidebar = useUiWorkflowStore((s) => s.setCostingSidebar);
  const setCostingOpenSegments = useUiWorkflowStore(
    (s) => s.setCostingOpenSegments
  );
  const patchCostingOpenSegment = useUiWorkflowStore(
    (s) => s.patchCostingOpenSegment
  );
  const patchCostingOpenCat = useUiWorkflowStore((s) => s.patchCostingOpenCat);
  const setCostingOpenCats = useUiWorkflowStore((s) => s.setCostingOpenCats);
  const projectSummaryOpenByProject = useUiWorkflowStore(
    (s) => s.costing.projectSummaryOpenByProject ?? EMPTY_BOOL_MAP
  );
  const patchCostingProjectSummaryOpen = useUiWorkflowStore(
    (s) => s.patchCostingProjectSummaryOpen
  );
  const setCostingMainScroll = useUiWorkflowStore((s) => s.setCostingMainScroll);

  const [newOpen, setNewOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const projectKey = currentProject?.id ?? "";
  const openCatsByProject = useUiWorkflowStore((s) => s.costing.openCatsByProject);
  const openSegmentsByProject = useUiWorkflowStore(
    (s) => s.costing.openSegmentsByProject
  );
  const openCats = openCatsByProject[projectKey] ?? EMPTY_BOOL_MAP;
  const openSegments = openSegmentsByProject[projectKey] ?? EMPTY_BOOL_MAP;
  const [collapseManualTick, setCollapseManualTick] = useState(0);
  const [expandManualTick, setExpandManualTick] = useState(0);
  const [unlockDraft, setUnlockDraft] = useState<Record<string, boolean>>({});
  const [qtyDraft, setQtyDraft] = useState<Record<string, string>>({});

  const [addOpen, setAddOpen] = useState(false);
  const [addSectionId, setAddSectionId] = useState<string | null>(null);
  const [addDesc, setAddDesc] = useState("");
  const [addUom, setAddUom] = useState("pcs");
  const [addQty, setAddQty] = useState("1");
  const [addPrice, setAddPrice] = useState("0");

  const showToast = (m: string) => toastError(m);

  /** Flat manual segment (default “Kelompok utama”). */
  const addManualItem = () => {
    addSegment("manual").catch((e) => showToast(String(e)));
  };

  /**
   * Manual segment + second named group so the new segment opens in
   * multi-group mode (same naming as ManualWorkspace “Tambah item grup”).
   */
  const addManualGroupItem = async () => {
    try {
      await addSegment("manual");
      const project = useCostingStore.getState().currentProject;
      if (!project) return;
      const newest = [...(project.segments ?? [])].sort(
        (a, b) => b.sortOrder - a.sortOrder
      )[0];
      if (!newest || newest.type !== "manual") return;
      const r = await fetch(
        `/api/projects/${project.id}/segments/${newest.id}/manual/groups`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: "Kelompok 2" }),
        }
      );
      if (!r.ok) {
        const j = (await r.json().catch(() => null)) as {
          error?: string;
        } | null;
        showToast(j?.error ?? "Gagal membuat item grup");
      }
    } catch (e) {
      showToast(String(e));
    }
  };

  const [useEsk, setUseEsk] = useState(true);
  const [useAsu, setUseAsu] = useState(true);
  const [useMob, setUseMob] = useState(true);

  const [marginPct, setMarginPct] = useState({
    overhead: 5,
    contingency: 3,
    eskalasi: 0,
    asuransi: 0,
    mobilisasi: 0,
    margin: 20,
  });

  const mainScrollRef = useRef<HTMLElement>(null);
  const scrollSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [activeSegmentDragId, setActiveSegmentDragId] = useState<string | null>(
    null
  );

  useLayoutEffect(() => {
    if (!currentProject?.id) return;
    const el = mainScrollRef.current;
    if (!el) return;
    const saved =
      useUiWorkflowStore.getState().costing.mainScrollByProject[currentProject.id];
    if (saved != null) el.scrollTop = saved;
  }, [currentProject?.id]);

  const onMainScroll = useCallback(
    (e: React.UIEvent<HTMLElement>) => {
      const projectId = currentProject?.id;
      const el = e.currentTarget;
      if (!projectId || !el) return;
      const scrollTop = el.scrollTop;
      if (scrollSaveTimer.current) clearTimeout(scrollSaveTimer.current);
      scrollSaveTimer.current = setTimeout(() => {
        const top = mainScrollRef.current?.scrollTop ?? scrollTop;
        setCostingMainScroll(projectId, top);
      }, 120);
    },
    [currentProject?.id, setCostingMainScroll]
  );

  useEffect(() => {
    return () => {
      if (scrollSaveTimer.current) clearTimeout(scrollSaveTimer.current);
    };
  }, []);

  useEffect(() => {
    loadProjects().catch((e) => showToast(String(e)));
  }, [loadProjects]);

  useEffect(() => {
    if (!projectFromUrl) return;
    loadProject(projectFromUrl).catch((e) => showToast(String(e)));
  }, [projectFromUrl, loadProject]);

  useEffect(() => {
    if (!currentProject) return;
    setUseEsk(finite(currentProject.eskalasi, 0) !== 0);
    setUseAsu(finite(currentProject.asuransi, 0) !== 0);
    setUseMob(finite(currentProject.mobilisasi, 0) !== 0);
    setMarginPct({
      overhead: finite(currentProject.overhead, 0),
      contingency: finite(currentProject.contingency, 0),
      eskalasi: finite(currentProject.eskalasi, 0),
      asuransi: finite(currentProject.asuransi, 0),
      mobilisasi: finite(currentProject.mobilisasi, 0),
      margin: finite(currentProject.margin, 0),
    });
  }, [currentProject?.id]);

  const availableMonths = useMemo(() => {
    const map = new Map<string, string>();
    for (const p of projects) {
      const d = new Date(p.updatedAt);
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
  }, [projects]);

  const filteredProjects = useMemo(() => {
    let rows = projects;
    const q = search.trim().toLowerCase();
    if (q) {
      rows = rows.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          (p.previewAhuModel?.toLowerCase().includes(q) ?? false) ||
          p.id.toLowerCase().includes(q) ||
          String(p.segmentCount).includes(q)
      );
    }
    if (statusFilter !== "all") {
      rows = rows.filter((p) => {
        const v = p.status.toLowerCase();
        if (statusFilter === "draft") return v === "draft";
        return v === "finalized" || v === "final";
      });
    }
    if (monthFilter) {
      rows = rows.filter((p) => {
        const d = new Date(p.updatedAt);
        const k = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
        return k === monthFilter;
      });
    }
    if (dateFilter) {
      rows = rows.filter(
        (p) => new Date(p.updatedAt).toISOString().slice(0, 10) === dateFilter
      );
    }
    return rows;
  }, [projects, search, statusFilter, monthFilter, dateFilter]);

  const projectGroups = useMemo(
    () => groupByMonthAndDay(filteredProjects, (p) => new Date(p.updatedAt)),
    [filteredProjects]
  );

  const totals = useMemo(() => {
    if (!currentProject) {
      return {
        hpp: 0,
        oh: 0,
        cont: 0,
        esk: 0,
        asu: 0,
        mob: 0,
        totalCost: 0,
        marginAmt: 0,
        sellingBeforeAdjustment: 0,
        adjPctAmt: 0,
        adjFlatAmt: 0,
        selling: 0,
        perUnit: 0,
      };
    }
    return computeCostSummary(
      finite(currentProject.totalHPP, 0),
      currentProject.qty,
      marginPct,
      { esk: useEsk, asu: useAsu, mob: useMob }
    );
  }, [currentProject, useEsk, useAsu, useMob, marginPct]);

  const marginPctRef = useRef(marginPct);
  marginPctRef.current = marginPct;
  const togglesRef = useRef({ esk: true, asu: true, mob: true });
  togglesRef.current = { esk: useEsk, asu: useAsu, mob: useMob };

  const persistMargins = useCallback(async () => {
    const cur = useCostingStore.getState().currentProject;
    if (!cur) return;
    const m = marginPctRef.current;
    const { selling } = computeCostSummary(
      finite(cur.totalHPP, 0),
      cur.qty,
      m,
      togglesRef.current
    );
    try {
      await updateMargins({
        overhead: m.overhead,
        contingency: m.contingency,
        eskalasi: m.eskalasi,
        asuransi: m.asuransi,
        mobilisasi: m.mobilisasi,
        margin: m.margin,
        // Project-level price adjustment UI removed; keep DB at 0.
        priceAdjustmentPct: 0,
        priceAdjustmentAmt: 0,
        totalSelling: selling,
      } as never);
    } catch (e) {
      showToast(e instanceof Error ? e.message : "Failed to save margins");
    }
  }, [updateMargins]);

  const persistToggles = async (toggles: {
    esk: boolean;
    asu: boolean;
    mob: boolean;
  }) => {
    const cur = useCostingStore.getState().currentProject;
    if (!cur) return;
    const m = marginPctRef.current;
    const { selling } = computeCostSummary(
      finite(cur.totalHPP, 0),
      cur.qty,
      m,
      toggles
    );
    try {
      await updateMargins({
        overhead: m.overhead,
        contingency: m.contingency,
        eskalasi: m.eskalasi,
        asuransi: m.asuransi,
        mobilisasi: m.mobilisasi,
        margin: m.margin,
        priceAdjustmentPct: 0,
        priceAdjustmentAmt: 0,
        totalSelling: selling,
      } as never);
    } catch (e) {
      showToast(e instanceof Error ? e.message : "Failed to save margins");
    }
  };

  const handleCreate = async () => {
    if (!newName.trim()) return;
    try {
      await createProject(newName.trim());
      setNewOpen(false);
      setNewName("");
    } catch (e) {
      showToast(e instanceof Error ? e.message : "Failed");
    }
  };

  const patchSegment = (
    segmentId: string,
    patch: Record<string, unknown>
  ) => {
    updateSegment(segmentId, patch).catch((e) => showToast(String(e)));
  };

  const saveAhuParams = useCallback(
    async (segmentId: string, params: AhuRecalcParams) => {
      await updateSegment(segmentId, { ahuRecalcParams: params });
    },
    [updateSegment]
  );

  const saveAhuParamsAndRecalculate = useCallback(
    async (segmentId: string, params: AhuRecalcParams) => {
      await updateSegment(segmentId, { ahuRecalcParams: params });
      await recalculateSegment(segmentId);
    },
    [updateSegment, recalculateSegment]
  );

  const openAddItem = (sectionId: string) => {
    setAddSectionId(sectionId);
    setAddDesc("");
    setAddUom("pcs");
    setAddQty("1");
    setAddPrice("0");
    setAddOpen(true);
  };

  const submitAddItem = async () => {
    if (!addSectionId || !addDesc.trim() || !currentProject) return;
    try {
      const r = await fetch(
        `/api/projects/${currentProject.id}/sections/${addSectionId}/line-items`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            description: addDesc.trim(),
            uom: addUom,
            qty: Number(addQty) || 0,
            unitPrice: Number(addPrice) || 0,
          }),
        }
      );
      if (!r.ok) {
        const j = (await r.json().catch(() => ({}))) as { error?: string };
        throw new Error(j.error || r.statusText);
      }
      await loadProject(currentProject.id);
      setAddOpen(false);
    } catch (e) {
      showToast(e instanceof Error ? e.message : "Failed");
    }
  };

  const toggleCat = (segmentId: string, cat: string) => {
    const k = catKey(segmentId, cat);
    if (!currentProject?.id) return;
    const cur = openCats[k] ?? false;
    patchCostingOpenCat(currentProject.id, k, !cur);
  };

  const segments = useMemo(
    () => (currentProject?.segments ?? []) as CostingSegmentDetail[],
    [currentProject?.segments]
  );

  useEffect(() => {
    if (!currentProject?.id) return;
    const stored =
      useUiWorkflowStore.getState().costing.openSegmentsByProject[
        currentProject.id
      ];
    const merged = mergeOpenSegmentsForProject(
      stored,
      segments.map((s) => s.id)
    );
    let changed = false;
    if (!stored) {
      changed = true;
    } else {
      const mergedKeys = Object.keys(merged);
      const storedKeys = Object.keys(stored);
      if (mergedKeys.length !== storedKeys.length) {
        changed = true;
      } else {
        for (const id of mergedKeys) {
          if (stored[id] !== merged[id]) {
            changed = true;
            break;
          }
        }
      }
    }
    if (changed) setCostingOpenSegments(currentProject.id, merged);
  }, [currentProject?.id, segments, setCostingOpenSegments]);

  const collapseAllHierarchy = useCallback(() => {
    if (!currentProject?.id) return;
    setCostingOpenSegments(
      currentProject.id,
      Object.fromEntries(segments.map((s) => [s.id, false]))
    );
    const catUpdates: Record<string, boolean> = {};
    for (const seg of segments) {
      if (seg.type === "manual") continue;
      for (const sec of seg.sections ?? []) {
        catUpdates[catKey(seg.id, sec.category)] = false;
      }
    }
    if (Object.keys(catUpdates).length > 0) {
      const prev =
        useUiWorkflowStore.getState().costing.openCatsByProject[
          currentProject.id
        ] ?? {};
      setCostingOpenCats(currentProject.id, { ...prev, ...catUpdates });
    }
    setCollapseManualTick((t) => t + 1);
  }, [segments, currentProject?.id, setCostingOpenCats, setCostingOpenSegments]);

  const expandAllHierarchy = useCallback(() => {
    if (!currentProject?.id) return;
    setCostingOpenSegments(
      currentProject.id,
      Object.fromEntries(segments.map((s) => [s.id, true]))
    );
    const catUpdates: Record<string, boolean> = {};
    for (const seg of segments) {
      if (seg.type === "manual") continue;
      for (const sec of seg.sections ?? []) {
        catUpdates[catKey(seg.id, sec.category)] = true;
      }
    }
    if (Object.keys(catUpdates).length > 0) {
      const prev =
        useUiWorkflowStore.getState().costing.openCatsByProject[
          currentProject.id
        ] ?? {};
      setCostingOpenCats(currentProject.id, { ...prev, ...catUpdates });
    }
    setExpandManualTick((t) => t + 1);
  }, [segments, currentProject?.id, setCostingOpenCats, setCostingOpenSegments]);

  const segmentSensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { delay: 220, tolerance: 8 },
    }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const onSegmentDragStart = (event: DragStartEvent) => {
    setActiveSegmentDragId(String(event.active.id));
  };

  const onSegmentDragEnd = (event: DragEndEvent) => {
    setActiveSegmentDragId(null);
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const ids = segments.map((s) => s.id);
    const oldIndex = ids.indexOf(String(active.id));
    const newIndex = ids.indexOf(String(over.id));
    if (oldIndex < 0 || newIndex < 0) return;
    const next = arrayMove(ids, oldIndex, newIndex);
    reorderSegments(next).catch((e) => showToast(String(e)));
  };

  const onSegmentDragCancel = () => {
    setActiveSegmentDragId(null);
  };

  const statusBadge = (s: string) => {
    const v = s.toLowerCase();
    if (v === "finalized" || v === "final")
      return <Badge>Final</Badge>;
    if (v === "draft") return <Badge variant="secondary">Draft</Badge>;
    return <Badge variant="outline">{s}</Badge>;
  };


  return {
    confirm,
    confirmDialog,
    router,
    searchParams,
    projectFromUrl,
    projects,
    currentProject,
    modules,
    isCalculating,
    isLoading,
    loadProjects,
    loadProject,
    createProject,
    updateProject,
    updateSegment,
    addSegment,
    deleteSegment,
    reorderSegments,
    recalculateSegment,
    overrideItem,
    resetItem,
    setSectionOverride,
    resetSegmentMarkup,
    updateMargins,
    ahuModuleEnabled,
    search,
    statusFilter,
    monthFilter,
    dateFilter,
    sidebarCollapsed,
    setCostingSidebar,
    setCostingOpenSegments,
    patchCostingOpenSegment,
    patchCostingOpenCat,
    setCostingOpenCats,
    projectSummaryOpenByProject,
    patchCostingProjectSummaryOpen,
    setCostingMainScroll,
    newOpen,
    setNewOpen,
    newName,
    setNewName,
    projectKey,
    openCatsByProject,
    openSegmentsByProject,
    openCats,
    openSegments,
    collapseManualTick,
    setCollapseManualTick,
    expandManualTick,
    setExpandManualTick,
    unlockDraft,
    setUnlockDraft,
    qtyDraft,
    setQtyDraft,
    addOpen,
    setAddOpen,
    addSectionId,
    setAddSectionId,
    addDesc,
    setAddDesc,
    addUom,
    setAddUom,
    addQty,
    setAddQty,
    addPrice,
    setAddPrice,
    showToast,
    addManualItem,
    addManualGroupItem,
    useEsk,
    setUseEsk,
    useAsu,
    setUseAsu,
    useMob,
    setUseMob,
    marginPct,
    setMarginPct,
    mainScrollRef,
    scrollSaveTimer,
    activeSegmentDragId,
    setActiveSegmentDragId,
    onMainScroll,
    availableMonths,
    filteredProjects,
    projectGroups,
    totals,
    marginPctRef,
    togglesRef,
    persistMargins,
    persistToggles,
    handleCreate,
    patchSegment,
    saveAhuParams,
    saveAhuParamsAndRecalculate,
    openAddItem,
    submitAddItem,
    toggleCat,
    segments,
    collapseAllHierarchy,
    expandAllHierarchy,
    segmentSensors,
    onSegmentDragStart,
    onSegmentDragEnd,
    onSegmentDragCancel,
    statusBadge,
  };
}

export type CostingWorkspaceState = ReturnType<typeof useCostingWorkspace>;
