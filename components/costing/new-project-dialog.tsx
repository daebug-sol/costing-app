"use client";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { CostingWorkspaceState } from "./use-costing-workspace";

export function NewProjectDialog({ ed }: { ed: CostingWorkspaceState }) {
  const {
    newOpen,
    setNewOpen,
    newName,
    setNewName,
    handleCreate,
  } = ed;

  return (
    <>
      <Dialog open={newOpen} onOpenChange={setNewOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Buat proyek costing</DialogTitle>
            <DialogDescription>
              Masukkan nama proyek. Anda bisa menambah item AHU atau manual
              setelah proyek dibuat.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="np-name">Nama proyek</Label>
              <Input
                id="np-name"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="Contoh: AHU Line 1"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setNewOpen(false)}
            >
              Batal
            </Button>
            <Button
              type="button"
              disabled={!newName.trim()}
              onClick={handleCreate}
            >
              Buat
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
