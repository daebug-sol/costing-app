"use client";

import { FileText, ListFilter, Loader2, Plus, Search, Trash2, X } from "lucide-react";
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
import { PageShell } from "@/components/page-shell";
import { formatIDR } from "@/lib/utils/format";
import { groupByMonthAndDay } from "@/lib/group-by-month-day";
import { cn } from "@/lib/utils";

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
  onSelectAll: () => void;
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
  onSelectAll,
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
  const selectedCount = selectedIds.size;
  const allVisibleSelected =
    quotations.length > 0 && quotations.every((q) => selectedIds.has(q.id));

  return (
    <PageShell
      width="doc"
      eyebrow="Dokumentasi"
      title="Penawaran"
      description="Daftar dokumen penawaran — grup per bulan & tanggal."
      contentClassName="py-8"
      actions={
        <Button
          type="button"
          className="shrink-0 gap-2"
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
      }
    >
      <div className="bg-card rounded-lg border border-border p-4 shadow-sm sm:p-5">
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

      {selectMode ? (
        <div
          className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-primary/25 bg-primary/[0.06] px-3 py-2.5 sm:px-4"
          role="status"
          aria-live="polite"
        >
          <p className="text-sm text-foreground">
            {selectedCount === 0 ? (
              <span className="text-muted-foreground">Ketuk file untuk memilih</span>
            ) : (
              <>
                <span className="font-medium tabular-nums">{selectedCount}</span>{" "}
                file dipilih
              </>
            )}
          </p>
          <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
            {quotations.length > 0 ? (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-8 tracking-normal normal-case"
                onClick={() => {
                  if (allVisibleSelected) {
                    quotations.forEach((q) => onToggleSelect(q.id, false));
                  } else {
                    onSelectAll();
                  }
                }}
              >
                {allVisibleSelected ? "Batalkan semua" : "Pilih semua"}
              </Button>
            ) : null}
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-8 gap-1 tracking-normal normal-case"
              onClick={() => onSelectModeChange(false)}
            >
              <X className="size-3.5" />
              Batal
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-8 gap-1 border-destructive/35 text-destructive tracking-normal normal-case hover:bg-destructive/10 hover:text-destructive"
              disabled={selectedCount === 0 || deleting}
              onClick={() => onDeleteSelected()}
            >
              {deleting ? (
                <Loader2 className="size-3.5 animate-spin" />
              ) : (
                <Trash2 className="size-3.5" />
              )}
              Hapus
            </Button>
          </div>
        </div>
      ) : null}

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
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
              File ({quotations.length})
            </p>
            {!selectMode ? (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-8 text-muted-foreground tracking-normal normal-case hover:text-primary"
                onClick={() => onSelectModeChange(true)}
              >
                Pilih file
              </Button>
            ) : null}
          </div>
          {groups.map((month) => (
            <div key={month.monthKey}>
              <h2 className="text-muted-foreground mb-3 border-b border-border pb-1 text-sm font-semibold tracking-wide uppercase">
                {month.monthLabel}
              </h2>
              <div className="space-y-6">
                {month.days.map((day) => (
                  <div key={day.dayKey}>
                    <p className="text-muted-foreground mb-2 text-xs font-medium">{day.dayLabel}</p>
                    <ul className="space-y-2">
                      {day.items.map((q) => {
                        const checked = selectedIds.has(q.id);
                        return (
                          <li key={q.id}>
                            <button
                              type="button"
                              onClick={() => {
                                if (selectMode) {
                                  onToggleSelect(q.id, !checked);
                                } else {
                                  onOpen(q.id);
                                }
                              }}
                              className={cn(
                                "bg-card flex w-full min-w-0 items-center gap-3 rounded-lg border px-3 py-3.5 text-left transition-[background-color,border-color,box-shadow] duration-150 sm:gap-4 sm:px-4 sm:py-4",
                                selectMode
                                  ? checked
                                    ? "border-primary/45 bg-primary/[0.07] shadow-sm ring-1 ring-primary/20"
                                    : "border-border hover:border-primary/30 hover:bg-muted/30"
                                  : "border-border hover:bg-muted/40"
                              )}
                            >
                              {selectMode ? (
                                <Checkbox
                                  checked={checked}
                                  onCheckedChange={(v) => onToggleSelect(q.id, v === true)}
                                  onClick={(e) => e.stopPropagation()}
                                  aria-label={`Pilih ${q.perihal ?? q.noSurat ?? "penawaran"}`}
                                  className="shrink-0"
                                />
                              ) : (
                                <div className="bg-primary/10 flex size-10 shrink-0 items-center justify-center rounded-md">
                                  <FileText className="text-primary size-5" />
                                </div>
                              )}
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
                              <div className="shrink-0 text-right text-sm font-medium tabular-nums text-foreground">
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
    </PageShell>
  );
}
