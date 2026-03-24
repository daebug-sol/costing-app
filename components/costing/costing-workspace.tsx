"use client";

import {
  DndContext,
  type DragEndEvent,
  type DragStartEvent,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  defaultDropAnimation,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  ChevronDown,
  ChevronRight,
  FolderKanban,
  ListFilter,
  Loader2,
  Lock,
  Pencil,
  Plus,
  Search,
  Trash2,
} from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type Dispatch,
  type SetStateAction,
} from "react";
import { EmptyState } from "@/components/empty-state";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { groupByMonthAndDay } from "@/lib/group-by-month-day";
import { formatIDR, formatNumber } from "@/lib/utils/format";
import { cn } from "@/lib/utils";
import { ManualWorkspace } from "@/components/costing/ManualWorkspace";
import {
  useCostingStore,
  type CostingSectionWithLines,
  type CostingSegmentDetail,
} from "@/store/costingStore";
import {
  EMPTY_BOOL_MAP,
  mergeOpenSegmentsForProject,
  useUiWorkflowStore,
} from "@/store/uiWorkflowStore";

const CATEGORY_ORDER = [
  "Frame & Panel",
  "Structure",
  "Skid",
  "Coil",
  "Damper",
  "Fan & Motor",
] as const;

function categoryTitle(cat: string): string {
  if (cat === "Structure") return "AHU Structure";
  if (cat === "Skid") return "AHU Skid";
  return cat;
}

function sortSections(sections: CostingSectionWithLines[]): CostingSectionWithLines[] {
  const idx = (cat: string) => {
    const i = CATEGORY_ORDER.indexOf(cat as (typeof CATEGORY_ORDER)[number]);
    return i === -1 ? 999 : i;
  };
  return [...sections].sort(
    (a, b) => idx(a.category) - idx(b.category) || a.sortOrder - b.sortOrder
  );
}

function catKey(segmentId: string, category: string) {
  return `${segmentId}:${category}`;
}

function SortableCostingSegment({
  id,
  children,
}: {
  id: string;
  children: (args: {
    setNodeRef: (node: HTMLElement | null) => void;
    style: React.CSSProperties;
    dragProps: React.HTMLAttributes<HTMLDivElement>;
  }) => React.ReactNode;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });
  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition: isDragging ? transition : undefined,
    opacity: isDragging ? 0.3 : 1,
  };
  const dragProps: React.HTMLAttributes<HTMLDivElement> = {
    ...attributes,
    ...listeners,
    className:
      "cursor-grab touch-none select-none active:cursor-grabbing rounded-md px-1 py-0.5 -mx-1 -my-0.5",
    title: "Tahan lalu seret untuk mengurutkan assembly",
  };
  return <>{children({ setNodeRef, style, dragProps })}</>;
}

function finite(n: number, fallback = 0) {
  return Number.isFinite(n) ? n : fallback;
}

function computeCostSummary(
  hppIn: number,
  qtyIn: number,
  m: {
    overhead: number;
    contingency: number;
    eskalasi: number;
    asuransi: number;
    mobilisasi: number;
    margin: number;
  },
  t: { esk: boolean; asu: boolean; mob: boolean }
) {
  const hpp = finite(hppIn, 0);
  const oh = hpp * (finite(m.overhead, 0) / 100);
  const cont = hpp * (finite(m.contingency, 0) / 100);
  const esk = t.esk ? hpp * (finite(m.eskalasi, 0) / 100) : 0;
  const asu = t.asu ? hpp * (finite(m.asuransi, 0) / 100) : 0;
  const mob = t.mob ? hpp * (finite(m.mobilisasi, 0) / 100) : 0;
  const totalCost = hpp + oh + cont + esk + asu + mob;
  const marginAmt = totalCost * (finite(m.margin, 0) / 100);
  const selling = totalCost + marginAmt;
  const q = Math.max(1, Math.floor(finite(qtyIn, 1)));
  const perUnit = selling / q;
  return { hpp, oh, cont, esk, asu, mob, totalCost, marginAmt, selling, perUnit };
}

const PROFILE_OPTIONS = [
  { label: "DS15", value: "1540T-NA06" },
  { label: "DS25", value: "2540Y-NA06" },
  { label: "DS50", value: "5060Y-NA06" },
] as const;

type AhuEditorProps = {
  segment: CostingSegmentDetail;
  patchSegment: (
    segmentId: string,
    patch: Record<string, string | number | null>
  ) => void;
  recalculateSegment: (segmentId: string) => Promise<void>;
  isCalculating: boolean;
  openAddItem: (sectionId: string) => void;
  toggleCat: (segmentId: string, cat: string) => void;
  openCats: Record<string, boolean>;
  unlockDraft: Record<string, boolean>;
  setUnlockDraft: Dispatch<SetStateAction<Record<string, boolean>>>;
  qtyDraft: Record<string, string>;
  setQtyDraft: Dispatch<SetStateAction<Record<string, string>>>;
  overrideItem: (itemId: string, qty: number) => Promise<void>;
  resetItem: (itemId: string) => Promise<void>;
  showToast: (m: string) => void;
};

function AhuSegmentEditor({
  segment: seg,
  patchSegment,
  recalculateSegment,
  isCalculating,
  openAddItem,
  toggleCat,
  openCats,
  unlockDraft,
  setUnlockDraft,
  qtyDraft,
  setQtyDraft,
  overrideItem,
  resetItem,
  showToast,
}: AhuEditorProps) {
  const sortedSections = useMemo(
    () => sortSections(seg.sections ?? []),
    [seg.sections]
  );

  return (
    <>
      <Card className="border-border">
        <CardContent className="space-y-4 p-4">
          <h3 className="text-sm font-semibold text-foreground">
            Parameter AHU
          </h3>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            <div className="space-y-1">
              <Label className="text-xs">AHU model</Label>
              <Input
                defaultValue={seg.ahuModel ?? ""}
                key={`am-${seg.id}-${seg.ahuModel}`}
                onBlur={(e) =>
                  patchSegment(seg.id, { ahuModel: e.target.value || null })
                }
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">AHU ref</Label>
              <Input
                defaultValue={seg.ahuRef ?? ""}
                key={`ar-${seg.id}-${seg.ahuRef}`}
                onBlur={(e) =>
                  patchSegment(seg.id, { ahuRef: e.target.value || null })
                }
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Flow CMH</Label>
              <Input
                type="number"
                defaultValue={seg.flowCMH ?? ""}
                key={`fl-${seg.id}-${seg.flowCMH}`}
                onBlur={(e) =>
                  patchSegment(seg.id, {
                    flowCMH:
                      e.target.value === "" ? null : Number(e.target.value),
                  })
                }
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Qty (fan dsb.)</Label>
              <Input
                type="number"
                defaultValue={seg.qty}
                key={`qt-${seg.id}-${seg.qty}`}
                onBlur={(e) =>
                  patchSegment(seg.id, {
                    qty: Math.max(1, Math.floor(Number(e.target.value) || 1)),
                  })
                }
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Profile type</Label>
              <Select
                value={seg.profileType || PROFILE_OPTIONS[0].value}
                onValueChange={(v) => patchSegment(seg.id, { profileType: v })}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {seg.profileType &&
                    !PROFILE_OPTIONS.some((o) => o.value === seg.profileType) && (
                      <SelectItem value={seg.profileType}>
                        {seg.profileType}
                      </SelectItem>
                    )}
                  {PROFILE_OPTIONS.map((o) => (
                    <SelectItem key={o.value} value={o.value}>
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex flex-wrap items-end gap-3">
            <div className="space-y-1">
              <Label className="text-xs">H mm</Label>
              <Input
                type="number"
                className="w-28"
                defaultValue={seg.dimH ?? ""}
                key={`h-${seg.id}-${seg.dimH}`}
                onBlur={(e) =>
                  patchSegment(seg.id, {
                    dimH: e.target.value === "" ? null : Number(e.target.value),
                  })
                }
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">W mm</Label>
              <Input
                type="number"
                className="w-28"
                defaultValue={seg.dimW ?? ""}
                key={`w-${seg.id}-${seg.dimW}`}
                onBlur={(e) =>
                  patchSegment(seg.id, {
                    dimW: e.target.value === "" ? null : Number(e.target.value),
                  })
                }
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">D mm</Label>
              <Input
                type="number"
                className="w-28"
                defaultValue={seg.dimD ?? ""}
                key={`d-${seg.id}-${seg.dimD}`}
                onBlur={(e) =>
                  patchSegment(seg.id, {
                    dimD: e.target.value === "" ? null : Number(e.target.value),
                  })
                }
              />
            </div>
            <Button
              type="button"
              className="gap-2"
              disabled={isCalculating}
              onClick={() =>
                recalculateSegment(seg.id).catch((e) => showToast(String(e)))
              }
            >
              {isCalculating ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <span aria-hidden>🔄</span>
              )}
              Recalculate
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="space-y-2">
        <h3 className="text-sm font-semibold text-foreground">Cost breakdown</h3>
        {sortedSections.map((sec) => {
          const open = openCats[catKey(seg.id, sec.category)] ?? true;
          return (
            <Card
              key={sec.id}
              className="overflow-hidden border-border"
            >
              <button
                type="button"
                onClick={() => toggleCat(seg.id, sec.category)}
                className="bg-muted/50 flex w-full items-center justify-between gap-3 border-b border-border px-4 py-3 text-left"
              >
                <span className="font-medium text-foreground">
                  {categoryTitle(sec.category)}
                </span>
                <span className="flex items-center gap-3">
                  <span className="tabular-money text-sm font-semibold text-foreground">
                    {formatIDR(sec.subtotal)}
                  </span>
                  {open ? (
                    <ChevronDown className="size-4 text-muted-foreground" />
                  ) : (
                    <ChevronRight className="size-4 text-muted-foreground" />
                  )}
                </span>
              </button>
              {open && (
                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow className="hover:bg-transparent">
                        <TableHead className="w-10" />
                        <TableHead>Description</TableHead>
                        <TableHead className="w-16">UOM</TableHead>
                        <TableHead className="w-28 text-right">Qty</TableHead>
                        <TableHead className="text-right">
                          Unit price (IDR)
                        </TableHead>
                        <TableHead className="text-right">Total (IDR)</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {sec.lineItems.map((row) => {
                        const overridden = row.isOverride;
                        const unlocking = unlockDraft[row.id];
                        const editable = overridden || unlocking;
                        const qtyStr = qtyDraft[row.id] ?? String(row.qty);

                        return (
                          <TableRow
                            key={row.id}
                            className={cn(
                              overridden ? "bg-amber-50/90" : "bg-card"
                            )}
                          >
                            <TableCell className="align-middle">
                              {!overridden && !unlocking ? (
                                <button
                                  type="button"
                                  className="p-1 text-muted-foreground hover:text-foreground"
                                  title="Override quantity"
                                  onClick={() => {
                                    setUnlockDraft((u) => ({
                                      ...u,
                                      [row.id]: true,
                                    }));
                                    setQtyDraft((q) => ({
                                      ...q,
                                      [row.id]: String(row.qty),
                                    }));
                                  }}
                                >
                                  <Lock className="size-4" />
                                </button>
                              ) : (
                                <button
                                  type="button"
                                  className="p-1 text-amber-700 hover:text-amber-900"
                                  title="Reset to auto"
                                  onClick={() => {
                                    setUnlockDraft((u) => {
                                      const n = { ...u };
                                      delete n[row.id];
                                      return n;
                                    });
                                    setQtyDraft((q) => {
                                      const n = { ...q };
                                      delete n[row.id];
                                      return n;
                                    });
                                    resetItem(row.id).catch((e) =>
                                      showToast(String(e))
                                    );
                                  }}
                                >
                                  <Pencil className="size-4" />
                                </button>
                              )}
                            </TableCell>
                            <TableCell className="max-w-[220px] whitespace-normal text-sm">
                              {row.description}
                            </TableCell>
                            <TableCell className="text-sm">{row.uom}</TableCell>
                            <TableCell className="text-right">
                              {editable ? (
                                <Input
                                  className="tabular-money ml-auto h-8 w-24 text-right"
                                  value={qtyStr}
                                  onChange={(e) =>
                                    setQtyDraft((q) => ({
                                      ...q,
                                      [row.id]: e.target.value,
                                    }))
                                  }
                                  onKeyDown={(e) => {
                                    if (e.key === "Enter") {
                                      e.currentTarget.blur();
                                    }
                                  }}
                                  onBlur={(e) => {
                                    const v = Number(e.currentTarget.value);
                                    if (!Number.isFinite(v)) return;
                                    overrideItem(row.id, v).catch((err) =>
                                      showToast(String(err))
                                    );
                                    setUnlockDraft((u) => {
                                      const n = { ...u };
                                      delete n[row.id];
                                      return n;
                                    });
                                  }}
                                />
                              ) : (
                                <span className="tabular-money">
                                  {formatNumber(row.qty, 4)}
                                </span>
                              )}
                            </TableCell>
                            <TableCell className="tabular-money text-right text-sm">
                              {formatIDR(row.unitPrice)}
                            </TableCell>
                            <TableCell className="tabular-money text-right text-sm font-medium">
                              {formatIDR(row.subtotal)}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                  <div className="border-t border-border px-4 py-2">
                    <button
                      type="button"
                      className="text-primary text-sm font-medium hover:underline"
                      onClick={() => openAddItem(sec.id)}
                    >
                      + Add Item
                    </button>
                  </div>
                </CardContent>
              )}
            </Card>
          );
        })}
      </div>
    </>
  );
}

export function CostingWorkspace() {
  const searchParams = useSearchParams();
  const projectFromUrl = searchParams.get("project");

  const {
    projects,
    currentProject,
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
    updateMargins,
  } = useCostingStore();

  const search = useUiWorkflowStore((s) => s.costing.sidebar.search);
  const statusFilter = useUiWorkflowStore((s) => s.costing.sidebar.statusFilter);
  const monthFilter = useUiWorkflowStore((s) => s.costing.sidebar.monthFilter);
  const dateFilter = useUiWorkflowStore((s) => s.costing.sidebar.dateFilter);
  const setCostingSidebar = useUiWorkflowStore((s) => s.setCostingSidebar);
  const setCostingOpenSegments = useUiWorkflowStore(
    (s) => s.setCostingOpenSegments
  );
  const patchCostingOpenSegment = useUiWorkflowStore(
    (s) => s.patchCostingOpenSegment
  );
  const patchCostingOpenCat = useUiWorkflowStore((s) => s.patchCostingOpenCat);
  const setCostingOpenCats = useUiWorkflowStore((s) => s.setCostingOpenCats);
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

  const [toast, setToast] = useState<string | null>(null);
  const showToast = (m: string) => {
    setToast(m);
    setTimeout(() => setToast(null), 3500);
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
      if (!currentProject?.id) return;
      if (scrollSaveTimer.current) clearTimeout(scrollSaveTimer.current);
      scrollSaveTimer.current = setTimeout(() => {
        setCostingMainScroll(currentProject.id, e.currentTarget.scrollTop);
      }, 120);
    },
    [currentProject?.id, setCostingMainScroll]
  );

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
    patch: Record<string, string | number | null>
  ) => {
    updateSegment(segmentId, patch).catch((e) => showToast(String(e)));
  };

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
      await loadProjects();
      setAddOpen(false);
    } catch (e) {
      showToast(e instanceof Error ? e.message : "Failed");
    }
  };

  const toggleCat = (segmentId: string, cat: string) => {
    const k = catKey(segmentId, cat);
    if (!currentProject?.id) return;
    const cur = openCats[k] ?? true;
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
      return <Badge className="bg-emerald-600">Finalized</Badge>;
    if (v === "draft") return <Badge variant="secondary">Draft</Badge>;
    return <Badge variant="outline">{s}</Badge>;
  };

  return (
    <div className="bg-muted/40 flex h-[calc(100vh-3.5rem)] flex-col overflow-hidden border-t border-border">
      {toast && (
        <div className="bg-card border-border fixed bottom-4 left-1/2 z-50 -translate-x-1/2 rounded-lg border px-4 py-2 text-sm">
          {toast}
        </div>
      )}

      <div className="min-h-0 flex-1 overflow-hidden p-3 lg:p-4">
        <div className="grid h-full min-h-0 grid-cols-1 gap-3 lg:grid-cols-[minmax(0,40%)_minmax(0,60%)]">
      {/* Left */}
      <aside className="bg-card flex min-h-0 min-w-0 flex-col overflow-hidden rounded-xl border border-border">
        <div className="border-border shrink-0 border-b p-3">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-sm font-semibold text-foreground">
              Costing Projects
            </h2>
            <Button
              type="button"
              size="sm"
              className="h-8 gap-1"
              onClick={() => setNewOpen(true)}
            >
              <Plus className="size-3.5" />
              Create New
            </Button>
          </div>
          <div className="relative mt-2">
            <Search className="text-muted-foreground absolute left-2 top-1/2 size-3.5 -translate-y-1/2" />
            <Input
              placeholder="Cari nama / model / ID…"
              value={search}
              onChange={(e) =>
                setCostingSidebar({ search: e.target.value })
              }
              className="h-8 pl-8 pr-10 text-sm"
            />
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="text-muted-foreground absolute right-0.5 top-1/2 size-7 -translate-y-1/2"
                  aria-label="Filter proyek"
                >
                  <ListFilter className="size-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-72 p-3" align="end">
                <div className="space-y-3">
                  <div className="space-y-1">
                    <Label className="text-xs">Status</Label>
                    <Select
                      value={statusFilter}
                      onValueChange={(v) =>
                        setCostingSidebar({
                          statusFilter: v as "all" | "draft" | "finalized",
                        })
                      }
                    >
                      <SelectTrigger className="h-8 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Semua</SelectItem>
                        <SelectItem value="draft">Draft</SelectItem>
                        <SelectItem value="finalized">Finalized</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Bulan (update)</Label>
                    <Select
                      value={monthFilter || "all"}
                      onValueChange={(v) =>
                        setCostingSidebar({
                          monthFilter: v === "all" ? "" : v,
                        })
                      }
                    >
                      <SelectTrigger className="h-8 text-xs">
                        <SelectValue placeholder="Semua" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Semua bulan</SelectItem>
                        {availableMonths.map((m) => (
                          <SelectItem key={m.value} value={m.value}>
                            {m.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Tanggal (update)</Label>
                    <Input
                      type="date"
                      className="h-8 text-xs"
                      value={dateFilter}
                      onChange={(e) =>
                        setCostingSidebar({ dateFilter: e.target.value })
                      }
                    />
                  </div>
                </div>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto p-2">
          {isLoading && projects.length === 0 ? (
            <div className="space-y-2">
              {Array.from({ length: 6 }).map((_, i) => (
                <div
                  key={i}
                  className="bg-card rounded-lg border border-border p-3"
                >
                  <Skeleton className="mb-2 h-4 w-[85%]" />
                  <Skeleton className="h-3 w-[55%]" />
                  <Skeleton className="mt-3 h-5 w-14 rounded-full" />
                </div>
              ))}
            </div>
          ) : projects.length === 0 ? (
            <EmptyState
              icon={FolderKanban}
              title="Belum ada proyek"
              description='Klik tombol "Create New" di atas untuk membuat proyek costing.'
              className="py-8"
            />
          ) : filteredProjects.length === 0 ? (
            <p className="p-4 text-center text-xs text-muted-foreground">
              Tidak ada proyek yang cocok dengan filter.
            </p>
          ) : (
            <div className="space-y-4">
              {projectGroups.map((month) => (
                <div key={month.monthKey}>
                  <p className="text-muted-foreground mb-2 border-b border-border pb-1 text-[10px] font-semibold uppercase tracking-wide">
                    {month.monthLabel}
                  </p>
                  {month.days.map((day) => (
                    <div key={day.dayKey} className="mb-3">
                      <p className="mb-1.5 text-[10px] font-medium text-muted-foreground">
                        {day.dayLabel}
                      </p>
                      <div className="space-y-2">
                        {day.items.map((p) => {
                          const active = currentProject?.id === p.id;
                          return (
                            <button
                              key={p.id}
                              type="button"
                              onClick={() =>
                                loadProject(p.id).catch((e) =>
                                  showToast(String(e))
                                )
                              }
                              className={cn(
                                "w-full rounded-lg border p-2.5 text-left text-sm transition-shadow",
                                active
                                  ? "border-primary bg-primary/8 border-l-4 "
                                  : "bg-card border-border hover:bg-muted/40"
                              )}
                            >
                              <div className="flex flex-wrap items-center gap-2">
                                <span className="font-medium text-foreground">
                                  {p.name}
                                </span>
                                <Badge variant="outline" className="text-[10px]">
                                  {p.segmentCount} assembly
                                </Badge>
                              </div>
                              <div className="mt-0.5 text-[11px] text-muted-foreground">
                                {p.previewAhuModel ?? "—"} · Flow{" "}
                                {p.previewFlowCMH != null
                                  ? formatNumber(p.previewFlowCMH, 0)
                                  : "—"}{" "}
                                CMH
                              </div>
                              <div className="mt-1.5">{statusBadge(p.status)}</div>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          )}
        </div>
      </aside>

      {/* Right */}
      <main
        ref={mainScrollRef}
        onScroll={currentProject ? onMainScroll : undefined}
        className="bg-card min-h-0 min-w-0 overflow-y-auto rounded-xl border border-border p-4 lg:p-6"
      >
        {!currentProject ? (
          <EmptyState
            icon={FolderKanban}
            title="Pilih atau buat proyek"
            description='Pilih proyek di daftar kiri, atau buat baru dengan tombol "Create New" di pojok atas daftar.'
            className="h-[min(480px,calc(100vh-8rem))]"
          />
        ) : (
          <div className="mx-auto max-w-6xl space-y-4">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <h2 className="text-lg font-semibold text-foreground">
                  {currentProject.name}
                </h2>
                <Label className="mt-2 text-xs text-muted-foreground">
                  Qty penawaran (per unit selling)
                </Label>
                <Input
                  className="mt-1 h-8 w-28 text-sm"
                  type="number"
                  defaultValue={currentProject.qty}
                  key={`pq-${currentProject.id}-${currentProject.qty}`}
                  onBlur={(e) =>
                    updateProject({
                      qty: Math.max(1, Math.floor(Number(e.target.value) || 1)),
                    }).catch((err) => showToast(String(err)))
                  }
                />
              </div>
              <div className="flex flex-wrap items-center justify-end gap-2">
                {segments.length > 0 ? (
                  <>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="h-8"
                      onClick={() => collapseAllHierarchy()}
                    >
                      Ciutkan semua
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="h-8"
                      onClick={() => expandAllHierarchy()}
                    >
                      Buka semua
                    </Button>
                  </>
                ) : null}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button size="sm" variant="outline" className="gap-1">
                      <Plus className="size-4" />
                      Assembly
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem
                      onClick={() =>
                        addSegment("ahu").catch((e) => showToast(String(e)))
                      }
                    >
                      + AHU costing
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() =>
                        addSegment("manual").catch((e) => showToast(String(e)))
                      }
                    >
                      + Manual costing
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>

            {segments.length === 0 ? (
              <EmptyState
                icon={FolderKanban}
                title="Belum ada assembly"
                description="Tambahkan assembly AHU atau manual. Satu penawaran bisa berisi banyak item (banyak assembly)."
                className="bg-card border border-dashed border-border py-12"
              />
            ) : null}

            <DndContext
              sensors={segmentSensors}
              collisionDetection={closestCenter}
              onDragStart={onSegmentDragStart}
              onDragEnd={onSegmentDragEnd}
              onDragCancel={onSegmentDragCancel}
            >
              <SortableContext
                items={segments.map((s) => s.id)}
                strategy={verticalListSortingStrategy}
              >
                <Table className="border-border rounded-lg border">
                  {segments.map((seg, segIndex) => {
                    const segOpen = openSegments[seg.id] ?? true;
                    return (
                      <SortableCostingSegment key={seg.id} id={seg.id}>
                        {({ setNodeRef, style, dragProps }) => (
                          <tbody
                            ref={setNodeRef}
                            style={style}
                            className={cn(
                              "[&_tr:last-child]:border-0",
                              segIndex > 0 && "border-t border-border"
                            )}
                          >
                            <TableRow className="bg-muted/10 hover:bg-muted/20 border-0">
                              <TableCell
                                colSpan={4}
                                className="max-w-0 p-0 align-middle"
                              >
                                <div className="flex min-w-0 items-center gap-2 px-3 py-2">
                                  <button
                                    type="button"
                                    onPointerDown={(e) => e.stopPropagation()}
                                    onClick={() => {
                                      if (!currentProject?.id) return;
                                      patchCostingOpenSegment(
                                        currentProject.id,
                                        seg.id,
                                        !(openSegments[seg.id] ?? true)
                                      );
                                    }}
                                    className="text-muted-foreground hover:text-foreground flex size-8 shrink-0 items-center justify-center rounded-md border border-border bg-muted/50 transition-colors"
                                    aria-expanded={segOpen}
                                    aria-label={
                                      segOpen ? "Ciutkan assembly" : "Buka assembly"
                                    }
                                  >
                                    {segOpen ? (
                                      <ChevronDown className="size-4" />
                                    ) : (
                                      <ChevronRight className="size-4" />
                                    )}
                                  </button>
                                  <div
                                    {...dragProps}
                                    className={cn(
                                      "flex shrink-0 items-center gap-2",
                                      dragProps.className
                                    )}
                                  >
                                    <Badge
                                      className={
                                        seg.type === "manual"
                                          ? "bg-violet-600 text-[10px] hover:bg-violet-600"
                                          : "bg-primary text-primary-foreground text-[10px] hover:bg-primary/90"
                                      }
                                    >
                                      {seg.type === "manual" ? "Manual" : "AHU"}
                                    </Badge>
                                  </div>
                                  <div className="w-[5.5rem] shrink-0 sm:w-28 md:w-32">
                                    <Input
                                      className="h-8 w-full min-w-0 truncate text-xs font-medium sm:text-sm"
                                      defaultValue={seg.title}
                                      key={`t-${seg.id}-${seg.title}`}
                                      title={seg.title}
                                      onPointerDown={(e) => e.stopPropagation()}
                                      onBlur={(e) =>
                                        patchSegment(seg.id, {
                                          title:
                                            e.target.value.trim() || seg.title,
                                        })
                                      }
                                    />
                                  </div>
                                  <span
                                    className="tabular-money text-muted-foreground min-w-0 flex-1 truncate text-right text-[11px] sm:text-xs"
                                    title={`Subtotal HPP: ${formatIDR(seg.subtotal)}`}
                                  >
                                    Subtotal HPP: {formatIDR(seg.subtotal)}
                                  </span>
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    className="text-muted-foreground hover:text-destructive size-8 shrink-0"
                                    title="Hapus assembly"
                                    onPointerDown={(e) => e.stopPropagation()}
                                    onClick={() => {
                                      if (
                                        window.confirm(
                                          "Hapus assembly ini beserta isinya?"
                                        )
                                      )
                                        deleteSegment(seg.id).catch((e) =>
                                          showToast(String(e))
                                        );
                                    }}
                                  >
                                    <Trash2 className="size-4" />
                                  </Button>
                                </div>
                              </TableCell>
                            </TableRow>
                            {segOpen ? (
                              <TableRow className="border-0 hover:bg-transparent">
                                <TableCell
                                  colSpan={4}
                                  className="border-border/80 bg-card p-0"
                                >
                                  <div className="border-border/60 border-t px-3 pb-3 pt-1">
                                    {seg.type === "manual" ? (
                                      <ManualWorkspace
                                        segmentId={seg.id}
                                        embedded
                                        collapseAllManualSignal={
                                          collapseManualTick
                                        }
                                        expandAllManualSignal={
                                          expandManualTick
                                        }
                                      />
                                    ) : (
                                      <AhuSegmentEditor
                                        segment={seg}
                                        patchSegment={patchSegment}
                                        recalculateSegment={recalculateSegment}
                                        isCalculating={isCalculating}
                                        openAddItem={openAddItem}
                                        toggleCat={toggleCat}
                                        openCats={openCats}
                                        unlockDraft={unlockDraft}
                                        setUnlockDraft={setUnlockDraft}
                                        qtyDraft={qtyDraft}
                                        setQtyDraft={setQtyDraft}
                                        overrideItem={overrideItem}
                                        resetItem={resetItem}
                                        showToast={showToast}
                                      />
                                    )}
                                  </div>
                                </TableCell>
                              </TableRow>
                            ) : null}
                          </tbody>
                        )}
                      </SortableCostingSegment>
                    );
                  })}
                </Table>
              </SortableContext>
              <DragOverlay dropAnimation={defaultDropAnimation}>
                {activeSegmentDragId ? (
                  <div className="bg-card flex max-w-md flex-wrap items-center gap-2 rounded-lg border border-primary/35 px-4 py-3 shadow-lg">
                    {(() => {
                      const s = segments.find(
                        (x) => x.id === activeSegmentDragId
                      );
                      if (!s) return null;
                      return (
                        <>
                          <Badge
                            className={
                              s.type === "manual"
                                ? "bg-violet-600 text-[10px]"
                                : "bg-primary text-primary-foreground text-[10px]"
                            }
                          >
                            {s.type === "manual" ? "Manual" : "AHU"}
                          </Badge>
                          <span className="min-w-0 flex-1 truncate font-medium">
                            {s.title}
                          </span>
                          <span className="text-muted-foreground tabular-money text-xs">
                            {formatIDR(s.subtotal)}
                          </span>
                        </>
                      );
                    })()}
                  </div>
                ) : null}
              </DragOverlay>
            </DndContext>

            {/* C — Summary */}
            <Card className="border-border">
              <CardContent className="space-y-4 p-4">
                <h3 className="text-sm font-semibold text-foreground">
                  Cost summary
                </h3>
                <Table>
                  <TableBody>
                    <TableRow>
                      <TableCell>Total material cost (HPP)</TableCell>
                      <TableCell className="tabular-money text-right">
                        {formatIDR(totals.hpp)}
                      </TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell>
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="min-w-[5rem]">Overhead</span>
                          <Input
                            className="h-8 w-16 text-right"
                            type="number"
                            value={marginPct.overhead}
                            onChange={(e) => {
                              const v = Number(e.target.value);
                              if (Number.isFinite(v))
                                setMarginPct((p) => ({ ...p, overhead: v }));
                            }}
                            onBlur={() => void persistMargins()}
                          />
                          <span className="text-muted-foreground text-xs">%</span>
                        </div>
                      </TableCell>
                      <TableCell className="tabular-money text-right">
                        {formatIDR(totals.oh)}
                      </TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell>
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="min-w-[5rem]">Contingency</span>
                          <Input
                            className="h-8 w-16 text-right"
                            type="number"
                            value={marginPct.contingency}
                            onChange={(e) => {
                              const v = Number(e.target.value);
                              if (Number.isFinite(v))
                                setMarginPct((p) => ({ ...p, contingency: v }));
                            }}
                            onBlur={() => void persistMargins()}
                          />
                          <span className="text-muted-foreground text-xs">%</span>
                        </div>
                      </TableCell>
                      <TableCell className="tabular-money text-right">
                        {formatIDR(totals.cont)}
                      </TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell>
                        <div className="flex flex-wrap items-center gap-2">
                          <Switch
                            checked={useEsk}
                            onCheckedChange={(v) => {
                              setUseEsk(v);
                              void persistToggles({
                                esk: v,
                                asu: useAsu,
                                mob: useMob,
                              });
                            }}
                            id="esk"
                          />
                          <Label htmlFor="esk">Eskalasi</Label>
                          <Input
                            className="h-8 w-16 text-right"
                            type="number"
                            value={marginPct.eskalasi}
                            onChange={(e) => {
                              const v = Number(e.target.value);
                              if (Number.isFinite(v))
                                setMarginPct((p) => ({ ...p, eskalasi: v }));
                            }}
                            onBlur={() => void persistMargins()}
                          />
                          <span className="text-muted-foreground text-xs">%</span>
                        </div>
                      </TableCell>
                      <TableCell className="tabular-money text-right">
                        {useEsk ? formatIDR(totals.esk) : formatIDR(0)}
                      </TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell>
                        <div className="flex flex-wrap items-center gap-2">
                          <Switch
                            checked={useAsu}
                            onCheckedChange={(v) => {
                              setUseAsu(v);
                              void persistToggles({
                                esk: useEsk,
                                asu: v,
                                mob: useMob,
                              });
                            }}
                            id="asu"
                          />
                          <Label htmlFor="asu">Asuransi</Label>
                          <Input
                            className="h-8 w-16 text-right"
                            type="number"
                            value={marginPct.asuransi}
                            onChange={(e) => {
                              const v = Number(e.target.value);
                              if (Number.isFinite(v))
                                setMarginPct((p) => ({ ...p, asuransi: v }));
                            }}
                            onBlur={() => void persistMargins()}
                          />
                          <span className="text-muted-foreground text-xs">%</span>
                        </div>
                      </TableCell>
                      <TableCell className="tabular-money text-right">
                        {useAsu ? formatIDR(totals.asu) : formatIDR(0)}
                      </TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell>
                        <div className="flex flex-wrap items-center gap-2">
                          <Switch
                            checked={useMob}
                            onCheckedChange={(v) => {
                              setUseMob(v);
                              void persistToggles({
                                esk: useEsk,
                                asu: useAsu,
                                mob: v,
                              });
                            }}
                            id="mob"
                          />
                          <Label htmlFor="mob">Mobilisasi</Label>
                          <Input
                            className="h-8 w-16 text-right"
                            type="number"
                            value={marginPct.mobilisasi}
                            onChange={(e) => {
                              const v = Number(e.target.value);
                              if (Number.isFinite(v))
                                setMarginPct((p) => ({ ...p, mobilisasi: v }));
                            }}
                            onBlur={() => void persistMargins()}
                          />
                          <span className="text-muted-foreground text-xs">%</span>
                        </div>
                      </TableCell>
                      <TableCell className="tabular-money text-right">
                        {useMob ? formatIDR(totals.mob) : formatIDR(0)}
                      </TableCell>
                    </TableRow>
                    <TableRow className="border-t-2 font-medium">
                      <TableCell>Total cost</TableCell>
                      <TableCell className="tabular-money text-right">
                        {formatIDR(totals.totalCost)}
                      </TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell>
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="min-w-[5rem]">Margin</span>
                          <Input
                            className="h-8 w-16 text-right"
                            type="number"
                            value={marginPct.margin}
                            onChange={(e) => {
                              const v = Number(e.target.value);
                              if (Number.isFinite(v))
                                setMarginPct((p) => ({ ...p, margin: v }));
                            }}
                            onBlur={() => void persistMargins()}
                          />
                          <span className="text-muted-foreground text-xs">%</span>
                        </div>
                      </TableCell>
                      <TableCell className="tabular-money text-right">
                        {formatIDR(totals.marginAmt)}
                      </TableCell>
                    </TableRow>
                    <TableRow className="bg-muted/50 border-t-2 text-base font-bold">
                      <TableCell>SELLING PRICE</TableCell>
                      <TableCell className="tabular-money text-right">
                        {formatIDR(totals.selling)}
                      </TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell>Per unit</TableCell>
                      <TableCell className="tabular-money text-right">
                        {formatIDR(totals.perUnit)}
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>

                <div className="flex flex-wrap gap-2 border-t border-border pt-4">
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() =>
                      updateProject({ status: "draft" }).catch((e) =>
                        showToast(String(e))
                      )
                    }
                  >
                    Save Draft
                  </Button>
                  <Button
                    type="button"
                    onClick={() =>
                      updateProject({ status: "finalized" }).catch((e) =>
                        showToast(String(e))
                      )
                    }
                  >
                    Finalize
                  </Button>
                  <Button type="button" variant="outline" asChild>
                    <Link href={`/documentation?fromProject=${currentProject.id}`}>
                      → Create Quotation
                    </Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </main>
        </div>
      </div>

      <Dialog open={newOpen} onOpenChange={setNewOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Buat Project Costing Baru</DialogTitle>
            <DialogDescription>
              Masukkan nama proyek. Anda bisa menambah assembly AHU atau manual
              setelah proyek dibuat.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="np-name">Nama Project</Label>
              <Input
                id="np-name"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="Contoh: AHU Line 1"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setNewOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              disabled={!newName.trim()}
              onClick={handleCreate}
            >
              Buat
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add line item</DialogTitle>
            <DialogDescription>
              Tambahkan baris manual pada section yang dipilih.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-3 py-2">
            <div className="space-y-1">
              <Label>Description</Label>
              <Input value={addDesc} onChange={(e) => setAddDesc(e.target.value)} />
            </div>
            <div className="grid grid-cols-3 gap-2">
              <div className="space-y-1">
                <Label>UOM</Label>
                <Input value={addUom} onChange={(e) => setAddUom(e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label>Qty</Label>
                <Input value={addQty} onChange={(e) => setAddQty(e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label>Unit price</Label>
                <Input
                  value={addPrice}
                  onChange={(e) => setAddPrice(e.target.value)}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setAddOpen(false)}
            >
              Cancel
            </Button>
            <Button type="button" onClick={submitAddItem}>
              Add
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
