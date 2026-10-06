"use client";

import { Loader2 } from "lucide-react";
import { CostingLevelHeading } from "@/components/costing/costing-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { TabsContent } from "@/components/ui/tabs";
import { effectiveSectionSubtotal, sectionHasPriceOverride } from "@/lib/section-subtotal";
import { formatIDR } from "@/lib/utils/format";
import { cn } from "@/lib/utils";
import { categoryTitle } from "./costing-workspace-shared";
import type { AhuEditor } from "./use-ahu-segment-editor";

export function AhuSummaryTab({ ed }: { ed: AhuEditor }) {
  const {
    seg,
    segmentActionsDisabled,
    isCalculating,
    resetSegmentMarkup,
    showToast,
    sortedSections,
    priceEditId,
    setPriceEditId,
    priceDraft,
    setPriceDraft,
    resettingMarkup,
    setResettingMarkup,
    skipPriceBlurRef,
    hasAnyOverride,
    commitSectionPrice,
    setBreakdownOpen,
  } = ed;

  return (
    <>
          <TabsContent value="summary" className="flex flex-col gap-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <CostingLevelHeading level="segment" as="h4">
                Ringkasan kategori
              </CostingLevelHeading>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={
                  segmentActionsDisabled ||
                  isCalculating ||
                  resettingMarkup ||
                  !hasAnyOverride
                }
                aria-busy={resettingMarkup}
                aria-label="Reset markup — hapus semua override harga kategori"
                onClick={() => {
                  setResettingMarkup(true);
                  resetSegmentMarkup(seg.id)
                    .catch((e) => showToast(String(e)))
                    .finally(() => setResettingMarkup(false));
                }}
              >
                {resettingMarkup ? (
                  <>
                    <Loader2 className="size-3.5 animate-spin" />
                    Reset markup…
                  </>
                ) : (
                  "Reset markup"
                )}
              </Button>
            </div>
            <p className="text-muted-foreground text-xs">
              Double-klik harga untuk override. Kosongkan field lalu Enter/blur
              untuk kembali ke harga hitungan.
            </p>
            <div className="flex flex-col gap-2">
              {sortedSections.map((sec) => {
                const effective = effectiveSectionSubtotal(sec);
                const overridden = sectionHasPriceOverride(sec);
                const editing = priceEditId === sec.id;
                return (
                  <div
                    key={sec.id}
                    className={cn(
                      "bg-muted/30 flex items-center justify-between gap-3 rounded-md border border-border px-4 py-2.5",
                      overridden && "border-amber-300/80 bg-amber-50/50"
                    )}
                  >
                    <span className="text-sm font-medium text-foreground">
                      {categoryTitle(sec.category)}
                    </span>
                    <div className="flex min-w-0 flex-col items-end gap-0.5">
                      {editing ? (
                        <Input
                          autoFocus
                          className="tabular-money h-8 w-44 text-right"
                          value={priceDraft}
                          aria-label={`Override harga ${categoryTitle(sec.category)}`}
                          onChange={(e) => {
                            const next = e.target.value;
                            if (next.trim() === "") {
                              setPriceDraft("");
                              return;
                            }
                            const digits = next.replace(/\D/g, "");
                            if (digits === "") {
                              setPriceDraft("");
                              return;
                            }
                            setPriceDraft(formatIDR(Number(digits)));
                          }}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              e.preventDefault();
                              skipPriceBlurRef.current = true;
                              commitSectionPrice(sec, priceDraft);
                            } else if (e.key === "Escape") {
                              e.preventDefault();
                              skipPriceBlurRef.current = true;
                              setPriceEditId(null);
                            }
                          }}
                          onBlur={() => {
                            if (skipPriceBlurRef.current) {
                              skipPriceBlurRef.current = false;
                              return;
                            }
                            commitSectionPrice(sec, priceDraft);
                          }}
                        />
                      ) : (
                        <button
                          type="button"
                          className={cn(
                            "tabular-money text-sm font-semibold text-foreground",
                            "rounded-sm px-1 py-0.5 text-right hover:bg-muted/80",
                            "focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                          )}
                          title="Double-klik untuk ubah harga kategori"
                          aria-label={`Harga ${categoryTitle(sec.category)}: ${formatIDR(effective)}. Double-klik untuk edit.`}
                          onDoubleClick={() => {
                            setPriceEditId(sec.id);
                            setPriceDraft(formatIDR(Math.round(effective)));
                          }}
                        >
                          {formatIDR(effective)}
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
            <Button
              type="button"
              variant="outline"
              className="w-fit"
              onClick={() => setBreakdownOpen(true)}
            >
              Buka rincian lengkap
            </Button>
          </TabsContent>
    </>
  );
}
