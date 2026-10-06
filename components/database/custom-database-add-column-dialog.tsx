"use client";

import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { encodeDropdownKind } from "./custom-database-shared";
import type { PanelCtx } from "./use-custom-database";

export function CustomDatabaseAddColumnDialog({ ed }: { ed: PanelCtx }) {
  const {
    show,
    addColumnDialogOpen,
    setAddColumnDialogOpen,
    addColumnName,
    setAddColumnName,
    addColumnKind,
    setAddColumnKind,
    addColumnDropdownOptions,
    setAddColumnDropdownOptions,
    addColumn,
  } = ed;

  return (
    <>
      <Dialog open={addColumnDialogOpen} onOpenChange={setAddColumnDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Tambah kolom</DialogTitle>
            <DialogDescription>
              Tambah kolom dinamis di area antara Name dan UOM.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="add-column-name">Nama kolom</Label>
            <Input
              id="add-column-name"
              value={addColumnName}
              onChange={(e) => setAddColumnName(e.target.value)}
              placeholder="contoh: panjang, raw_price, currency"
            />
            <Label htmlFor="add-column-kind">Kategori kolom</Label>
            <Select
              value={addColumnKind}
              onValueChange={(v) => {
                setAddColumnKind(v);
                if (v !== "dropdown") setAddColumnDropdownOptions("");
              }}
            >
              <SelectTrigger id="add-column-kind">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="text">Teks</SelectItem>
                <SelectItem value="number">Angka</SelectItem>
                <SelectItem value="currency">Finance/Forex</SelectItem>
                <SelectItem value="uom">UOM</SelectItem>
                <SelectItem value="dropdown">Dropdown</SelectItem>
                <SelectItem value="formula">Formula</SelectItem>
              </SelectContent>
            </Select>
            {addColumnKind === "dropdown" ? (
              <div className="grid gap-1.5">
                <Label htmlFor="add-column-dropdown-options">Opsi (satu per baris)</Label>
                <Textarea
                  id="add-column-dropdown-options"
                  className="border-input bg-background focus-visible:ring-ring flex min-h-[72px] w-full rounded-md border px-2.5 py-2 text-sm shadow-xs outline-none focus-visible:ring-2"
                  value={addColumnDropdownOptions}
                  onChange={(e) => setAddColumnDropdownOptions(e.target.value)}
                  placeholder={"Vendor A\nVendor B\nVendor C"}
                />
              </div>
            ) : null}
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setAddColumnDialogOpen(false)}>
              Batal
            </Button>
            <Button
              type="button"
              onClick={async () => {
                const name = addColumnName.trim();
                if (!name) return;
                if (addColumnKind === "dropdown" && !addColumnDropdownOptions.trim()) {
                  show("error", "Isi minimal satu opsi dropdown");
                  return;
                }
                const kind =
                  addColumnKind === "dropdown"
                    ? encodeDropdownKind(addColumnDropdownOptions)
                    : addColumnKind;
                await addColumn(name, kind);
                setAddColumnName("");
                setAddColumnKind("text");
                setAddColumnDropdownOptions("");
                setAddColumnDialogOpen(false);
              }}
            >
              Tambah
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
