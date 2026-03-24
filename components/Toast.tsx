"use client";

import { AlertTriangle, CheckCircle2, X, XCircle } from "lucide-react";
import { useToastStore } from "@/store/toastStore";
import { cn } from "@/lib/utils";

function iconFor(variant: "success" | "error" | "warning") {
  switch (variant) {
    case "success":
      return <CheckCircle2 className="size-5 shrink-0 text-emerald-600" />;
    case "error":
      return <XCircle className="size-5 shrink-0 text-red-600" />;
    case "warning":
      return <AlertTriangle className="size-5 shrink-0 text-amber-600" />;
  }
}

export function Toaster() {
  const toasts = useToastStore((s) => s.toasts);
  const dismiss = useToastStore((s) => s.dismiss);

  if (toasts.length === 0) return null;

  return (
    <div
      className="fixed right-4 bottom-4 z-[100] flex w-full max-w-sm flex-col gap-2"
      role="region"
      aria-label="Notifications"
    >
      {toasts.map((t) => (
        <div
          key={t.id}
          role="alert"
          className={cn(
            "flex items-start gap-3 rounded-lg border px-3 py-2.5 text-sm shadow-lg",
            t.variant === "success" &&
              "border-emerald-200 bg-white text-slate-800",
            t.variant === "error" && "border-red-200 bg-white text-slate-800",
            t.variant === "warning" &&
              "border-amber-200 bg-white text-slate-800"
          )}
        >
          {iconFor(t.variant)}
          <p className="min-w-0 flex-1 pt-0.5 leading-snug">{t.message}</p>
          <button
            type="button"
            onClick={() => dismiss(t.id)}
            className="shrink-0 rounded p-0.5 text-slate-500 hover:bg-slate-100 hover:text-slate-800"
            aria-label="Dismiss"
          >
            <X className="size-4" />
          </button>
        </div>
      ))}
    </div>
  );
}
