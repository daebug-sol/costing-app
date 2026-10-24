"use client";

import {
  ArrowDown,
  ArrowUp,
  ChevronRight,
  FolderPlus,
  MoreHorizontal,
  Pencil,
  Plus,
  RotateCcw,
  Trash2,
} from "lucide-react";
import { useI18n } from "@/components/i18n-provider";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import {
  MANUAL_GROUP_MAX_DEPTH,
  type GroupNode,
  type MaterialUsage,
} from "@/lib/manual-group-tree";
import { cn } from "@/lib/utils";
import { formatIDR } from "@/lib/utils/format";

export type ManualTreeItem = {
  id: string;
  sourceType: string;
  sourceId: string;
  name: string;
  uom: string;
  qty: number;
  basePrice: number;
  overridePrice: number | null;
  subtotal: number;
};

export type ManualTreeGroup = {
  id: string;
  parentId?: string | null;
  name: string;
  sortOrder: number;
  subtotal: number;
  items: ManualTreeItem[];
};

/** Kolom desktop: Nama | Qty | Satuan | Harga satuan | Subtotal | ⋯ */
const DESKTOP_COLS =
  "md:grid md:grid-cols-[minmax(0,1fr)_5.5rem_4.5rem_9rem_9rem_2rem] md:items-center md:gap-3";

const GROUP_INDENT: Record<number, string> = {
  1: "",
  2: "pl-3 md:pl-6",
  3: "pl-6 md:pl-12",
};

const ITEM_INDENT: Record<number, string> = {
  0: "",
  1: "md:pl-6",
  2: "pl-3 md:pl-12",
  3: "pl-6 md:pl-18",
};

export type ManualGroupTreeProps = {
  nodes: GroupNode<ManualTreeGroup>[];
  /** Satu bagian bawaan tanpa header (item tunggal). */
  flat: boolean;
  openCats: Record<string, boolean>;
  onToggle: (groupId: string) => void;
  renamingId: string | null;
  onStartRename: (groupId: string) => void;
  onCommitRename: (groupId: string, name: string | null) => void;
  usage: Map<string, MaterialUsage>;
  onAddMaterial: (groupId: string) => void;
  onAddSubgroup: (groupId: string) => void;
  onMoveGroup: (groupId: string, dir: -1 | 1) => void;
  onDeleteGroup: (group: ManualTreeGroup) => void;
  onMoveItem: (groupId: string, itemId: string, dir: -1 | 1) => void;
  onDeleteItem: (item: ManualTreeItem) => void;
  onEditPrice: (item: ManualTreeItem) => void;
  onResetPrice: (item: ManualTreeItem) => void;
  renderQtyInput: (item: ManualTreeItem, className: string) => React.ReactNode;
  renderPrice: (item: ManualTreeItem) => React.ReactNode;
};

export function ManualGroupTree(props: ManualGroupTreeProps) {
  const { t } = useI18n();
  const { nodes, flat } = props;
  const hasItems = nodes.some(function any(n): boolean {
    return n.group.items.length > 0 || n.children.some(any);
  });

  return (
    <div className="flex flex-col" data-testid="manual-group-tree">
      {hasItems ? (
        <div
          className={cn(
            "text-muted-foreground hidden border-b border-border pb-2 text-xs",
            DESKTOP_COLS
          )}
        >
          <span>{t("costing.manual.colName")}</span>
          <span className="text-right">{t("costing.manual.qty")}</span>
          <span>{t("costing.manual.colUnit")}</span>
          <span className="text-right">{t("costing.manual.colUnitPrice")}</span>
          <span className="border-l border-border pl-3 text-right">
            {t("costing.manual.colSubtotal")}
          </span>
          <span />
        </div>
      ) : null}
      {flat
        ? nodes.map((n) => (
            <ItemList key={n.group.id} {...props} group={n.group} depth={0} />
          ))
        : nodes.map((n, i) => (
            <GroupSection
              key={n.group.id}
              {...props}
              node={n}
              index={i}
              siblingCount={nodes.length}
            />
          ))}
    </div>
  );
}

function GroupSection(
  props: ManualGroupTreeProps & {
    node: GroupNode<ManualTreeGroup>;
    index: number;
    siblingCount: number;
  }
) {
  const { t } = useI18n();
  const { node, index, siblingCount, openCats, renamingId } = props;
  const g = node.group;
  const open = openCats[g.id] ?? true;
  const canNest = node.depth < MANUAL_GROUP_MAX_DEPTH;
  const renaming = renamingId === g.id;
  const placeholder =
    node.depth === 1
      ? t("costing.manual.groupPlaceholder")
      : t("costing.manual.subgroupPlaceholder");

  return (
    <section
      className={cn(node.depth === 1 && "border-b border-border last:border-b-0")}
      aria-label={g.name}
    >
      <div
        className={cn(
          "flex min-h-11 min-w-0 items-center gap-2 py-1.5",
          GROUP_INDENT[node.depth]
        )}
      >
        {renaming ? (
          <div className="flex min-w-0 flex-1 items-center gap-2">
            <ChevronRight
              className={cn("text-muted-foreground size-4 shrink-0", open && "rotate-90")}
              aria-hidden
            />
            <Input
              autoFocus
              className="h-9 min-w-0 flex-1 text-sm font-medium"
              defaultValue={g.name}
              placeholder={placeholder}
              aria-label={t("costing.manual.groupName")}
              onFocus={(e) => e.currentTarget.select()}
              onKeyDown={(e) => {
                if (e.key === "Enter") e.currentTarget.blur();
                if (e.key === "Escape") props.onCommitRename(g.id, null);
              }}
              onBlur={(e) => props.onCommitRename(g.id, e.currentTarget.value)}
            />
          </div>
        ) : (
          <button
            type="button"
            className="focus-visible:ring-ring hover:bg-muted/60 -ml-1 flex min-w-0 flex-1 items-center gap-2 rounded-md px-1 py-1 text-left outline-none focus-visible:ring-2"
            aria-expanded={open}
            onClick={() => props.onToggle(g.id)}
          >
            <ChevronRight
              className={cn(
                "text-muted-foreground size-4 shrink-0 transition-transform",
                open && "rotate-90"
              )}
              aria-hidden
            />
            <span
              className={cn(
                "min-w-0 truncate text-sm",
                node.depth === 1 ? "font-semibold" : "font-medium"
              )}
              title={g.name}
            >
              {g.name}
            </span>
          </button>
        )}
        <span
          className={cn(
            "tabular-money shrink-0 text-sm",
            node.depth === 1 ? "font-semibold" : "text-muted-foreground font-medium"
          )}
        >
          {formatIDR(node.total)}
        </span>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="size-8 shrink-0"
              aria-label={t("costing.manual.groupActions", { name: g.name })}
            >
              <MoreHorizontal aria-hidden />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => props.onStartRename(g.id)}>
              <Pencil aria-hidden />
              {t("costing.manual.rename")}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => props.onAddMaterial(g.id)}>
              <Plus aria-hidden />
              {t("costing.manual.addRow")}
            </DropdownMenuItem>
            {canNest ? (
              <DropdownMenuItem onClick={() => props.onAddSubgroup(g.id)}>
                <FolderPlus aria-hidden />
                {t("costing.manual.addSubgroup")}
              </DropdownMenuItem>
            ) : null}
            <DropdownMenuItem disabled={index === 0} onClick={() => props.onMoveGroup(g.id, -1)}>
              <ArrowUp aria-hidden />
              {t("costing.manual.moveUp")}
            </DropdownMenuItem>
            <DropdownMenuItem
              disabled={index === siblingCount - 1}
              onClick={() => props.onMoveGroup(g.id, 1)}
            >
              <ArrowDown aria-hidden />
              {t("costing.manual.moveDown")}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem variant="destructive" onClick={() => props.onDeleteGroup(g)}>
              <Trash2 aria-hidden />
              {t("costing.manual.delete")}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {open ? (
        <div className="pb-2">
          <ItemList {...props} group={g} depth={node.depth} />
          {g.items.length === 0 && node.children.length === 0 ? (
            <p className={cn("text-muted-foreground py-1 text-xs", ITEM_INDENT[node.depth])}>
              {t("costing.manual.emptyGroup")}
            </p>
          ) : null}
          <div className={cn("flex flex-wrap gap-1 pt-1", ITEM_INDENT[node.depth])}>
            <Button
              type="button"
              variant="ghost"
              size="xs"
              onClick={() => props.onAddMaterial(g.id)}
            >
              <Plus data-icon="inline-start" aria-hidden />
              {t("costing.manual.addRow")}
            </Button>
            {canNest ? (
              <Button
                type="button"
                variant="ghost"
                size="xs"
                onClick={() => props.onAddSubgroup(g.id)}
              >
                <FolderPlus data-icon="inline-start" aria-hidden />
                {t("costing.manual.subgroupShort")}
              </Button>
            ) : null}
          </div>
          {node.children.map((c, i) => (
            <GroupSection
              key={c.group.id}
              {...props}
              node={c}
              index={i}
              siblingCount={node.children.length}
            />
          ))}
        </div>
      ) : null}
    </section>
  );
}

function ItemList(
  props: ManualGroupTreeProps & { group: ManualTreeGroup; depth: number }
) {
  const { group, depth } = props;
  if (group.items.length === 0) return null;
  return (
    <ul className="divide-y divide-border">
      {group.items.map((row, i) => (
        <ItemRow
          key={row.id}
          {...props}
          row={row}
          index={i}
          count={group.items.length}
          groupId={group.id}
          depth={depth}
        />
      ))}
    </ul>
  );
}

function ItemRow(
  props: ManualGroupTreeProps & {
    row: ManualTreeItem;
    index: number;
    count: number;
    groupId: string;
    depth: number;
  }
) {
  const { t } = useI18n();
  const { row, index, count, groupId, depth, usage } = props;
  const used = usage.get(`${row.sourceType}:${row.sourceId}`);
  const usageNote =
    used && used.groupCount > 1 ? (
      <p className="text-muted-foreground text-xs">
        {t("costing.manual.usage", {
          qty: String(used.totalQty),
          uom: row.uom,
          count: String(used.groupCount),
        })}
      </p>
    ) : null;

  const menu = (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="text-muted-foreground size-8 shrink-0"
          aria-label={t("costing.manual.rowActions", { name: row.name })}
        >
          <MoreHorizontal aria-hidden />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => props.onEditPrice(row)}>
          <Pencil aria-hidden />
          {t("costing.manual.editPrice")}
        </DropdownMenuItem>
        {row.overridePrice != null ? (
          <DropdownMenuItem onClick={() => props.onResetPrice(row)}>
            <RotateCcw aria-hidden />
            {t("costing.manual.resetPrice")}
          </DropdownMenuItem>
        ) : null}
        <DropdownMenuItem
          disabled={index === 0}
          onClick={() => props.onMoveItem(groupId, row.id, -1)}
        >
          <ArrowUp aria-hidden />
          {t("costing.manual.moveUp")}
        </DropdownMenuItem>
        <DropdownMenuItem
          disabled={index === count - 1}
          onClick={() => props.onMoveItem(groupId, row.id, 1)}
        >
          <ArrowDown aria-hidden />
          {t("costing.manual.moveDown")}
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem variant="destructive" onClick={() => props.onDeleteItem(row)}>
          <Trash2 aria-hidden />
          {t("costing.manual.delete")}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );

  return (
    <li className={cn("py-2", ITEM_INDENT[depth])} data-testid="manual-item-row">
      {/* Mobile: nama + ⋯, lalu qty × harga satuan | subtotal */}
      <div className="md:hidden">
        <div className="flex items-start gap-2">
          <div className="min-w-0 flex-1 pt-1.5">
            <p className="text-sm font-medium break-words">{row.name}</p>
            {usageNote}
          </div>
          {menu}
        </div>
        <div className="mt-1 flex items-center gap-2 text-sm">
          {props.renderQtyInput(row, "tabular-money h-8 w-14 px-2 text-right")}
          <span className="text-muted-foreground shrink-0 text-xs">{row.uom}</span>
          <span className="text-muted-foreground shrink-0 text-xs" aria-hidden>
            ×
          </span>
          <span className="text-muted-foreground min-w-0 text-xs">{props.renderPrice(row)}</span>
          <span className="tabular-money ml-auto shrink-0 border-l border-border pl-3 font-semibold">
            {formatIDR(row.subtotal)}
          </span>
        </div>
      </div>

      {/* Desktop: satu baris sejajar header kolom */}
      <div className={cn("hidden", DESKTOP_COLS)}>
        <div className="min-w-0">
          <p className="truncate text-sm" title={row.name}>
            {row.name}
          </p>
          {usageNote}
        </div>
        {props.renderQtyInput(row, "tabular-money h-8 w-full px-2 text-right")}
        <span className="text-muted-foreground truncate text-sm">{row.uom}</span>
        <span className="text-muted-foreground text-right text-sm">{props.renderPrice(row)}</span>
        <span className="tabular-money border-l border-border pl-3 text-right text-sm font-semibold">
          {formatIDR(row.subtotal)}
        </span>
        {menu}
      </div>
    </li>
  );
}
