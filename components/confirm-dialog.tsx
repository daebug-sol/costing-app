"use client";

import { useI18n } from "@/components/i18n-provider";
import * as React from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export type ConfirmOptions = {
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
};

type Pending = ConfirmOptions & { resolve: (ok: boolean) => void };

/**
 * Promise-based replacement for `window.confirm`.
 * `const [confirm, confirmDialog] = useConfirm();` then render `{confirmDialog}`
 * and `if (!(await confirm({ title: "..." }))) return;`.
 */
export function useConfirm(): [
  (options: ConfirmOptions) => Promise<boolean>,
  React.ReactNode,
] {
  const { t } = useI18n();
  const [pending, setPending] = React.useState<Pending | null>(null);
  const resolverRef = React.useRef<((ok: boolean) => void) | null>(null);

  const confirm = React.useCallback(
    (options: ConfirmOptions) =>
      new Promise<boolean>((resolve) => {
        // A newer request supersedes an open one: settle the old promise so its caller never hangs.
        resolverRef.current?.(false);
        resolverRef.current = resolve;
        setPending({ ...options, resolve });
      }),
    []
  );

  const settle = (ok: boolean) => {
    resolverRef.current?.(ok);
    resolverRef.current = null;
    setPending(null);
  };

  const dialog = (
    <Dialog open={pending !== null} onOpenChange={(open) => !open && settle(false)}>
      <DialogContent showCloseButton={false} role="alertdialog">
        <DialogHeader>
          <DialogTitle>{pending?.title}</DialogTitle>
          {pending?.description ? (
            <DialogDescription>{pending.description}</DialogDescription>
          ) : null}
        </DialogHeader>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => settle(false)}>
            {pending?.cancelLabel ?? t("confirm.cancel")}
          </Button>
          <Button
            type="button"
            variant={pending?.destructive === false ? "default" : "destructive"}
            onClick={() => settle(true)}
          >
            {pending?.confirmLabel ?? t("confirm.delete")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );

  return [confirm, dialog];
}
