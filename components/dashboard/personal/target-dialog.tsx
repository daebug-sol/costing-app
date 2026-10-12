"use client";

import { useState } from "react";
import { useI18n } from "@/components/i18n-provider";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toastError, toastSuccess } from "@/store/toastStore";

export function TargetDialog({
  current,
  triggerLabel,
  onSaved,
}: {
  current: number | null;
  triggerLabel: string;
  onSaved: () => void;
}) {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState(current ? String(current) : "");
  const [saving, setSaving] = useState(false);

  async function save(monthlyTarget: number | null) {
    setSaving(true);
    try {
      const res = await fetch("/api/me/target", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ monthlyTarget }),
      });
      if (!res.ok) throw new Error("save failed");
      toastSuccess(t("common.saved"));
      setOpen(false);
      onSaved();
    } catch {
      toastError(t("common.saveFailed"));
    } finally {
      setSaving(false);
    }
  }

  const parsed = Number(value.replace(/[^\d]/g, ""));
  const valid = value.trim() !== "" && Number.isFinite(parsed) && parsed > 0;

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (next) setValue(current ? String(current) : "");
      }}
    >
      <DialogTrigger asChild>
        <Button type="button" variant="outline" size="sm">
          {triggerLabel}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("dashboard.personal.target.dialogTitle")}</DialogTitle>
          <DialogDescription>{t("dashboard.personal.target.dialogDescription")}</DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-2">
          <Label htmlFor="monthly-target">{t("dashboard.personal.target.field")}</Label>
          <Input
            id="monthly-target"
            inputMode="numeric"
            value={value}
            onChange={(e) => setValue(e.target.value)}
          />
        </div>
        <DialogFooter>
          {current !== null ? (
            <Button type="button" variant="ghost" disabled={saving} onClick={() => void save(null)}>
              {t("dashboard.personal.target.clear")}
            </Button>
          ) : null}
          <Button type="button" disabled={!valid || saving} onClick={() => void save(parsed)}>
            {t("dashboard.personal.target.save")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
