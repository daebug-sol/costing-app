"use client";

import Link from "next/link";
import { useMemo, useSyncExternalStore, type ReactNode } from "react";
import { LayoutGrid, List } from "lucide-react";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { cn } from "@/lib/utils";

/**
 * Shared "file explorer" building blocks used by every module that lists
 * files/projects (Costing, Documentation, ...). The view choice is one
 * device-local preference so every module looks and behaves the same.
 */

export type ExplorerMode = "list" | "grid";
export type ExplorerSize = "sm" | "md" | "lg";
export type ExplorerView = { mode: ExplorerMode; size: ExplorerSize };

const STORAGE_KEY = "costing-explorer-view";

const DEFAULT_VIEW: ExplorerView = { mode: "list", size: "md" };
const CHANGE_EVENT = "costing-explorer-view-change";

function parseView(raw: string | null): ExplorerView {
  if (!raw) return DEFAULT_VIEW;
  try {
    const v = JSON.parse(raw) as { mode?: string; size?: string };
    return {
      mode: v.mode === "grid" ? "grid" : "list",
      size: v.size === "sm" || v.size === "lg" ? v.size : "md",
    };
  } catch {
    return DEFAULT_VIEW;
  }
}

function readRaw(): string | null {
  try {
    return window.localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

function subscribe(cb: () => void) {
  window.addEventListener(CHANGE_EVENT, cb);
  window.addEventListener("storage", cb);
  return () => {
    window.removeEventListener(CHANGE_EVENT, cb);
    window.removeEventListener("storage", cb);
  };
}

/** Device-local view preference shared by every explorer; SSR renders the default. */
export function useExplorerView() {
  const raw = useSyncExternalStore(subscribe, readRaw, () => null);
  const view = useMemo(() => parseView(raw), [raw]);
  const update = (next: Partial<ExplorerView>) => {
    try {
      window.localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ ...view, ...next }),
      );
    } catch {
      /* ignore */
    }
    window.dispatchEvent(new Event(CHANGE_EVENT));
  };
  return [view, update] as const;
}

export function ExplorerViewControls({
  view,
  onChange,
}: {
  view: ExplorerView;
  onChange: (next: Partial<ExplorerView>) => void;
}) {
  return (
    <div className="flex items-center gap-2">
      <ToggleGroup
        type="single"
        variant="outline"
        size="sm"
        value={view.size}
        onValueChange={(v) => {
          if (v === "sm" || v === "md" || v === "lg") onChange({ size: v });
        }}
        aria-label="Ukuran tampilan"
        className="hidden sm:flex"
      >
        <ToggleGroupItem value="sm" aria-label="Ukuran kecil">
          Kecil
        </ToggleGroupItem>
        <ToggleGroupItem value="md" aria-label="Ukuran sedang">
          Sedang
        </ToggleGroupItem>
        <ToggleGroupItem value="lg" aria-label="Ukuran besar">
          Besar
        </ToggleGroupItem>
      </ToggleGroup>
      <ToggleGroup
        type="single"
        variant="outline"
        size="sm"
        value={view.mode}
        onValueChange={(v) => {
          if (v === "list" || v === "grid") onChange({ mode: v });
        }}
        aria-label="Mode tampilan"
      >
        <ToggleGroupItem value="list" aria-label="Tampilan daftar">
          <List className="size-4" />
        </ToggleGroupItem>
        <ToggleGroupItem value="grid" aria-label="Tampilan kartu">
          <LayoutGrid className="size-4" />
        </ToggleGroupItem>
      </ToggleGroup>
    </div>
  );
}

const gridCols: Record<ExplorerSize, string> = {
  sm: "grid-cols-[repeat(auto-fill,minmax(12rem,1fr))]",
  md: "grid-cols-[repeat(auto-fill,minmax(16rem,1fr))]",
  lg: "grid-cols-[repeat(auto-fill,minmax(22rem,1fr))]",
};

const listPad: Record<ExplorerSize, string> = {
  sm: "py-1.5",
  md: "py-2.5",
  lg: "py-3.5",
};

export function ExplorerItems({
  view,
  children,
}: {
  view: ExplorerView;
  children: ReactNode;
}) {
  return (
    <ul
      className={cn(
        view.mode === "grid"
          ? cn("grid gap-3", gridCols[view.size])
          : "flex flex-col gap-1.5",
      )}
    >
      {children}
    </ul>
  );
}

type ExplorerItemProps = {
  view: ExplorerView;
  /** Leading element (file icon or a checkbox). */
  lead: ReactNode;
  title: string;
  /** Small secondary facts (date, status, ...). */
  meta?: ReactNode;
  /** Right-aligned value (e.g. total price). */
  trailing?: ReactNode;
  href?: string;
  onClick?: () => void;
  ariaLabel?: string;
  ariaExpanded?: boolean;
  selected?: boolean;
  highlighted?: boolean;
  /** Extra control beside the row in list mode (e.g. expand chevron). */
  action?: ReactNode;
  /** Content below the row (e.g. expanded progress). */
  footer?: ReactNode;
};

export function ExplorerItem({
  view,
  lead,
  title,
  meta,
  trailing,
  href,
  onClick,
  ariaLabel,
  ariaExpanded,
  selected,
  highlighted,
  action,
  footer,
}: ExplorerItemProps) {
  const isGrid = view.mode === "grid";
  const rowClass = cn(
    "focus-visible:ring-ring flex min-w-0 flex-1 gap-3 px-3 text-left hover:bg-muted/40 focus-visible:ring-2 focus-visible:outline-none",
    isGrid ? "flex-col py-3" : cn("items-center sm:gap-4", listPad[view.size]),
  );
  const body = (
    <>
      <span className="flex min-w-0 items-center gap-3">
        {lead}
        <span className="text-foreground min-w-0 flex-1 truncate font-medium">
          {title}
        </span>
      </span>
      {meta ? (
        <span
          className={cn(
            "text-muted-foreground flex min-w-0 text-xs",
            isGrid
              ? "flex-wrap gap-x-3"
              : "ml-auto hidden shrink-0 gap-x-6 sm:flex",
          )}
        >
          {meta}
        </span>
      ) : null}
      {trailing ? (
        <span
          className={cn(
            "text-foreground text-sm font-medium tabular-nums",
            !isGrid && "ml-auto shrink-0 text-right sm:ml-0 sm:w-36",
          )}
        >
          {trailing}
        </span>
      ) : null}
    </>
  );

  return (
    <li>
      <div
        className={cn(
          "bg-card overflow-hidden rounded-lg border transition-colors",
          selected
            ? "border-primary/45 bg-primary/[0.07] ring-1 ring-primary/20"
            : highlighted
              ? "border-primary/35"
              : "border-border",
        )}
      >
        <div className="flex min-w-0 items-stretch gap-1">
          {href ? (
            <Link href={href} className={rowClass} aria-label={ariaLabel}>
              {body}
            </Link>
          ) : (
            <button
              type="button"
              onClick={onClick}
              className={rowClass}
              aria-label={ariaLabel}
              aria-expanded={ariaExpanded}
            >
              {body}
            </button>
          )}
          {!isGrid ? action : null}
        </div>
        {footer}
      </div>
    </li>
  );
}
