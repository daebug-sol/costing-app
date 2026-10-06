"use client";

import { useI18n } from "@/components/i18n-provider";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { CostingWorkspaceState } from "./use-costing-workspace";

export function AddItemDialog({ ed }: { ed: CostingWorkspaceState }) {
  const { t } = useI18n();
  const {
    addOpen,
    setAddOpen,
    addDesc,
    setAddDesc,
    addUom,
    setAddUom,
    addQty,
    setAddQty,
    addPrice,
    setAddPrice,
    submitAddItem,
  } = ed;

  return (
    <>
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Tambah baris item</DialogTitle>
            <DialogDescription>
              Tambahkan baris manual pada section yang dipilih.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-3 py-2">
            <div className="space-y-1">
              <Label>{t("common.description")}</Label>
              <Input value={addDesc} onChange={(e) => setAddDesc(e.target.value)} />
            </div>
            <div className="grid grid-cols-3 gap-2">
              <div className="space-y-1">
                <Label>UOM</Label>
                <Input value={addUom} onChange={(e) => setAddUom(e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label>Qty</Label>
                <Input value={addQty} onChange={(e) => setAddQty(e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label>Unit price</Label>
                <Input
                  value={addPrice}
                  onChange={(e) => setAddPrice(e.target.value)}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setAddOpen(false)}
            >
              Cancel
            </Button>
            <Button type="button" onClick={submitAddItem}>
              Add
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
