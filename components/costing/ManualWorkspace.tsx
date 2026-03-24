"use client";

import {
  DndContext,
  type DragEndEvent,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
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
  GripVertical,
  Pencil,
  Plus,
  RotateCcw,
  Trash2,
} from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { EmptyState } from "@/components/empty-state";
import {
  ItemPickerModal,
  type PickerSelection,
} from "@/components/costing/ItemPickerModal";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { formatIDR } from "@/lib/utils/format";
import { cn } from "@/lib/utils";
import { useCostingStore } from "@/store/costingStore";

type ManualItem = {
  id: string;
  sourceType: string;
  sourceId: string;
  code: string;
  name: string;
  category: string;
  uom: string;
  qty: number;
  basePrice: number;
  overridePrice: number | null;
  effectivePrice: number;
  wasteFactor: number;
  subtotal: number;
  sortOrder: number;
};

type ManualGroup = {
  id: string;
  name: string;
  sortOrder: number;
  subtotal: number;
  items: ManualItem[];
};

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

function rowKey(sourceType: string, sourceId: string) {
  return `${sourceType}:${sourceId}`;
}

async function readErr(res: Response): Promise<string> {
  try {
    const j = (await res.json()) as { error?: string };
    if (j?.error) return j.error;
  } catch {
    /* ignore */
  }
  return res.statusText || "Request failed";
}

function SortableGroupWrap({
  id,
  children,
}: {
  id: string;
  children: React.ReactNode;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.85 : 1,
  };
  return (
    <div ref={setNodeRef} style={style} className="relative">
      <div className="absolute left-1 top-3 z-10" {...attributes} {...listeners}>
        <GripVertical className="size-4 cursor-grab text-muted-foreground active:cursor-grabbing" />
      </div>
      <div className="pl-7">{children}</div>
    </div>
  );
}

function SortableItemRow({
  id,
  children,
}: {
  id: string;
  children: (handle: React.ReactNode) => React.ReactNode;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.85 : 1,
  };
  const handle = (
    <span
      className="inline-flex cursor-grab text-muted-foreground active:cursor-grabbing"
      {...attributes}
      {...listeners}
    >
      <GripVertical className="size-4" />
    </span>
  );
  return (
    <tr
      ref={setNodeRef}
      style={style}
      className="border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted"
    >
      {children(handle)}
    </tr>
  );
}

type ManualWorkspaceProps = {
  segmentId: string;
  /** Sembunyikan ringkasan margin/selling proyek (dipakai di halaman multi-segmen). */
  embedded?: boolean;
  /** Naikkan nilai untuk menciutkan semua grup di segmen ini. */
  collapseAllManualSignal?: number;
  /** Naikkan nilai untuk membuka semua grup di segmen ini. */
  expandAllManualSignal?: number;
};

export function ManualWorkspace({
  segmentId,
  embedded = false,
  collapseAllManualSignal = 0,
  expandAllManualSignal = 0,
}: ManualWorkspaceProps) {
  const {
    currentProject,
    loadProject,
    updateProject,
    updateMargins,
  } = useCostingStore();

  const [groups, setGroups] = useState<ManualGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [openCats, setOpenCats] = useState<Record<string, boolean>>({});
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pickerLockGroupId, setPickerLockGroupId] = useState<string | null>(
    null
  );
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
  const marginPctRef = useRef(marginPct);
  const togglesRef = useRef({ esk: true, asu: true, mob: true });
  useEffect(() => {
    marginPctRef.current = marginPct;
  }, [marginPct]);
  useEffect(() => {
    togglesRef.current = { esk: useEsk, asu: useAsu, mob: useMob };
  }, [useEsk, useAsu, useMob]);

  const [renameId, setRenameId] = useState<string | null>(null);
  const [renameVal, setRenameVal] = useState("");
  const [priceEditId, setPriceEditId] = useState<string | null>(null);
  const [priceDraft, setPriceDraft] = useState("");
  const [deleteItemId, setDeleteItemId] = useState<string | null>(null);
  const [qtyDraft, setQtyDraft] = useState<Record<string, string>>({});

  const projectId = currentProject?.id;
  const manualBase =
    projectId != null
      ? `/api/projects/${projectId}/segments/${segmentId}/manual`
      : "";

  const loadManual = useCallback(async (): Promise<ManualGroup[]> => {
    if (!projectId || !manualBase) return [];
    const r = await fetch(`${manualBase}`, {
      cache: "no-store",
    });
    if (!r.ok) throw new Error(await readErr(r));
    const data = (await r.json()) as { groups: ManualGroup[] };
    const list = data.groups ?? [];
    setGroups(list);
    const o: Record<string, boolean> = {};
    for (const g of list) o[g.id] = true;
    setOpenCats((prev) => ({ ...o, ...prev }));
    return list;
  }, [projectId, manualBase]);

  useEffect(() => {
    if (!projectId || !segmentId) return;
    let cancelled = false;
    void (async () => {
      try {
        await loadManual();
      } catch (e) {
        showToast(String(e));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [projectId, segmentId, loadManual]);

  const lastCollapseSig = useRef(0);
  const lastExpandSig = useRef(0);
  useEffect(() => {
    if (collapseAllManualSignal <= lastCollapseSig.current) return;
    lastCollapseSig.current = collapseAllManualSignal;
    setOpenCats((prev) => {
      const next = { ...prev };
      for (const g of groups) next[g.id] = false;
      return next;
    });
  }, [collapseAllManualSignal, groups]);

  useEffect(() => {
    if (expandAllManualSignal <= lastExpandSig.current) return;
    lastExpandSig.current = expandAllManualSignal;
    setOpenCats((prev) => {
      const next = { ...prev };
      for (const g of groups) next[g.id] = true;
      return next;
    });
  }, [expandAllManualSignal, groups]);

  useEffect(() => {
    if (!currentProject) return;
    queueMicrotask(() => {
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
    });
  }, [currentProject]);

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
      showToast(e instanceof Error ? e.message : "Gagal simpan margin");
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
      showToast(e instanceof Error ? e.message : "Gagal simpan");
    }
  };

  const existingKeys = useMemo(() => {
    const s = new Set<string>();
    for (const g of groups) {
      for (const it of g.items) {
        s.add(rowKey(it.sourceType, it.sourceId));
      }
    }
    return s;
  }, [groups]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const groupIds = useMemo(
    () => groups.map((g) => `g-${g.id}`),
    [groups]
  );

  const onDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || !projectId) return;
    const aid = String(active.id);
    const oid = String(over.id);
    if (aid === oid) return;

    if (aid.startsWith("g-") && oid.startsWith("g-")) {
      const oldIndex = groups.findIndex((g) => `g-${g.id}` === aid);
      const newIndex = groups.findIndex((g) => `g-${g.id}` === oid);
      if (oldIndex < 0 || newIndex < 0) return;
      const next = arrayMove(groups, oldIndex, newIndex);
      setGroups(next);
      try {
        await Promise.all(
          next.map((g, i) =>
            fetch(`${manualBase}/groups/${g.id}`, {
              method: "PUT",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ sortOrder: i }),
            })
          )
        );
        await loadManual();
      } catch (e) {
        showToast(String(e));
      }
      return;
    }

    if (aid.startsWith("i-") && oid.startsWith("i-")) {
      const activeItemId = aid.slice(2);
      const overItemId = oid.slice(2);
      let group: ManualGroup | undefined;
      for (const g of groups) {
        if (g.items.some((i) => i.id === activeItemId)) {
          group = g;
          break;
        }
      }
      if (!group) return;
      const idxOld = group.items.findIndex((i) => i.id === activeItemId);
      const idxNew = group.items.findIndex((i) => i.id === overItemId);
      if (idxOld < 0 || idxNew < 0) return;
      const newItems = arrayMove(group.items, idxOld, idxNew);
      const gIdx = groups.findIndex((g) => g.id === group.id);
      if (gIdx < 0) return;
      const nextGroups = [...groups];
      nextGroups[gIdx] = { ...group, items: newItems };
      setGroups(nextGroups);
      try {
        await Promise.all(
          newItems.map((it, i) =>
            fetch(`${manualBase}/items/${it.id}`, {
              method: "PUT",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ sortOrder: i }),
            })
          )
        );
        await loadManual();
        await loadProject(projectId);
      } catch (e) {
        showToast(String(e));
      }
    }
  };

  const openPickerTop = async () => {
    if (!projectId) return;
    let list = await loadManual();
    if (list.length === 0) {
      const r = await fetch(`${manualBase}/groups`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: "Umum" }),
      });
      if (!r.ok) {
        showToast(await readErr(r));
        return;
      }
      list = await loadManual();
    }
    setPickerLockGroupId(null);
    setPickerOpen(true);
  };

  const openPickerForGroup = (groupId: string) => {
    setPickerLockGroupId(groupId);
    setPickerOpen(true);
  };

  const onPickerConfirm = async (
    groupId: string,
    items: PickerSelection[]
  ) => {
    if (!projectId) return;
    const r = await fetch(
      `${manualBase}/groups/${groupId}/items`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: items.map((i) => ({
            sourceType: i.sourceType,
            sourceId: i.sourceId,
            qty: i.qty,
          })),
        }),
      }
    );
    if (!r.ok) throw new Error(await readErr(r));
    await loadManual();
    await loadProject(projectId);
  };

  const createGroupFromName = async (
    name: string
  ): Promise<string | null> => {
    if (!projectId) return null;
    const r = await fetch(`${manualBase}/groups`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    });
    if (!r.ok) {
      showToast(await readErr(r));
      return null;
    }
    const created = (await r.json()) as { id: string };
    await loadManual();
    return created.id;
  };

  const saveRename = async (groupId: string) => {
    if (!projectId || !renameVal.trim()) {
      setRenameId(null);
      return;
    }
    const r = await fetch(
      `${manualBase}/groups/${groupId}`,
      {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: renameVal.trim() }),
      }
    );
    if (!r.ok) showToast(await readErr(r));
    setRenameId(null);
    await loadManual();
  };

  const updateItemQty = async (itemId: string, qty: number) => {
    if (!projectId) return;
    const r = await fetch(`${manualBase}/items/${itemId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ qty }),
    });
    if (!r.ok) showToast(await readErr(r));
    await loadManual();
    await loadProject(projectId);
  };

  const applyPriceOverride = async (itemId: string, price: number | null) => {
    if (!projectId) return;
    const r = await fetch(`${manualBase}/items/${itemId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ overridePrice: price }),
    });
    if (!r.ok) showToast(await readErr(r));
    setPriceEditId(null);
    await loadManual();
    await loadProject(projectId);
  };

  const removeItem = async (itemId: string) => {
    if (!projectId) return;
    const r = await fetch(`${manualBase}/items/${itemId}`, {
      method: "DELETE",
    });
    if (!r.ok) showToast(await readErr(r));
    setDeleteItemId(null);
    await loadManual();
    await loadProject(projectId);
  };

  if (!currentProject) return null;

  return (
    <div
      className={cn("space-y-6", !embedded && "mx-auto max-w-6xl")}
    >
      {toast && (
        <div className="bg-card border-border fixed bottom-4 left-1/2 z-50 -translate-x-1/2 rounded-lg border px-4 py-2 text-sm">
          {toast}
        </div>
      )}

      <div
        className={cn(
          "flex flex-wrap items-center gap-2",
          embedded ? "justify-end" : "justify-between gap-3"
        )}
      >
        {!embedded && (
          <div>
            <h2 className="text-lg font-semibold text-foreground">
              Project: {currentProject.name}
            </h2>
            <Badge className="mt-1 bg-violet-600 hover:bg-violet-600">
              Mode: Manual
            </Badge>
          </div>
        )}
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="secondary" onClick={() => void openPickerTop()}>
            + Tambah Item dari Database
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="space-y-4">
          <Skeleton className="h-40 w-full" />
          <Skeleton className="h-40 w-full" />
        </div>
      ) : groups.length === 0 ? (
        <EmptyState
          icon={Plus}
          title="Belum ada grup"
          description="Tambah item dari database master. Grup default “Umum” dibuat otomatis saat pertama kali membuka pemilih item."
          actionLabel="+ Tambah Item dari Database"
          onAction={() => void openPickerTop()}
          className="min-h-[240px]"
        />
      ) : (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={(e) => void onDragEnd(e)}
        >
          <SortableContext
          id="manual-groups"
          items={groupIds}
          strategy={verticalListSortingStrategy}
        >
            <div className="space-y-3">
              {groups.map((g) => {
                const open = openCats[g.id] ?? true;
                const itemIds = g.items.map((i) => `i-${i.id}`);
                return (
                  <SortableGroupWrap key={g.id} id={`g-${g.id}`}>
                    <Card className="overflow-hidden border-border ">
                      <button
                        type="button"
                        onClick={() =>
                          setOpenCats((o) => ({ ...o, [g.id]: !open }))
                        }
                        className="flex w-full items-center justify-between gap-3 border-b border-border bg-muted/50 px-4 py-3 text-left"
                      >
                        <span className="min-w-0 flex-1 font-medium text-foreground">
                          {renameId === g.id ? (
                            <Input
                              className="h-8 max-w-xs"
                              value={renameVal}
                              autoFocus
                              onChange={(e) => setRenameVal(e.target.value)}
                              onBlur={() => void saveRename(g.id)}
                              onKeyDown={(e) => {
                                if (e.key === "Enter") void saveRename(g.id);
                              }}
                              onClick={(e) => e.stopPropagation()}
                            />
                          ) : (
                            <span
                              role="presentation"
                              onDoubleClick={(e) => {
                                e.stopPropagation();
                                setRenameId(g.id);
                                setRenameVal(g.name);
                              }}
                            >
                              {g.name}
                            </span>
                          )}
                        </span>
                        <span className="flex items-center gap-3">
                          <span className="tabular-money text-sm font-semibold text-foreground">
                            {formatIDR(g.subtotal)}
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
                          <SortableContext
                            id={`manual-items-${g.id}`}
                            items={itemIds}
                            strategy={verticalListSortingStrategy}
                          >
                            <Table>
                              <TableHeader>
                                <TableRow className="hover:bg-transparent">
                                  <TableHead className="w-10" />
                                  <TableHead>Nama item</TableHead>
                                  <TableHead className="w-16">UOM</TableHead>
                                  <TableHead className="w-28 text-right">
                                    Qty
                                  </TableHead>
                                  <TableHead className="text-right">
                                    Harga
                                  </TableHead>
                                  <TableHead className="text-right">
                                    Total
                                  </TableHead>
                                  <TableHead className="w-10" />
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {g.items.map((row) => (
                                  <SortableItemRow
                                    key={row.id}
                                    id={`i-${row.id}`}
                                  >
                                    {(handle) => (
                                      <>
                                        <TableCell className="align-middle">
                                          {handle}
                                        </TableCell>
                                        <TableCell className="max-w-[200px] text-sm">
                                          {row.name}
                                        </TableCell>
                                        <TableCell className="text-sm">
                                          {row.uom}
                                        </TableCell>
                                        <TableCell className="text-right">
                                          <Input
                                            className="tabular-money ml-auto h-8 w-24 text-right"
                                            value={
                                              qtyDraft[row.id] ??
                                              String(row.qty)
                                            }
                                            onChange={(e) =>
                                              setQtyDraft((q) => ({
                                                ...q,
                                                [row.id]: e.target.value,
                                              }))
                                            }
                                            onKeyDown={(e) => {
                                              if (e.key === "Enter")
                                                e.currentTarget.blur();
                                            }}
                                            onBlur={(e) => {
                                              const v = Number(
                                                e.currentTarget.value
                                              );
                                              if (!Number.isFinite(v) || v <= 0)
                                                return;
                                              setQtyDraft((q) => {
                                                const n = { ...q };
                                                delete n[row.id];
                                                return n;
                                              });
                                              void updateItemQty(row.id, v);
                                            }}
                                          />
                                        </TableCell>
                                        <TableCell className="text-right text-sm">
                                          {priceEditId === row.id ? (
                                            <div className="flex items-center justify-end gap-1">
                                              <Input
                                                className="tabular-money h-8 w-28 text-right"
                                                value={priceDraft}
                                                autoFocus
                                                onChange={(e) =>
                                                  setPriceDraft(e.target.value)
                                                }
                                                onBlur={() => {
                                                  const v = Number(priceDraft);
                                                  if (Number.isFinite(v) && v >= 0)
                                                    void applyPriceOverride(
                                                      row.id,
                                                      v
                                                    );
                                                  else setPriceEditId(null);
                                                }}
                                              />
                                            </div>
                                          ) : (
                                            <button
                                              type="button"
                                              className={cn(
                                                "tabular-money inline-flex items-center gap-1 hover:underline",
                                                row.overridePrice != null
                                                  ? "text-amber-700"
                                                  : ""
                                              )}
                                              onClick={() => {
                                                setPriceEditId(row.id);
                                                setPriceDraft(
                                                  String(
                                                    row.overridePrice ??
                                                      row.basePrice
                                                  )
                                                );
                                              }}
                                            >
                                              {formatIDR(
                                                row.overridePrice ??
                                                  row.basePrice
                                              )}
                                              <Pencil className="size-3 opacity-60" />
                                            </button>
                                          )}
                                          {row.overridePrice != null ? (
                                            <Button
                                              type="button"
                                              variant="ghost"
                                              size="icon"
                                              className="size-7 text-amber-700"
                                              title="Kembalikan harga DB"
                                              onClick={() =>
                                                void applyPriceOverride(
                                                  row.id,
                                                  null
                                                )
                                              }
                                            >
                                              <RotateCcw className="size-3.5" />
                                            </Button>
                                          ) : null}
                                        </TableCell>
                                        <TableCell className="tabular-money text-right text-sm font-medium">
                                          {formatIDR(row.subtotal)}
                                        </TableCell>
                                        <TableCell>
                                          <Button
                                            type="button"
                                            variant="ghost"
                                            size="icon"
                                            className="size-8 text-muted-foreground"
                                            onClick={() =>
                                              setDeleteItemId(row.id)
                                            }
                                          >
                                            <Trash2 className="size-4" />
                                          </Button>
                                        </TableCell>
                                      </>
                                    )}
                                  </SortableItemRow>
                                ))}
                              </TableBody>
                            </Table>
                          </SortableContext>
                          <div className="border-t border-border px-4 py-2">
                            <button
                              type="button"
                              className="text-primary text-sm font-medium hover:underline"
                              onClick={() => openPickerForGroup(g.id)}
                            >
                              + Tambah Item ke Grup ini
                            </button>
                          </div>
                        </CardContent>
                      )}
                    </Card>
                  </SortableGroupWrap>
                );
              })}
            </div>
          </SortableContext>
        </DndContext>
      )}

      {!embedded ? (
      <Card className="border-border ">
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
                      id="esk-m"
                    />
                    <Label htmlFor="esk-m">Eskalasi</Label>
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
                      id="asu-m"
                    />
                    <Label htmlFor="asu-m">Asuransi</Label>
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
                      id="mob-m"
                    />
                    <Label htmlFor="mob-m">Mobilisasi</Label>
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
      ) : null}

      <ItemPickerModal
        open={pickerOpen}
        onOpenChange={(o) => {
          setPickerOpen(o);
          if (!o) setPickerLockGroupId(null);
        }}
        existingKeys={existingKeys}
        groups={groups.map((g) => ({ id: g.id, name: g.name }))}
        lockGroupId={pickerLockGroupId ?? undefined}
        onConfirm={async (groupId, items) => {
          await onPickerConfirm(groupId, items);
        }}
        onCreateGroup={(name) => createGroupFromName(name)}
      />

      <Dialog
        open={deleteItemId != null}
        onOpenChange={(o) => !o && setDeleteItemId(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Hapus item?</DialogTitle>
          </DialogHeader>
          <p className="text-muted-foreground text-sm">
            Item akan dihapus dari grup ini. Tindakan ini dapat dibatalkan dengan
            menambah ulang dari database.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteItemId(null)}>
              Batal
            </Button>
            <Button
              variant="destructive"
              onClick={() =>
                deleteItemId && void removeItem(deleteItemId)
              }
            >
              Hapus
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
