"use client";

import { useState } from "react";
import { useI18n } from "@/components/i18n-provider";
import {
  ChevronDown,
  FileText,
  Loader2,
  Plus,
  Trash2,
  X,
} from "lucide-react";
import { O2cProgressBar } from "@/components/documentation/o2c-progress-bar";
import { Button } from "@/components/ui/button";
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
import { Explorer, ExplorerRow } from "@/components/file-explorer";
import { Badge } from "@/components/ui/badge";
import {
  computeProjectProgress,
  type QuotationWithChain,
} from "@/lib/o2c/project-progress";
import { quotationStatusLabel } from "@/lib/o2c/status";
import { tourEvent } from "@/lib/tour/events";
import { formatIDR, formatRpShort } from "@/lib/utils/format";

export type QuotationListRow = QuotationWithChain & {
  perihal: string | null;
  tanggal: string;
  grandTotal: number;
  updatedAt?: string;
};

export type CustomerFolder = {
  key: string;
  name: string;
  projects: QuotationListRow[];
  totalValue: number;
};

type Props = {
  folders: CustomerFolder[];
  expandedId: string | null;
  onToggleExpand: (id: string) => void;
  onOpenLatest: (id: string) => void;
  onCreate: () => void;
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
  statusFilter:
    | "all"
    | "draft"
    | "sent"
    | "won"
    | "lost"
    | "final"
    | "approved";
  onStatusFilterChange: (
    v: "all" | "draft" | "sent" | "won" | "lost" | "final" | "approved",
  ) => void;
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
  folders,
  expandedId,
  onToggleExpand,
  onOpenLatest,
  onCreate,
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
  const { t } = useI18n();
  const allProjects = folders.flatMap((f) => f.projects);
  const projectCount = allProjects.length;
  const selectedCount = selectedIds.size;
  const allVisibleSelected =
    projectCount > 0 && allProjects.every((q) => selectedIds.has(q.id));
  const [folderKey, setFolderKey] = useState<string | null>(null);
  const activeFolder = folders.find((f) => f.key === folderKey) ?? null;
  const rows = activeFolder
    ? activeFolder.projects
    : [...allProjects].sort(
        (a, b) => new Date(b.tanggal).getTime() - new Date(a.tanggal).getTime(),
      );
  const filtersActive =
    statusFilter !== "all" || monthFilter !== "" || dateFilter !== "";

  const filterContent = (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-1">
        <Label className="text-xs">Status approval</Label>
        <Select
          value={statusFilter}
          onValueChange={(v) => onStatusFilterChange(v as typeof statusFilter)}
        >
          <SelectTrigger className="h-8 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Semua</SelectItem>
            <SelectItem value="draft">Draft</SelectItem>
            <SelectItem value="sent">Terkirim</SelectItem>
            <SelectItem value="won">Menang</SelectItem>
            <SelectItem value="lost">Kalah</SelectItem>
            <SelectItem value="final">Final</SelectItem>
            <SelectItem value="approved">Disetujui</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="flex flex-col gap-1">
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
      <div className="flex flex-col gap-1">
        <Label className="text-xs">Tanggal file</Label>
        <Input
          type="date"
          className="h-8 text-xs"
          value={dateFilter}
          onChange={(e) => onDateFilterChange(e.target.value)}
        />
      </div>
    </div>
  );

  return (
    <Explorer
      title="Penawaran"
      primaryLabel={t("common.createQuotation")}
      onPrimary={onCreate}
      primaryBusy={creating}
      searchPlaceholder={t("explorer.documentation.search")}
      search={search}
      onSearchChange={onSearchChange}
      filterContent={filterContent}
      filterActive={filtersActive}
      allLabel={t("explorer.documentation.all")}
      folderHeading={t("explorer.customers")}
      noun={t("explorer.documentation.noun")}
      folders={folders.map((f) => ({
        key: f.key,
        label: f.name,
        count: f.projects.length,
      }))}
      totalCount={projectCount}
      selectedKey={folderKey}
      onSelectKey={(key) => {
        setFolderKey(key);
        tourEvent("documentation.folder-opened");
      }}
      tourPrefix="documentation"
      panelActions={
        projectCount > 0 && !selectMode ? (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="text-muted-foreground hover:text-primary h-7 tracking-normal normal-case"
            onClick={() => onSelectModeChange(true)}
          >
            {t("explorer.selectFiles")}
          </Button>
        ) : null
      }
      panelNotice={
        selectMode ? (
          <div
            className="border-primary/25 bg-primary/[0.06] flex flex-wrap items-center justify-between gap-3 rounded-md border px-3 py-2.5"
            role="status"
            aria-live="polite"
          >
            <p className="text-foreground text-sm">
              {selectedCount === 0 ? (
                <span className="text-muted-foreground">
                  Ketuk file untuk memilih
                </span>
              ) : (
                <>
                  <span className="font-medium tabular-nums">
                    {selectedCount}
                  </span>{" "}
                  file dipilih
                </>
              )}
            </p>
            <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
              {projectCount > 0 ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-8 tracking-normal normal-case"
                  onClick={() => {
                    if (allVisibleSelected) {
                      allProjects.forEach((q) => onToggleSelect(q.id, false));
                    } else {
                      onSelectAll();
                    }
                  }}
                >
                  {allVisibleSelected
                    ? t("explorer.deselectAll")
                    : t("explorer.selectAll")}
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
                className="border-destructive/35 text-destructive hover:bg-destructive/10 hover:text-destructive h-8 gap-1 tracking-normal normal-case"
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
        ) : null
      }
      panelBody={
        rows.length === 0 ? (
          <div className="flex flex-col items-center justify-center px-4 py-16 text-center">
            <FileText
              className="text-muted-foreground mb-3 size-7"
              aria-hidden
            />
            <p className="text-foreground text-sm font-medium">
              Tidak ada penawaran
            </p>
            <Button
              type="button"
              className="mt-4 gap-2"
              disabled={creating}
              onClick={onCreate}
            >
              <Plus className="size-4" />
              {t("common.createQuotation")}
            </Button>
          </div>
        ) : undefined
      }
    >
      {rows.map((q, index) => {
        const checked = selectedIds.has(q.id);
        const expanded = expandedId === q.id;
        const title =
          q.noSurat?.trim() || q.perihal?.trim() || "Tanpa nomor surat";
        return (
          <ExplorerRow
            key={q.id}
            icon={<FileText className="size-5" aria-hidden />}
            title={
              q.perihal?.trim() && q.noSurat?.trim()
                ? `${q.noSurat} · ${q.perihal}`
                : title
            }
            amount={formatIDR(q.grandTotal)}
            amountCompact={formatRpShort(q.grandTotal)}
            meta={
              <>
                <span>{fmtListDate(q.tanggal)}</span>
                <Badge variant="secondary" className="uppercase">
                  {quotationStatusLabel(q.status)}
                </Badge>
              </>
            }
            ariaLabel={
              selectMode
                ? `Pilih ${title}`
                : expanded
                  ? `Buka tahap terbaru: ${title}`
                  : `Perluas progres: ${title}`
            }
            ariaExpanded={!selectMode ? expanded : undefined}
            selected={selectMode && checked}
            dataTour={
              (expandedId ? expanded : index === 0)
                ? "documentation.quote-row"
                : undefined
            }
            onClick={() => {
              if (selectMode) onToggleSelect(q.id, !checked);
              else if (expanded) onOpenLatest(q.id);
              else {
                onToggleExpand(q.id);
                tourEvent("documentation.quote-expanded");
              }
            }}
            lead={
              selectMode ? (
                <span className="flex size-10 shrink-0 items-center justify-center">
                  <Checkbox
                    checked={checked}
                    onCheckedChange={(v) => onToggleSelect(q.id, v === true)}
                    onClick={(e) => e.stopPropagation()}
                    aria-label={`Pilih ${title}`}
                  />
                </span>
              ) : undefined
            }
            trailing={
              expanded && !selectMode ? (
                <ChevronDown
                  className="text-muted-foreground size-4 shrink-0"
                  aria-hidden
                />
              ) : undefined
            }
            footer={
              expanded && !selectMode ? (
                <div className="border-border bg-muted/20 border-t px-4 py-3">
                  <O2cProgressBar progress={computeProjectProgress(q)} />
                </div>
              ) : null
            }
          />
        );
      })}
    </Explorer>
  );
}
