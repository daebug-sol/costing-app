"use client";

import { useState } from "react";
import { FolderKanban } from "lucide-react";
import { Explorer, ExplorerRow } from "@/components/file-explorer";
import { useI18n } from "@/components/i18n-provider";
import { Button } from "@/components/ui/button";
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
import { formatIDR, formatNumber, formatRpShort } from "@/lib/utils/format";
import type { CostingWorkspaceState } from "./use-costing-workspace";

const NO_CUSTOMER = "__none__";

export function CostingProjectList({ ed }: { ed: CostingWorkspaceState }) {
  const { t } = useI18n();
  const {
    projects,
    isLoading,
    search,
    statusFilter,
    monthFilter,
    dateFilter,
    setCostingSidebar,
    setNewOpen,
    availableMonths,
    filteredProjects,
    statusBadge,
  } = ed;
  const [folderKey, setFolderKey] = useState<string | null>(null);

  const filtersActive =
    statusFilter !== "all" || monthFilter !== "" || dateFilter !== "";

  const keyOf = (name: string | null | undefined) =>
    name?.trim() || NO_CUSTOMER;
  const folderMap = new Map<string, { label: string; count: number }>();
  for (const p of filteredProjects) {
    const key = keyOf(p.customerName);
    const cur = folderMap.get(key);
    if (cur) cur.count += 1;
    else
      folderMap.set(key, {
        label: key === NO_CUSTOMER ? t("explorer.noCustomer") : key,
        count: 1,
      });
  }
  const folders = [...folderMap.entries()]
    .map(([key, v]) => ({ key, ...v }))
    .sort((a, b) =>
      a.key === NO_CUSTOMER
        ? 1
        : b.key === NO_CUSTOMER
          ? -1
          : a.label.localeCompare(b.label, "id"),
    );
  const rows = folderKey
    ? filteredProjects.filter((p) => keyOf(p.customerName) === folderKey)
    : filteredProjects;

  const filterContent = (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-1">
        <Label className="text-xs">{t("costing.list.filter.status")}</Label>
        <Select
          value={statusFilter}
          onValueChange={(v) =>
            setCostingSidebar({
              statusFilter: v as "all" | "draft" | "finalized",
            })
          }
        >
          <SelectTrigger className="h-8 w-full text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">
              {t("costing.list.filter.statusAll")}
            </SelectItem>
            <SelectItem value="draft">Draft</SelectItem>
            <SelectItem value="finalized">Final</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="flex flex-col gap-1">
        <Label className="text-xs">{t("costing.list.filter.month")}</Label>
        <Select
          value={monthFilter || "all"}
          onValueChange={(v) =>
            setCostingSidebar({ monthFilter: v === "all" ? "" : v })
          }
        >
          <SelectTrigger className="h-8 w-full text-xs">
            <SelectValue placeholder={t("costing.list.filter.monthAll")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">
              {t("costing.list.filter.monthAll")}
            </SelectItem>
            {availableMonths.map((m) => (
              <SelectItem key={m.value} value={m.value}>
                {m.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="flex flex-col gap-1">
        <Label className="text-xs">{t("costing.list.filter.date")}</Label>
        <Input
          type="date"
          className="h-8 text-xs"
          value={dateFilter}
          onChange={(e) => setCostingSidebar({ dateFilter: e.target.value })}
        />
      </div>
      {filtersActive ? (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-8"
          onClick={() =>
            setCostingSidebar({
              statusFilter: "all",
              monthFilter: "",
              dateFilter: "",
            })
          }
        >
          {t("costing.list.resetFilters")}
        </Button>
      ) : null}
    </div>
  );

  let panelBody: React.ReactNode;
  if (isLoading && projects.length === 0) {
    panelBody = (
      <div className="space-y-3 p-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-10 w-full" />
        ))}
      </div>
    );
  } else if (rows.length === 0) {
    panelBody = (
      <div className="flex flex-col items-center justify-center px-4 py-16 text-center">
        <FolderKanban
          className="text-muted-foreground mb-3 size-7"
          aria-hidden
        />
        <p className="text-foreground text-sm font-medium">
          {projects.length === 0
            ? t("costing.list.empty.title")
            : t("costing.list.noMatch")}
        </p>
        {projects.length === 0 ? (
          <Button
            type="button"
            className="mt-4"
            onClick={() => setNewOpen(true)}
          >
            {t("costing.list.newProject")}
          </Button>
        ) : null}
      </div>
    );
  }

  return (
    <Explorer
      title="Costing"
      primaryLabel={t("costing.list.newProject")}
      onPrimary={() => setNewOpen(true)}
      searchPlaceholder={t("costing.list.searchPlaceholder")}
      search={search}
      onSearchChange={(v) => setCostingSidebar({ search: v })}
      filterContent={filterContent}
      filterActive={filtersActive}
      allLabel={t("explorer.costing.all")}
      folderHeading={t("explorer.customers")}
      noun={t("explorer.costing.noun")}
      folders={folders}
      totalCount={filteredProjects.length}
      selectedKey={folderKey}
      onSelectKey={setFolderKey}
      panelBody={panelBody}
    >
      {rows.map((p) => (
        <ExplorerRow
          key={p.id}
          href={`/costing?project=${encodeURIComponent(p.id)}`}
          icon={<FolderKanban className="size-5" aria-hidden />}
          title={p.name}
          amount={p.totalSelling > 0 ? formatIDR(p.totalSelling) : undefined}
          amountCompact={
            p.totalSelling > 0 ? formatRpShort(p.totalSelling) : undefined
          }
          meta={
            <>
              <span>
                {p.previewAhuModel ?? "—"}
                {p.previewFlowCMH != null
                  ? ` · ${formatNumber(p.previewFlowCMH, 0)} CMH`
                  : ""}
              </span>
              <span>
                {new Date(p.updatedAt).toLocaleDateString("id-ID", {
                  day: "numeric",
                  month: "short",
                })}
              </span>
              {statusBadge(p.status)}
            </>
          }
        />
      ))}
    </Explorer>
  );
}
