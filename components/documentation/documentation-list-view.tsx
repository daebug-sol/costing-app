"use client";

import { useI18n } from "@/components/i18n-provider";
import {
  ChevronDown,
  FileText,
  FolderOpen,
  ListFilter,
  Loader2,
  Plus,
  Search,
  Trash2,
  X,
} from "lucide-react";
import { O2cProgressBar } from "@/components/documentation/o2c-progress-bar";
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
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  ExplorerItem,
  ExplorerItems,
  ExplorerViewControls,
  useExplorerView,
} from "@/components/file-explorer";
import { PageShell } from "@/components/page-shell";
import {
  computeProjectProgress,
  type QuotationWithChain,
} from "@/lib/o2c/project-progress";
import { quotationStatusLabel } from "@/lib/o2c/status";
import { formatIDR } from "@/lib/utils/format";
import { cn } from "@/lib/utils";

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

  const [view, setView] = useExplorerView();

  const renderFile = (q: QuotationListRow) => {
    const checked = selectedIds.has(q.id);
    const expanded = expandedId === q.id;
    const title = q.noSurat?.trim() || q.perihal?.trim() || "Tanpa nomor surat";
    const big = view.mode === "grid" && view.size === "lg";

    return (
      <ExplorerItem
        key={q.id}
        view={view}
        title={title}
        ariaLabel={
          selectMode
            ? `Pilih ${title}`
            : expanded
              ? `Buka tahap terbaru: ${title}`
              : `Perluas progres: ${title}`
        }
        ariaExpanded={!selectMode ? expanded : undefined}
        selected={selectMode && checked}
        highlighted={expanded && !selectMode}
        onClick={() => {
          if (selectMode) onToggleSelect(q.id, !checked);
          else if (expanded) onOpenLatest(q.id);
          else onToggleExpand(q.id);
        }}
        lead={
          selectMode ? (
            <Checkbox
              checked={checked}
              onCheckedChange={(v) => onToggleSelect(q.id, v === true)}
              onClick={(e) => e.stopPropagation()}
              aria-label={`Pilih ${title}`}
              className="shrink-0"
            />
          ) : (
            <span
              className={cn(
                "bg-primary/10 flex shrink-0 items-center justify-center rounded-md",
                big ? "size-12" : "size-9",
              )}
            >
              <FileText
                className={cn("text-primary", big ? "size-6" : "size-4")}
              />
            </span>
          )
        }
        meta={
          <>
            <span className="whitespace-nowrap">{fmtListDate(q.tanggal)}</span>
            <span className="whitespace-nowrap">
              {quotationStatusLabel(q.status)}
            </span>
          </>
        }
        trailing={formatIDR(q.grandTotal)}
        action={
          !selectMode ? (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="my-auto mr-2 size-8 shrink-0"
              aria-label={expanded ? "Ciutkan proyek" : "Perluas proyek"}
              aria-expanded={expanded}
              onClick={() => onToggleExpand(q.id)}
            >
              <ChevronDown
                className={cn(
                  "text-muted-foreground size-4 transition-transform duration-200",
                  expanded && "rotate-180",
                )}
              />
            </Button>
          ) : null
        }
        footer={
          expanded && !selectMode ? (
            <div className="border-border bg-muted/20 border-t px-3 py-3">
              <O2cProgressBar progress={computeProjectProgress(q)} />
            </div>
          ) : null
        }
      />
    );
  };

  return (
    <PageShell
      title="Penawaran"
      contentClassName="gap-4"
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
          {t("common.createQuotation")}
        </Button>
      }
    >
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-[12rem] flex-1 sm:max-w-md">
          <Search className="text-muted-foreground absolute top-1/2 left-3 size-4 -translate-y-1/2" />
          <Input
            placeholder="Cari nama / nomor surat / perihal…"
            aria-label="Cari penawaran"
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            className="h-9 pr-10 pl-9"
          />
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="text-muted-foreground absolute top-1/2 right-0.5 size-8 -translate-y-1/2"
                aria-label="Filter penawaran"
              >
                <ListFilter className="size-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-72 p-3" align="end">
              <div className="flex flex-col gap-3">
                <div className="flex flex-col gap-1">
                  <Label className="text-xs">Status approval</Label>
                  <Select
                    value={statusFilter}
                    onValueChange={(v) =>
                      onStatusFilterChange(
                        v as
                          | "all"
                          | "draft"
                          | "sent"
                          | "won"
                          | "lost"
                          | "final"
                          | "approved",
                      )
                    }
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
                    onValueChange={(v) =>
                      onMonthFilterChange(v === "all" ? "" : v)
                    }
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
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        <div className="ml-auto">
          <ExplorerViewControls view={view} onChange={setView} />
        </div>
      </div>

      {selectMode ? (
        <div
          className="border-primary/25 bg-primary/[0.06] flex flex-wrap items-center justify-between gap-3 rounded-md border px-3 py-2.5 sm:px-4"
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
      ) : null}

      {projectCount === 0 ? (
        <Card className="border-border bg-muted/40 border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <div className="bg-muted mb-4 flex size-14 items-center justify-center rounded-full">
              <FileText className="text-muted-foreground size-7" />
            </div>
            <p className="text-foreground font-medium">Tidak ada penawaran</p>
            <p className="text-muted-foreground mt-1 max-w-sm text-sm">
              Ubah filter atau klik{" "}
              <span className="text-foreground font-medium">
                {t("common.createQuotation")}
              </span>
              .
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
              {t("common.createQuotation")}
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="flex flex-col gap-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
              Pelanggan ({folders.length}) · Proyek ({projectCount})
            </p>
            {!selectMode ? (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="text-muted-foreground hover:text-primary h-8 tracking-normal normal-case"
                onClick={() => onSelectModeChange(true)}
              >
                Pilih file
              </Button>
            ) : null}
          </div>

          <Accordion
            type="multiple"
            defaultValue={folders.slice(0, 3).map((f) => f.key)}
          >
            {folders.map((folder) => (
              <AccordionItem key={folder.key} value={folder.key}>
                <AccordionTrigger className="px-1 hover:no-underline">
                  <span className="flex min-w-0 flex-1 items-center gap-3">
                    <FolderOpen className="text-primary size-5 shrink-0" />
                    <span className="text-foreground truncate font-medium">
                      {folder.name}
                    </span>
                    <span className="text-muted-foreground ml-auto shrink-0 pr-2 text-xs font-normal">
                      {folder.projects.length} proyek ·{" "}
                      <span className="tabular-nums">
                        {formatIDR(folder.totalValue)}
                      </span>
                    </span>
                  </span>
                </AccordionTrigger>
                <AccordionContent className="pb-4">
                  <ExplorerItems view={view}>
                    {folder.projects.map(renderFile)}
                  </ExplorerItems>
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      )}
    </PageShell>
  );
}
