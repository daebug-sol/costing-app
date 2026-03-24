"use client";

import { FileText, ListFilter, Loader2, Plus, Search, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { formatIDR } from "@/lib/utils/format";
import { groupByMonthAndDay } from "@/lib/group-by-month-day";

export type QuotationListRow = {
  id: string;
  noSurat: string | null;
  perihal: string | null;
  tanggal: string;
  status: string;
  grandTotal: number;
};

type Props = {
  quotations: QuotationListRow[];
  onCreate: () => void;
  onOpen: (id: string) => void;
  creating?: boolean;
  selectMode: boolean;
  onSelectModeChange: (v: boolean) => void;
  selectedIds: Set<string>;
  onToggleSelect: (id: string, checked: boolean) => void;
  onDeleteSelected: () => void;
  deleting?: boolean;
  search: string;
  onSearchChange: (v: string) => void;
  statusFilter: "all" | "draft" | "final" | "approved";
  onStatusFilterChange: (v: "all" | "draft" | "final" | "approved") => void;
  monthFilter: string;
  onMonthFilterChange: (v: string) => void;
  availableMonths: { value: string; label: string }[];
  dateFilter: string;
  onDateFilterChange: (v: string) => void;
};

function fmtListDate(iso: string) {
  try {
    return new Date(iso).toLocaleDateString("id-ID", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  } catch {
    return "—";
  }
}

export function DocumentationListView({
  quotations,
  onCreate,
  onOpen,
  creating = false,
  selectMode,
  onSelectModeChange,
  selectedIds,
  onToggleSelect,
  onDeleteSelected,
  deleting = false,
  search,
  onSearchChange,
  statusFilter,
  onStatusFilterChange,
  monthFilter,
  onMonthFilterChange,
  availableMonths,
  dateFilter,
  onDateFilterChange,
}: Props) {
  const groups = groupByMonthAndDay(quotations, (q) => new Date(q.tanggal));

  return (
    <div className="mx-auto max-w-3xl space-y-6 px-4 py-8 sm:px-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">
            Penawaran
          </h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Daftar dokumen penawaran — grup per bulan & tanggal.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            variant={selectMode ? "secondary" : "outline"}
            size="sm"
            onClick={() => {
              onSelectModeChange(!selectMode);
            }}
          >
            {selectMode ? "Selesai pilih" : "Pilih file"}
          </Button>
          {selectMode && selectedIds.size > 0 ? (
            <Button
              type="button"
              variant="destructive"
              size="sm"
              className="gap-1"
              disabled={deleting}
              onClick={() => onDeleteSelected()}
            >
              {deleting ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Trash2 className="size-4" />
              )}
              Hapus ({selectedIds.size})
            </Button>
          ) : null}
          <Button
            type="button"
            className="gap-2 shrink-0"
            disabled={creating}
            onClick={onCreate}
          >
            {creating ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Plus className="size-4" />
            )}
            Create quotation
          </Button>
        </div>
      </div>

      <div className="bg-card rounded-lg border border-border p-3">
        <div className="relative">
          <Search className="text-muted-foreground absolute left-3 top-1/2 size-4 -translate-y-1/2" />
          <Input
            placeholder="Cari nama / nomor surat / perihal…"
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            className="h-9 pl-9 pr-10"
          />
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="text-muted-foreground absolute right-0.5 top-1/2 size-8 -translate-y-1/2"
                aria-label="Filter penawaran"
              >
                <ListFilter className="size-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-72 p-3" align="end">
              <div className="space-y-3">
                <div className="space-y-1">
                  <Label className="text-xs">Status approval</Label>
                  <Select
                    value={statusFilter}
                    onValueChange={(v) =>
                      onStatusFilterChange(v as "all" | "draft" | "final" | "approved")
                    }
                  >
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Semua</SelectItem>
                      <SelectItem value="draft">Draft</SelectItem>
                      <SelectItem value="final">Final</SelectItem>
                      <SelectItem value="approved">Approved</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Bulan file</Label>
                  <Select
                    value={monthFilter || "all"}
                    onValueChange={(v) => onMonthFilterChange(v === "all" ? "" : v)}
                  >
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue placeholder="Semua bulan" />
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
                  <Label className="text-xs">Tanggal file</Label>
                  <Input
                    type="date"
                    className="h-8 text-xs"
                    value={dateFilter}
                    onChange={(e) => onDateFilterChange(e.target.value)}
                  />
                </div>
              </div>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {quotations.length === 0 ? (
        <Card className="border-dashed border-border bg-muted/40">
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <div className="bg-muted mb-4 flex size-14 items-center justify-center rounded-full">
              <FileText className="text-muted-foreground size-7" />
            </div>
            <p className="text-foreground font-medium">Tidak ada penawaran</p>
            <p className="text-muted-foreground mt-1 max-w-sm text-sm">
              Ubah filter atau klik{" "}
              <span className="font-medium text-foreground">Create quotation</span>.
            </p>
            <Button
              type="button"
              className="mt-6 gap-2"
              disabled={creating}
              onClick={onCreate}
            >
              {creating ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Plus className="size-4" />
              )}
              Create quotation
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-8">
          <p className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
            File ({quotations.length})
          </p>
          {groups.map((month) => (
            <div key={month.monthKey}>
              <h2 className="text-muted-foreground mb-3 border-b border-border pb-1 text-sm font-semibold tracking-wide uppercase">
                {month.monthLabel}
              </h2>
              <div className="space-y-6">
                {month.days.map((day) => (
                  <div key={day.dayKey}>
                    <p className="text-xs font-medium text-muted-foreground mb-2">{day.dayLabel}</p>
                    <ul className="space-y-2">
                      {day.items.map((q) => {
                        const checked = selectedIds.has(q.id);
                        return (
                          <li key={q.id} className="flex items-stretch gap-2">
                            {selectMode ? (
                              <div className="flex shrink-0 items-center pt-3">
                                <Checkbox
                                  checked={checked}
                                  onCheckedChange={(v) =>
                                    onToggleSelect(q.id, v === true)
                                  }
                                  aria-label="Pilih penawaran"
                                />
                              </div>
                            ) : null}
                            <button
                              type="button"
                              onClick={() => {
                                if (selectMode) {
                                  onToggleSelect(q.id, !checked);
                                } else {
                                  onOpen(q.id);
                                }
                              }}
                              className="bg-card border-border hover:bg-muted/50 flex min-w-0 flex-1 items-center gap-4 rounded-lg border px-4 py-3 text-left transition"
                            >
                              <div className="bg-primary/8 flex size-10 shrink-0 items-center justify-center rounded-md">
                                <FileText className="text-primary size-5" />
                              </div>
                              <div className="min-w-0 flex-1">
                                <div className="truncate font-medium text-foreground">
                                  {q.noSurat?.trim() ||
                                    q.perihal?.trim() ||
                                    "Tanpa nomor surat"}
                                </div>
                                <div className="text-muted-foreground mt-0.5 flex flex-wrap gap-x-3 text-xs">
                                  <span>{fmtListDate(q.tanggal)}</span>
                                  <span className="capitalize">{q.status}</span>
                                </div>
                              </div>
                              <div className="text-right text-sm font-medium tabular-nums text-emerald-800">
                                {formatIDR(q.grandTotal)}
                              </div>
                            </button>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
