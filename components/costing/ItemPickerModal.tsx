"use client";

import { Search } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatIDR } from "@/lib/utils/format";
import { cn } from "@/lib/utils";

export type PickerSelection = {
  sourceType: "material" | "profile" | "component";
  sourceId: string;
  qty: number;
};

type MaterialRow = {
  id: string;
  code: string;
  name: string;
  category: string;
  pricePerKg: number;
  unit: string;
};

type ProfileRow = {
  id: string;
  code: string;
  name: string;
  type: string;
  pricePerM: number;
};

type ComponentRow = {
  id: string;
  code: string;
  name: string;
  category: string;
  unitPrice: number;
  unit: string;
};

type UnifiedRow = {
  key: string;
  sourceType: PickerSelection["sourceType"];
  sourceId: string;
  title: string;
  subtitle: string;
  category: string;
  priceLabel: string;
  uom: string;
};

function rowKey(sourceType: string, sourceId: string) {
  return `${sourceType}:${sourceId}`;
}

export function ItemPickerModal({
  open,
  onOpenChange,
  existingKeys,
  groups,
  lockGroupId,
  onConfirm,
  onCreateGroup,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  existingKeys: Set<string>;
  groups: { id: string; name: string }[];
  lockGroupId?: string | null;
  onConfirm: (groupId: string, items: PickerSelection[]) => Promise<void>;
  /** Buat grup baru dari picker; kembalikan id grup atau null jika gagal/dibatalkan */
  onCreateGroup?: (name: string) => Promise<string | null>;
}) {
  const [materials, setMaterials] = useState<MaterialRow[]>([]);
  const [profiles, setProfiles] = useState<ProfileRow[]>([]);
  const [components, setComponents] = useState<ComponentRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("__all__");
  const [selectedGroupId, setSelectedGroupId] = useState<string>("");
  const [checked, setChecked] = useState<Record<string, boolean>>({});
  const [qtyByKey, setQtyByKey] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  const unifiedRows: UnifiedRow[] = useMemo(() => {
    const mRows: UnifiedRow[] = materials.map((m) => ({
      key: rowKey("material", m.id),
      sourceType: "material",
      sourceId: m.id,
      title: m.name,
      subtitle: m.code,
      category: m.category,
      priceLabel: `${formatIDR(m.pricePerKg)}/${m.unit}`,
      uom: m.unit,
    }));
    const pRows: UnifiedRow[] = profiles.map((p) => ({
      key: rowKey("profile", p.id),
      sourceType: "profile",
      sourceId: p.id,
      title: p.name,
      subtitle: p.code,
      category: p.type,
      priceLabel: `${formatIDR(p.pricePerM)}/m`,
      uom: "m",
    }));
    const cRows: UnifiedRow[] = components.map((c) => ({
      key: rowKey("component", c.id),
      sourceType: "component",
      sourceId: c.id,
      title: c.name,
      subtitle: c.code,
      category: c.category,
      priceLabel: `${formatIDR(c.unitPrice)}/${c.unit}`,
      uom: c.unit,
    }));
    return [...mRows, ...pRows, ...cRows];
  }, [materials, profiles, components]);

  const categories = useMemo(() => {
    const s = new Set<string>();
    for (const r of unifiedRows) s.add(r.category);
    return ["__all__", ...Array.from(s).sort((a, b) => a.localeCompare(b))];
  }, [unifiedRows]);

  const filteredLeft = useMemo(() => {
    const q = search.trim().toLowerCase();
    return unifiedRows.filter((r) => {
      if (categoryFilter !== "__all__" && r.category !== categoryFilter)
        return false;
      if (!q) return true;
      return (
        r.title.toLowerCase().includes(q) ||
        r.subtitle.toLowerCase().includes(q) ||
        r.category.toLowerCase().includes(q)
      );
    });
  }, [unifiedRows, search, categoryFilter]);

  const groupedLeft = useMemo(() => {
    const m = new Map<string, UnifiedRow[]>();
    for (const r of filteredLeft) {
      const arr = m.get(r.category) ?? [];
      arr.push(r);
      m.set(r.category, arr);
    }
    return Array.from(m.entries()).sort(([a], [b]) => a.localeCompare(b));
  }, [filteredLeft]);

  const selectedKeys = useMemo(
    () =>
      Object.entries(checked)
        .filter(([, v]) => v)
        .map(([k]) => k),
    [checked]
  );

  const selectedRows = useMemo(() => {
    const byKey = new Map(unifiedRows.map((r) => [r.key, r]));
    return selectedKeys
      .map((k) => byKey.get(k))
      .filter((x): x is UnifiedRow => Boolean(x));
  }, [selectedKeys, unifiedRows]);

  const effectiveGroupId = lockGroupId ?? selectedGroupId;

  const canSubmit = useMemo(() => {
    if (!effectiveGroupId) return false;
    if (selectedKeys.length === 0) return false;
    for (const k of selectedKeys) {
      const q = Number(qtyByKey[k]);
      if (!Number.isFinite(q) || q <= 0) return false;
    }
    return true;
  }, [effectiveGroupId, selectedKeys, qtyByKey]);

  const loadCatalog = useCallback(async () => {
    setLoading(true);
    try {
      const [rm, rp, rc] = await Promise.all([
        fetch("/api/materials", { cache: "no-store" }),
        fetch("/api/profiles", { cache: "no-store" }),
        fetch("/api/components", { cache: "no-store" }),
      ]);
      if (rm.ok) setMaterials((await rm.json()) as MaterialRow[]);
      if (rp.ok) setProfiles((await rp.json()) as ProfileRow[]);
      if (rc.ok) setComponents((await rc.json()) as ComponentRow[]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!open) return;
    void loadCatalog();
    setSearch("");
    setCategoryFilter("__all__");
    setChecked({});
    setQtyByKey({});
  }, [open, loadCatalog]);

  useEffect(() => {
    if (!open) return;
    if (lockGroupId) {
      setSelectedGroupId(lockGroupId);
      return;
    }
    setSelectedGroupId((cur) =>
      cur && groups.some((g) => g.id === cur) ? cur : (groups[0]?.id ?? "")
    );
  }, [open, lockGroupId, groups]);

  const toggle = (key: string, row: UnifiedRow, next: boolean) => {
    setChecked((prev) => ({ ...prev, [key]: next }));
    setQtyByKey((prev) => {
      if (next && prev[key] === undefined) return { ...prev, [key]: "1" };
      return prev;
    });
  };

  const handleConfirm = async () => {
    if (!effectiveGroupId || !canSubmit) return;
    const items: PickerSelection[] = [];
    for (const k of selectedKeys) {
      const parts = k.split(":");
      const sourceType = parts[0] as PickerSelection["sourceType"];
      const sourceId = parts.slice(1).join(":");
      const q = Number(qtyByKey[k]);
      items.push({ sourceType, sourceId, qty: q });
    }
    setSubmitting(true);
    try {
      await onConfirm(effectiveGroupId, items);
      onOpenChange(false);
    } finally {
      setSubmitting(false);
    }
  };

  const selectGroupValue = (v: string) => {
    if (v === "__create__") {
      if (!onCreateGroup) return;
      const name = window.prompt("Nama grup baru?");
      if (!name?.trim()) return;
      void (async () => {
        const id = await onCreateGroup(name.trim());
        if (id) setSelectedGroupId(id);
      })();
      return;
    }
    setSelectedGroupId(v);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex h-[min(90vh,900px)] max-h-[90vh] w-[min(100vw-2rem,1400px)] max-w-[calc(100vw-2rem)] flex-col gap-0 overflow-hidden p-0 sm:max-w-[min(90rem,calc(100vw-2rem))]">
        <DialogHeader className="border-b border-border px-6 py-4">
          <DialogTitle>Pilih Item dari Database</DialogTitle>
        </DialogHeader>

        <div className="grid min-h-[min(380px,42vh)] flex-1 grid-cols-1 gap-0 md:grid-cols-2">
          <div className="flex min-h-[min(360px,38vh)] flex-col border-b border-border p-4 md:border-r md:border-b-0">
            <div className="mb-3 flex flex-wrap items-center gap-2">
              <div className="relative min-w-[140px] flex-1">
                <Search className="text-muted-foreground absolute left-2 top-1/2 size-4 -translate-y-1/2" />
                <Input
                  className="pl-8"
                  placeholder="Cari item…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
              <Select
                value={categoryFilter}
                onValueChange={setCategoryFilter}
              >
                <SelectTrigger className="w-[160px]">
                  <SelectValue placeholder="Kategori" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((c) => (
                    <SelectItem key={c} value={c}>
                      {c === "__all__" ? "Semua" : c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto rounded-md border border-border bg-muted/40 p-2">
              {loading ? (
                <p className="text-muted-foreground p-4 text-sm">Memuat…</p>
              ) : (
                groupedLeft.map(([cat, rows]) => (
                  <div key={cat} className="mb-4">
                    <p className="text-muted-foreground mb-2 text-[11px] font-semibold uppercase tracking-wide">
                      {cat}
                    </p>
                    <div className="space-y-1">
                      {rows.map((r) => {
                        const exists = existingKeys.has(
                          rowKey(r.sourceType, r.sourceId)
                        );
                        const disabled = exists;
                        return (
                          <label
                            key={r.key}
                            className={cn(
                              "flex cursor-pointer items-start gap-2 rounded-md border border-transparent px-2 py-1.5 text-sm hover:bg-white",
                              disabled && "cursor-not-allowed opacity-60"
                            )}
                          >
                            <Checkbox
                              checked={Boolean(checked[r.key])}
                              disabled={disabled}
                              onCheckedChange={(v) =>
                                !disabled &&
                                toggle(r.key, r, Boolean(v))
                              }
                              className="mt-0.5"
                            />
                            <span className="min-w-0 flex-1">
                              <span className="font-medium text-foreground">
                                {r.title}
                              </span>
                              <span className="text-muted-foreground block text-xs">
                                {r.subtitle} · {r.priceLabel}
                                {exists ? (
                                  <span className="text-amber-700">
                                    {" "}
                                    (sudah ada)
                                  </span>
                                ) : null}
                              </span>
                            </span>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="flex min-h-[min(360px,38vh)] flex-col p-4">
            <p className="mb-2 text-sm font-medium text-foreground">
              Item terpilih ({selectedRows.length})
            </p>
            {!lockGroupId ? (
              <div className="mb-3 space-y-1">
                <Label className="text-xs">Tambahkan ke grup</Label>
                <Select
                  value={selectedGroupId}
                  onValueChange={selectGroupValue}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Pilih grup" />
                  </SelectTrigger>
                  <SelectContent>
                    {groups.map((g) => (
                      <SelectItem key={g.id} value={g.id}>
                        {g.name}
                      </SelectItem>
                    ))}
                    {onCreateGroup ? (
                      <SelectItem
                        value="__create__"
                        className="text-muted-foreground"
                      >
                        + Buat grup baru…
                      </SelectItem>
                    ) : null}
                  </SelectContent>
                </Select>
              </div>
            ) : null}

            <div className="min-h-0 flex-1 space-y-2 overflow-y-auto rounded-md border border-border p-2">
              {selectedRows.length === 0 ? (
                <p className="text-muted-foreground p-4 text-sm">
                  Centang item di kiri, lalu isi qty.
                </p>
              ) : (
                selectedRows.map((r) => (
                  <div
                    key={r.key}
                    className="flex flex-col gap-2 rounded-md border border-border bg-card px-3 py-2.5 text-sm sm:flex-row sm:items-end sm:justify-between"
                  >
                    <span className="min-w-0 font-medium leading-snug text-foreground">
                      {r.title}
                    </span>
                    <div className="flex shrink-0 flex-wrap items-center gap-2 sm:justify-end">
                      <Label className="text-xs text-muted-foreground">
                        Qty
                      </Label>
                      <Input
                        className="h-8 w-24 text-right font-mono text-sm tabular-nums"
                        type="number"
                        min={0}
                        step="any"
                        value={qtyByKey[r.key] ?? ""}
                        onChange={(e) =>
                          setQtyByKey((prev) => ({
                            ...prev,
                            [r.key]: e.target.value,
                          }))
                        }
                      />
                      <span className="text-xs text-muted-foreground">
                        {r.uom}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        <DialogFooter className="border-t border-border px-6 py-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Batal
          </Button>
          <Button
            disabled={!canSubmit || submitting || groups.length === 0}
            onClick={() => void handleConfirm()}
          >
            Tambahkan ke Costing
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
