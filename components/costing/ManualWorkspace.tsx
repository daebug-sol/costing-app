"use client";

import { costingErrorMessage } from "@/lib/costing-error-message";
import { toastError } from "@/store/toastStore";
import { useI18n } from "@/components/i18n-provider";
import { FolderPlus, Pencil, Plus } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AssemblyTypeBadge } from "@/components/costing/assembly-type-badge";
import { ManualGroupTree } from "@/components/costing/manual-group-tree";
import {
  ItemPickerModal,
  type PickerSelection,
} from "@/components/costing/ItemPickerModal";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableRow,
} from "@/components/ui/table";
import { formatIDR } from "@/lib/utils/format";
import { computeCostSummary, finite } from "@/lib/cost-summary";
import { cn } from "@/lib/utils";
import {
  buildGroupTree,
  canAddSubgroup,
  flattenGroupTree,
  materialUsage,
} from "@/lib/manual-group-tree";
import { useConfirm } from "@/components/confirm-dialog";
import { useCostingStore } from "@/store/costingStore";
import { useUiWorkflowStore } from "@/store/uiWorkflowStore";
import { tourEvent } from "@/lib/tour/events";

/** Must match `ensureDefaultUmumGroup` in lib/manual-costing-rollup.ts */
const DEFAULT_MANUAL_GROUP_NAME = "Kelompok utama";
const LEGACY_DEFAULT_MANUAL_GROUP_NAME = "Umum";

const FLAT_DEFAULT_GROUP_NAMES = new Set([
  DEFAULT_MANUAL_GROUP_NAME,
  LEGACY_DEFAULT_MANUAL_GROUP_NAME,
]);

function isFlatDefaultGroupName(name: string) {
  return FLAT_DEFAULT_GROUP_NAMES.has(name);
}

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
  parentId?: string | null;
  name: string;
  sortOrder: number;
  subtotal: number;
  items: ManualItem[];
};

async function readErr(res: Response): Promise<string> {
  try {
    const j = (await res.json()) as { error?: string };
    if (j?.error) return j.error;
  } catch {
    /* ignore */
  }
  return res.statusText || "Request failed";
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
  const { t } = useI18n();
  const [confirm, confirmDialog] = useConfirm();
  const currentProject = useCostingStore((s) => s.currentProject);
  const loadProject = useCostingStore((s) => s.loadProject);
  const updateProject = useCostingStore((s) => s.updateProject);
  const updateMargins = useCostingStore((s) => s.updateMargins);

  const [groups, setGroups] = useState<ManualGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [openCats, setOpenCats] = useState<Record<string, boolean>>({});
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pickerLockGroupId, setPickerLockGroupId] = useState<string | null>(
    null
  );
  const showToast = (m: string) => toastError(m);

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

  const [priceEditId, setPriceEditId] = useState<string | null>(null);
  const [priceDraft, setPriceDraft] = useState("");
  const [renamingId, setRenamingId] = useState<string | null>(null);
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
    const saved =
      useUiWorkflowStore.getState().costing.manualOpenCatsByProject[
        projectId
      ]?.[segmentId];
    const o: Record<string, boolean> = {};
    for (const g of list) {
      o[g.id] = saved?.[g.id] ?? true;
    }
    setOpenCats(o);
    return list;
  }, [projectId, manualBase, segmentId]);

  useEffect(() => {
    if (!projectId || !segmentId) return;
    let cancelled = false;
    void (async () => {
      try {
        await loadManual();
      } catch (e) {
        showToast(costingErrorMessage(e));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [projectId, segmentId, loadManual]);

  useEffect(() => {
    if (!projectId || !segmentId) return;
    if (groups.length === 0) return;
    useUiWorkflowStore
      .getState()
      .setManualOpenCats(projectId, segmentId, openCats);
  }, [projectId, segmentId, groups.length, openCats]);

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
        priceAdjustmentPct: 0,
        priceAdjustmentAmt: 0,
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
        priceAdjustmentPct: 0,
        priceAdjustmentAmt: 0,
        totalSelling: selling,
      } as never);
    } catch (e) {
      showToast(e instanceof Error ? e.message : "Gagal simpan");
    }
  };

  const tree = useMemo(() => buildGroupTree(groups), [groups]);
  const usage = useMemo(() => materialUsage(groups), [groups]);

  /** Label bagian untuk picker: "Kaki / Tapak" untuk sub-bagian. */
  const groupOptions = useMemo(
    () =>
      flattenGroupTree(tree).map((n) => {
        const names: string[] = [];
        let cur: ManualGroup | undefined = n.group;
        const byId = new Map(groups.map((g) => [g.id, g]));
        while (cur) {
          names.unshift(cur.name);
          cur = cur.parentId ? byId.get(cur.parentId) : undefined;
        }
        return { id: n.group.id, name: names.join(" / ") };
      }),
    [tree, groups]
  );

  const persistOrder = async (
    list: { id: string }[],
    url: (id: string) => string
  ) => {
    const results = await Promise.all(
      list.map((x, i) =>
        fetch(url(x.id), {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sortOrder: i }),
        })
      )
    );
    const bad = results.find((r) => !r.ok);
    if (bad) throw new Error(await readErr(bad));
  };

  const moveGroup = async (groupId: string, dir: -1 | 1) => {
    if (!projectId) return;
    const g = groups.find((x) => x.id === groupId);
    if (!g) return;
    const siblings = groups
      .filter((x) => (x.parentId ?? null) === (g.parentId ?? null))
      .sort((a, b) => a.sortOrder - b.sortOrder);
    const from = siblings.findIndex((x) => x.id === groupId);
    const to = from + dir;
    if (from < 0 || to < 0 || to >= siblings.length) return;
    const next = [...siblings];
    [next[from], next[to]] = [next[to], next[from]];
    try {
      await persistOrder(next, (id) => `${manualBase}/groups/${id}`);
      await loadManual();
    } catch (e) {
      showToast(costingErrorMessage(e));
    }
  };

  const moveItem = async (groupId: string, itemId: string, dir: -1 | 1) => {
    if (!projectId) return;
    const g = groups.find((x) => x.id === groupId);
    if (!g) return;
    const from = g.items.findIndex((i) => i.id === itemId);
    const to = from + dir;
    if (from < 0 || to < 0 || to >= g.items.length) return;
    const next = [...g.items];
    [next[from], next[to]] = [next[to], next[from]];
    try {
      await persistOrder(next, (id) => `${manualBase}/items/${id}`);
      await loadManual();
    } catch (e) {
      showToast(costingErrorMessage(e));
    }
  };
  const openPickerForGroup = (groupId: string) => {
    setPickerLockGroupId(groupId);
    setPickerOpen(true);
    tourEvent("costing.material-picker-opened");
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
    tourEvent("costing.material-added");
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

  const renameGroup = async (groupId: string, name: string) => {
    if (!projectId || !name.trim()) return;
    const r = await fetch(
      `${manualBase}/groups/${groupId}`,
      {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim() }),
      }
    );
    if (!r.ok) showToast(await readErr(r));
    await loadManual();
  };

  /** Bagian baru (atau sub-bagian) lalu langsung minta nama. */
  const createBagian = async (parentId: string | null) => {
    if (!projectId) return;
    if (parentId && !canAddSubgroup(groups, parentId)) {
      showToast(t("costing.manual.maxDepth"));
      return;
    }
    const siblings = groups.filter((g) => (g.parentId ?? null) === parentId).length;
    const r = await fetch(`${manualBase}/groups`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: t("costing.manual.defaultGroupName", { n: String(siblings + 1) }),
        parentId,
      }),
    });
    if (!r.ok) {
      showToast(await readErr(r));
      return;
    }
    const created = (await r.json()) as { id: string };
    await loadManual();
    setOpenCats((prev) => ({
      ...prev,
      [created.id]: true,
      ...(parentId ? { [parentId]: true } : {}),
    }));
    setRenamingId(created.id);
  };

  /** Tombol bawah: item tunggal langsung ke bagian bawaan; kalau sudah ada bagian, pilih di picker. */
  const addMaterialFromBottom = async () => {
    if (groups.length > 1 || (groups.length === 1 && !isFlat)) {
      setPickerLockGroupId(null);
      setPickerOpen(true);
      tourEvent("costing.material-picker-opened");
      return;
    }
    if (groups[0]?.id) {
      openPickerForGroup(groups[0].id);
      return;
    }
    const id = await createGroupFromName(DEFAULT_MANUAL_GROUP_NAME);
    if (!id) return;
    setOpenCats((prev) => ({ ...prev, [id]: true }));
    openPickerForGroup(id);
  };

  const isFlat =
    groups.length === 1 && isFlatDefaultGroupName(groups[0]?.name ?? "");
  const isManualEmpty =
    groups.length === 0 ||
    (isFlat && (groups[0]?.items.length ?? 0) === 0);

  const removeGroup = async (groupId: string) => {
    if (!projectId) return;
    const r = await fetch(`${manualBase}/groups/${groupId}`, {
      method: "DELETE",
    });
    if (!r.ok) {
      showToast(await readErr(r));
      return;
    }
    await loadManual();
    await loadProject(projectId);
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
    await loadManual();
    await loadProject(projectId);
  };

  const renderQtyInput = (row: ManualItem, className: string) => (
    <Input
      className={className}
      inputMode="decimal"
      aria-label={t("costing.manual.qtyFor", { name: row.name })}
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
  );

  const startPriceEdit = (row: { id: string; overridePrice: number | null; basePrice: number }) => {
    setPriceEditId(row.id);
    setPriceDraft(String(row.overridePrice ?? row.basePrice));
  };

  const renderPriceControl = (row: ManualItem) =>
    priceEditId === row.id ? (
      <Input
        className="tabular-money ml-auto h-8 w-28 px-2 text-right"
        value={priceDraft}
        autoFocus
        inputMode="decimal"
        aria-label={t("costing.manual.priceFor", { name: row.name })}
        onChange={(e) => setPriceDraft(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") e.currentTarget.blur();
          if (e.key === "Escape") setPriceEditId(null);
        }}
        onBlur={() => {
          const v = Number(priceDraft);
          if (Number.isFinite(v) && v >= 0) void applyPriceOverride(row.id, v);
          else setPriceEditId(null);
        }}
      />
    ) : (
      <button
        type="button"
        className={cn(
          "tabular-money inline-flex items-center gap-1 rounded-sm hover:underline",
          row.overridePrice != null && "text-amber-700"
        )}
        title={row.overridePrice != null ? t("costing.manual.overridden") : undefined}
        aria-label={`${t("costing.manual.editPrice")}: ${row.name}`}
        onClick={() => startPriceEdit(row)}
      >
        {formatIDR(row.overridePrice ?? row.basePrice)}
        <Pencil className="hidden size-3 opacity-60 md:inline" aria-hidden />
      </button>
    );

  if (!currentProject) return null;

  return (
    <div
      className={cn("space-y-4", !embedded && "mx-auto max-w-6xl")}
    >
      {confirmDialog}

      {!embedded && (
        <div
          className={cn(
            "flex flex-wrap items-center gap-2",
            embedded ? "justify-end" : "justify-between gap-3"
          )}
        >
          {!embedded && (
            <div>
              <h2 className="text-lg font-semibold text-foreground">
                Proyek: {currentProject.name}
              </h2>
              <AssemblyTypeBadge variant="manual" className="mt-1" />
            </div>
          )}
        </div>
      )}

      {loading ? (
        <div className="space-y-3">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
        </div>
      ) : isManualEmpty ? (
        <div className="flex min-h-32 flex-col items-center justify-center gap-3 py-8">
          <p className="text-muted-foreground text-sm">
            {t("costing.manual.empty")}
          </p>
          <div className="flex flex-wrap justify-center gap-2">
            <Button
              type="button"
              onClick={() => void addMaterialFromBottom()}
              data-tour="costing.add-material"
            >
              <Plus data-icon="inline-start" aria-hidden />
              {t("costing.manual.addRow")}
            </Button>
            <Button type="button" variant="outline" onClick={() => void createBagian(null)}>
              <FolderPlus data-icon="inline-start" aria-hidden />
              {t("costing.manual.addGroup")}
            </Button>
          </div>
        </div>
      ) : (
        <ManualGroupTree
          nodes={tree}
          flat={isFlat}
          openCats={openCats}
          onToggle={(id) => setOpenCats((o) => ({ ...o, [id]: !(o[id] ?? true) }))}
          renamingId={renamingId}
          onStartRename={setRenamingId}
          onCommitRename={(id, name) => {
            setRenamingId(null);
            if (name != null) void renameGroup(id, name);
          }}
          usage={usage}
          onAddMaterial={openPickerForGroup}
          onAddSubgroup={(id) => void createBagian(id)}
          onMoveGroup={(id, dir) => void moveGroup(id, dir)}
          onDeleteGroup={(g) => {
            void confirm({
              title: t("costing.deleteGroupTitle", { name: g.name }),
              description: t("costing.deleteGroupDescription"),
            }).then((ok) => {
              if (ok) void removeGroup(g.id);
            });
          }}
          onMoveItem={(gid, iid, dir) => void moveItem(gid, iid, dir)}
          onDeleteItem={(row) => {
            void confirm({
              title: t("costing.manual.deleteRowTitle", { name: row.name }),
              description: t("costing.manual.deleteRowDescription"),
            }).then((ok) => {
              if (ok) void removeItem(row.id);
            });
          }}
          onEditPrice={startPriceEdit}
          onResetPrice={(row) => void applyPriceOverride(row.id, null)}
          renderQtyInput={(row, className) => renderQtyInput(row as ManualItem, className)}
          renderPrice={(row) => renderPriceControl(row as ManualItem)}
        />
      )}

      {!loading && !isManualEmpty ? (
        <div className="flex flex-wrap gap-2 border-t border-border pt-3">
          <Button
            type="button"
            onClick={() => void addMaterialFromBottom()}
            data-tour="costing.add-material"
          >
            <Plus data-icon="inline-start" aria-hidden />
            {t("costing.manual.addRow")}
          </Button>
          <Button type="button" variant="outline" onClick={() => void createBagian(null)}>
            <FolderPlus data-icon="inline-start" aria-hidden />
            {t("costing.manual.addGroup")}
          </Button>
        </div>
      ) : null}

      {!embedded ? (
      <Card className="border-border ">
        <CardContent className="space-y-4 p-4">
          <h3 className="text-sm font-semibold text-foreground">
            Ringkasan biaya
          </h3>
          <Table>
            <TableBody>
              <TableRow>
                <TableCell>{t("costing.totalMaterialHpp")}</TableCell>
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
                <TableCell>{t("costing.totalCost")}</TableCell>
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
                <TableCell>Harga jual</TableCell>
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
                  showToast(costingErrorMessage(e))
                )
              }
            >
              Save Draft
            </Button>
            <Button
              type="button"
              onClick={() =>
                updateProject({ status: "finalized" }).catch((e) =>
                  showToast(costingErrorMessage(e))
                )
              }
            >
              Finalize
            </Button>
            <Button type="button" variant="outline" asChild>
              <Link href={`/documentation?fromProject=${currentProject.id}`}>
                → {t("common.createQuotation")}
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
        usage={usage}
        groups={groupOptions}
        lockGroupId={pickerLockGroupId ?? undefined}
        onConfirm={async (groupId, items) => {
          await onPickerConfirm(groupId, items);
        }}
        onCreateGroup={(name) => createGroupFromName(name)}
      />
    </div>
  );
}
