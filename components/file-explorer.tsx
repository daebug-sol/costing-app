"use client";

import Link from "next/link";
import { useState, type ReactNode } from "react";
import { useI18n } from "@/components/i18n-provider";
import {
  ChevronLeft,
  ChevronRight,
  Folder,
  Layers,
  Loader2,
  Plus,
  Search,
  SlidersHorizontal,
} from "lucide-react";
import { PageShell } from "@/components/page-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

/**
 * The one file-explorer pattern used by Costing, Documentation and Database:
 * title + primary action, search + Filter, a folder sidebar (folder list first
 * on mobile) and a list panel whose rows are all `ExplorerRow`.
 */

export type ExplorerFolder = { key: string; label: string; count: number };

const rowClass =
  "focus-visible:ring-ring flex w-full min-w-0 items-center gap-3 px-4 py-3 text-left hover:bg-muted/40 focus-visible:ring-2 focus-visible:outline-none";

export function ExplorerRow({
  icon,
  lead,
  title,
  meta,
  amount,
  amountCompact,
  href,
  onClick,
  ariaLabel,
  ariaExpanded,
  selected,
  trailing,
  footer,
}: {
  /** File icon shown in the 40px tile. */
  icon?: ReactNode;
  /** Replaces the tile (e.g. a checkbox while selecting). */
  lead?: ReactNode;
  title: string;
  /** Meta line: date, status badge, ... */
  meta?: ReactNode;
  /** Right-aligned amount from `sm` up. */
  amount?: string;
  /** Short amount shown in the meta line below `sm`. */
  amountCompact?: string;
  href?: string;
  onClick?: () => void;
  ariaLabel?: string;
  ariaExpanded?: boolean;
  selected?: boolean;
  /** Replaces the default chevron. */
  trailing?: ReactNode;
  footer?: ReactNode;
}) {
  const body = (
    <>
      {lead ?? (
        <span className="bg-muted text-foreground flex size-10 shrink-0 items-center justify-center rounded-lg">
          {icon}
        </span>
      )}
      <span className="min-w-0 flex-1">
        <span className="text-foreground line-clamp-2 block text-sm font-medium break-words">
          {title}
        </span>
        <span className="text-muted-foreground mt-0.5 flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1 text-xs">
          {amountCompact ? (
            <span className={cn(amount && "sm:hidden")}>{amountCompact}</span>
          ) : null}
          {meta}
        </span>
      </span>
      {amount ? (
        <span className="text-foreground hidden shrink-0 font-mono text-sm tabular-nums sm:block">
          {amount}
        </span>
      ) : null}
      {trailing ?? (
        <ChevronRight
          className="text-muted-foreground size-4 shrink-0"
          aria-hidden
        />
      )}
    </>
  );
  return (
    <li
      className={cn(
        "border-border border-b last:border-b-0",
        selected && "bg-primary/[0.07]",
      )}
    >
      {href ? (
        <Link href={href} className={rowClass} aria-label={ariaLabel}>
          {body}
        </Link>
      ) : onClick ? (
        <button
          type="button"
          onClick={onClick}
          className={rowClass}
          aria-label={ariaLabel}
          aria-expanded={ariaExpanded}
        >
          {body}
        </button>
      ) : (
        <div className={cn(rowClass, "hover:bg-transparent")}>{body}</div>
      )}
      {footer}
    </li>
  );
}

export function ExplorerToolbar({
  placeholder,
  search,
  onSearchChange,
  filterContent,
  filterActive,
}: {
  placeholder: string;
  search: string;
  onSearchChange: (v: string) => void;
  /** Contents of the Filter popover; no Filter button when omitted. */
  filterContent?: ReactNode;
  filterActive?: boolean;
}) {
  const { t } = useI18n();
  return (
    <div className="flex items-center gap-2">
      <div className="relative min-w-0 flex-1">
        <Search
          aria-hidden
          className="text-muted-foreground absolute top-1/2 left-3 size-4 -translate-y-1/2"
        />
        <Input
          aria-label={placeholder}
          placeholder={placeholder}
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          className="h-10 pl-9"
        />
      </div>
      {filterContent ? (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              type="button"
              variant="outline"
              className="h-10 shrink-0 gap-2"
              aria-label={t("explorer.filter")}
            >
              <SlidersHorizontal className="size-4" />
              {t("explorer.filter")}
              {filterActive ? (
                <span
                  className="bg-primary size-1.5 rounded-full"
                  aria-hidden
                />
              ) : null}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-72 p-3">
            {filterContent}
          </DropdownMenuContent>
        </DropdownMenu>
      ) : null}
    </div>
  );
}

/** Status badge used in explorer meta lines; `danger` is the red-outline OVERDUE style. */
export function ExplorerBadge({
  children,
  danger,
}: {
  children: ReactNode;
  danger?: boolean;
}) {
  return (
    <Badge
      variant={danger ? "outline" : "secondary"}
      className={cn(
        "uppercase",
        danger && "border-destructive text-destructive",
      )}
    >
      {children}
    </Badge>
  );
}

/**
 * Mobile-only list (below `md`) for modules whose desktop view stays a table:
 * toolbar, count line, then one card of `ExplorerRow`s.
 */
export function ExplorerMobileList({
  placeholder,
  search,
  onSearchChange,
  filterContent,
  filterActive,
  countLabel,
  empty,
  children,
}: {
  placeholder: string;
  search: string;
  onSearchChange: (v: string) => void;
  filterContent?: ReactNode;
  filterActive?: boolean;
  /** e.g. "32 sales order" */
  countLabel: string;
  /** Shown instead of the rows when there are none. */
  empty?: ReactNode;
  children?: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-3 md:hidden">
      <ExplorerToolbar
        placeholder={placeholder}
        search={search}
        onSearchChange={onSearchChange}
        filterContent={filterContent}
        filterActive={filterActive}
      />
      <p className="text-muted-foreground text-xs">{countLabel}</p>
      <div className="bg-card border-border overflow-hidden rounded-xl border">
        {empty ?? <ExplorerRows>{children}</ExplorerRows>}
      </div>
    </div>
  );
}

/** Round "+" in the title row, mobile only. */
export function ExplorerMobileAdd({
  label,
  onClick,
}: {
  label: string;
  onClick: () => void;
}) {
  return (
    <Button
      type="button"
      size="icon"
      className="size-10 rounded-full md:hidden"
      onClick={onClick}
      aria-label={label}
    >
      <Plus className="size-5" />
    </Button>
  );
}

export function ExplorerRows({ children }: { children: ReactNode }) {
  return <ul className="flex flex-col">{children}</ul>;
}

type ExplorerProps = {
  title: string;
  primaryLabel: string;
  onPrimary: () => void;
  primaryBusy?: boolean;
  searchPlaceholder: string;
  search: string;
  onSearchChange: (v: string) => void;
  /** Contents of the Filter popover. */
  filterContent: ReactNode;
  filterActive?: boolean;
  /** "Semua proyek" */
  allLabel: string;
  /** "PELANGGAN" */
  folderHeading: string;
  /** Singular noun for counts, e.g. "proyek" */
  noun: string;
  folders: ExplorerFolder[];
  totalCount: number;
  /** null = all folders */
  selectedKey: string | null;
  onSelectKey: (key: string | null) => void;
  /** Extra controls on the right of the list panel header (e.g. "Pilih"). */
  panelActions?: ReactNode;
  /** Rendered above the rows (e.g. the bulk-select bar). */
  panelNotice?: ReactNode;
  /** Replaces the rows (loading / empty). */
  panelBody?: ReactNode;
  children?: ReactNode;
};

export function Explorer({
  title,
  primaryLabel,
  onPrimary,
  primaryBusy,
  searchPlaceholder,
  search,
  onSearchChange,
  filterContent,
  filterActive,
  allLabel,
  folderHeading,
  noun,
  folders,
  totalCount,
  selectedKey,
  onSelectKey,
  panelActions,
  panelNotice,
  panelBody,
  children,
}: ExplorerProps) {
  const { t } = useI18n();
  const [mobileOpen, setMobileOpen] = useState(false);
  const selected = folders.find((f) => f.key === selectedKey) ?? null;
  const showItemsMobile = mobileOpen || search.trim() !== "";
  const visibleCount = selected ? selected.count : totalCount;

  const pick = (key: string | null) => {
    onSelectKey(key);
    setMobileOpen(true);
  };
  const toRoot = () => {
    onSelectKey(null);
    setMobileOpen(false);
  };

  const PrimaryIcon = primaryBusy ? Loader2 : Plus;

  return (
    <PageShell
      title={title}
      contentClassName="gap-4"
      inlineActions
      actions={
        <>
          <Button
            type="button"
            className="hidden gap-2 sm:inline-flex"
            disabled={primaryBusy}
            onClick={onPrimary}
          >
            <PrimaryIcon
              className={cn("size-4", primaryBusy && "animate-spin")}
            />
            {primaryLabel}
          </Button>
          <Button
            type="button"
            size="icon"
            className="size-10 rounded-full sm:hidden"
            disabled={primaryBusy}
            onClick={onPrimary}
            aria-label={primaryLabel}
          >
            <PrimaryIcon
              className={cn("size-5", primaryBusy && "animate-spin")}
            />
          </Button>
        </>
      }
    >
      <ExplorerToolbar
        placeholder={searchPlaceholder}
        search={search}
        onSearchChange={onSearchChange}
        filterContent={filterContent}
        filterActive={filterActive}
      />

      <div className="grid items-start gap-4 lg:grid-cols-[260px_minmax(0,1fr)]">
        {/* Desktop folder sidebar */}
        <nav
          aria-label={folderHeading}
          className="bg-card border-border hidden flex-col gap-0.5 rounded-xl border p-2 lg:flex"
        >
          <ExplorerSidebarItem
            active={selectedKey === null}
            icon={<Layers className="size-4" />}
            label={allLabel}
            count={totalCount}
            onClick={() => onSelectKey(null)}
          />
          <p className="text-muted-foreground px-3 pt-3 pb-1 text-xs font-medium tracking-wide uppercase">
            {folderHeading}
          </p>
          {folders.map((f) => (
            <ExplorerSidebarItem
              key={f.key}
              active={selectedKey === f.key}
              icon={<Folder className="size-4" />}
              label={f.label}
              count={f.count}
              onClick={() => onSelectKey(f.key)}
            />
          ))}
        </nav>

        {/* Mobile folder list (first screen) */}
        {!showItemsMobile ? (
          <div className="lg:hidden">
            <p className="text-foreground mb-3 text-sm font-medium">
              {t("explorer.allFolders")}
            </p>
            <div className="bg-card border-border overflow-hidden rounded-xl border">
              <ul>
                <ExplorerRow
                  icon={<Layers className="size-5" />}
                  title={allLabel}
                  meta={`${totalCount} ${noun}`}
                  onClick={() => pick(null)}
                />
                {folders.map((f) => (
                  <ExplorerRow
                    key={f.key}
                    icon={<Folder className="size-5" />}
                    title={f.label}
                    meta={`${f.count} ${noun}`}
                    onClick={() => pick(f.key)}
                  />
                ))}
              </ul>
            </div>
          </div>
        ) : null}

        {/* List panel */}
        <section
          aria-label={selected?.label ?? allLabel}
          className={cn(
            "flex min-w-0 flex-col gap-3",
            !showItemsMobile && "hidden lg:flex",
          )}
        >
          <div className="text-muted-foreground flex flex-wrap items-center justify-between gap-2 text-sm">
            <nav
              aria-label={t("explorer.location")}
              className="flex min-w-0 items-center gap-1.5"
            >
              <ChevronLeft className="size-4 shrink-0 lg:hidden" aria-hidden />
              <button
                type="button"
                onClick={toRoot}
                className="hover:text-foreground shrink-0"
              >
                {t("explorer.allFolders")}
              </button>
              <ChevronRight className="size-4 shrink-0" aria-hidden />
              <span className="text-foreground truncate font-medium">
                {selected?.label ?? allLabel}
              </span>
            </nav>
            <div className="flex items-center gap-3 text-xs">
              <span>
                {visibleCount} {noun}
              </span>
              {panelActions}
            </div>
          </div>
          {panelNotice}
          <div className="bg-card border-border overflow-hidden rounded-xl border">
            {panelBody ?? <ExplorerRows>{children}</ExplorerRows>}
          </div>
        </section>
      </div>
    </PageShell>
  );
}

export function ExplorerSidebarItem({
  active,
  icon,
  label,
  count,
  onClick,
}: {
  active: boolean;
  icon: ReactNode;
  label: string;
  count: number;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-current={active ? "true" : undefined}
      className={cn(
        "flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm transition-colors",
        active ? "bg-muted font-medium" : "hover:bg-muted/60",
      )}
    >
      <span className="text-muted-foreground shrink-0">{icon}</span>
      <span className="text-foreground min-w-0 flex-1 truncate">{label}</span>
      <span className="text-muted-foreground text-xs tabular-nums">
        {count}
      </span>
    </button>
  );
}
