"use client";

import { ChevronDown, ChevronRight, Lock, Pencil } from "lucide-react";
import { useI18n } from "@/components/i18n-provider";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { effectiveSectionSubtotal } from "@/lib/section-subtotal";
import { formatIDR, formatNumber } from "@/lib/utils/format";
import { cn } from "@/lib/utils";
import { categoryTitle, catKey } from "./costing-workspace-shared";
import type { AhuEditor } from "./use-ahu-segment-editor";

export function AhuSheet({ ed }: { ed: AhuEditor }) {
  const { t } = useI18n();
  const {
    seg,
    openAddItem,
    toggleCat,
    openCats,
    unlockDraft,
    setUnlockDraft,
    qtyDraft,
    setQtyDraft,
    overrideItem,
    resetItem,
    showToast,
    sortedSections,
    breakdownOpen,
    setBreakdownOpen,
  } = ed;

  return (
    <>
      <Sheet open={breakdownOpen} onOpenChange={setBreakdownOpen}>
        <SheetContent side="right" className="flex w-full flex-col gap-4 overflow-y-auto sm:max-w-2xl">
          <SheetHeader>
            <SheetTitle>Rincian biaya</SheetTitle>
            <SheetDescription>
              Line item per kategori modul — {seg.title}
            </SheetDescription>
          </SheetHeader>
          <div className="flex flex-col gap-3 pb-2">
        {sortedSections.map((sec) => {
          const open = openCats[catKey(seg.id, sec.category)] ?? false;
          const effective = effectiveSectionSubtotal(sec);
          return (
            <Card
              key={sec.id}
              className="overflow-hidden border-border"
            >
              <button
                type="button"
                onClick={() => toggleCat(seg.id, sec.category)}
                className="bg-muted/50 flex w-full items-center justify-between gap-3 border-b border-border px-4 py-3 text-left"
              >
                <span className="font-medium text-foreground">
                  {categoryTitle(sec.category)}
                </span>
                <span className="flex items-center gap-3">
                  <span className="tabular-money text-sm font-semibold text-foreground">
                    {formatIDR(effective)}
                  </span>
                  {open ? (
                    <ChevronDown className="size-4 text-muted-foreground" />
                  ) : (
                    <ChevronRight className="size-4 text-muted-foreground" />
                  )}
                </span>
              </button>
              {open && (
                <CardContent className="px-4 pb-4 pt-0">
                  <Table>
                    <TableHeader>
                      <TableRow className="hover:bg-transparent">
                        <TableHead className="w-10" />
                        <TableHead>{t("common.description")}</TableHead>
                        <TableHead className="w-16">UOM</TableHead>
                        <TableHead className="w-28 text-right">Qty</TableHead>
                        <TableHead className="text-right">
                          {t("costing.unitPriceIdr")}
                        </TableHead>
                        <TableHead className="text-right">{t("costing.totalIdr")}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {sec.lineItems.map((row) => {
                        const overridden = row.isOverride;
                        const unlocking = unlockDraft[row.id];
                        const editable = overridden || unlocking;
                        const qtyStr = qtyDraft[row.id] ?? String(row.qty);

                        return (
                          <TableRow
                            key={row.id}
                            className={cn(
                              overridden ? "bg-amber-50/90" : "bg-card"
                            )}
                          >
                            <TableCell className="align-middle">
                              {!overridden && !unlocking ? (
                                <button
                                  type="button"
                                  className="p-1 text-muted-foreground hover:text-foreground"
                                  title="Override quantity"
                                  onClick={() => {
                                    setUnlockDraft((u) => ({
                                      ...u,
                                      [row.id]: true,
                                    }));
                                    setQtyDraft((q) => ({
                                      ...q,
                                      [row.id]: String(row.qty),
                                    }));
                                  }}
                                >
                                  <Lock className="size-4" />
                                </button>
                              ) : (
                                <button
                                  type="button"
                                  className="p-1 text-amber-700 hover:text-amber-900"
                                  title="Reset to auto"
                                  onClick={() => {
                                    setUnlockDraft((u) => {
                                      const n = { ...u };
                                      delete n[row.id];
                                      return n;
                                    });
                                    setQtyDraft((q) => {
                                      const n = { ...q };
                                      delete n[row.id];
                                      return n;
                                    });
                                    resetItem(row.id).catch((e) =>
                                      showToast(String(e))
                                    );
                                  }}
                                >
                                  <Pencil className="size-4" />
                                </button>
                              )}
                            </TableCell>
                            <TableCell className="max-w-[220px] whitespace-normal text-sm">
                              {row.description}
                            </TableCell>
                            <TableCell className="text-sm">{row.uom}</TableCell>
                            <TableCell className="text-right">
                              {editable ? (
                                <Input
                                  className="tabular-money ml-auto h-8 w-24 text-right"
                                  value={qtyStr}
                                  onChange={(e) =>
                                    setQtyDraft((q) => ({
                                      ...q,
                                      [row.id]: e.target.value,
                                    }))
                                  }
                                  onKeyDown={(e) => {
                                    if (e.key === "Enter") {
                                      e.currentTarget.blur();
                                    }
                                  }}
                                  onBlur={(e) => {
                                    const v = Number(e.currentTarget.value);
                                    if (!Number.isFinite(v)) return;
                                    overrideItem(row.id, v).catch((err) =>
                                      showToast(String(err))
                                    );
                                    setUnlockDraft((u) => {
                                      const n = { ...u };
                                      delete n[row.id];
                                      return n;
                                    });
                                  }}
                                />
                              ) : (
                                <span className="tabular-money">
                                  {formatNumber(row.qty, 4)}
                                </span>
                              )}
                            </TableCell>
                            <TableCell className="tabular-money text-right text-sm">
                              {formatIDR(row.unitPrice)}
                            </TableCell>
                            <TableCell className="tabular-money text-right text-sm font-medium">
                              {formatIDR(row.subtotal)}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                  <div className="border-t border-border px-4 py-2">
                    <Button
                      type="button"
                      variant="link"
                      className="text-sm"
                      onClick={() => openAddItem(sec.id)}
                    >
                      + Tambah item
                    </Button>
                  </div>
                </CardContent>
              )}
            </Card>
          );
        })}
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
