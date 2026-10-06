"use client";

import { toastError, toastSuccess } from "@/store/toastStore";
import { useCallback } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export async function readErr(res: Response): Promise<string> {
  try {
    const j = (await res.json()) as { error?: string };
    if (j?.error) return j.error;
  } catch {
    /* ignore */
  }
  return res.statusText || "Permintaan gagal";
}

export function useToast() {
  const show = useCallback((type: "success" | "error", message: string) => {
    if (type === "success") toastSuccess(message);
    else toastError(message);
  }, []);
  return { show };
}

export function DatabaseRowDeleteDialog({
  open,
  entityLabel,
  code,
  onClose,
  onConfirm,
}: {
  open: boolean;
  entityLabel: string;
  code: string;
  onClose: () => void;
  onConfirm: () => void | Promise<void>;
}) {
  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Hapus {entityLabel}?</DialogTitle>
          <DialogDescription>
            {entityLabel} &quot;{code}&quot; akan dihapus permanen. Tindakan ini tidak dapat
            dibatalkan.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose}>
            Batal
          </Button>
          <Button type="button" variant="destructive" onClick={() => void onConfirm()}>
            Hapus
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ——— Types ——— */

export type Material = {
  id: string;
  code: string;
  name: string;
  category: string;
  density: number;
  pricePerKg: number;
  currency: string;
  unit: string;
  notes: string | null;
};

export type Profile = {
  id: string;
  code: string;
  name: string;
  type: string;
  weightPerM: number;
  pricePerM: number;
  panelThick: number | null;
  notes: string | null;
};

export type ComponentRow = {
  id: string;
  code: string;
  name: string;
  category: string;
  subcategory: string | null;
  brand: string | null;
  model: string | null;
  spec: string | null;
  unitPrice: number;
  currency: string;
  unit: string;
  moq: number | null;
  leadTimeDays: number | null;
  supplier: string | null;
  notes: string | null;
};

export const ALL = "__all__";

/** Stable table area height — avoids layout jump when switching AHU sub-tabs. */
export const AHU_TABLE_SHELL_CLASS =
  "overflow-hidden rounded-lg border border-border bg-card min-h-[28rem]";

export const AHU_TAB_CONTENT_CLASS =
  "mt-0 outline-none transition-opacity duration-200 ease-out motion-reduce:transition-none data-[state=inactive]:hidden data-[state=active]:opacity-100";
