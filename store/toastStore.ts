import { create } from "zustand";

export type ToastVariant = "success" | "error" | "warning";

export type ToastItem = {
  id: string;
  variant: ToastVariant;
  message: string;
};

type ToastState = {
  toasts: ToastItem[];
  show: (variant: ToastVariant, message: string) => string;
  dismiss: (id: string) => void;
};

let idSeq = 0;

export const useToastStore = create<ToastState>((set) => ({
  toasts: [],
  show(variant, message) {
    const id = `t-${++idSeq}-${Date.now()}`;
    set((s) => ({
      toasts: [...s.toasts, { id, variant, message }],
    }));
    if (variant === "success") {
      window.setTimeout(() => {
        set((s) => ({
          toasts: s.toasts.filter((t) => t.id !== id),
        }));
      }, 4000);
    }
    if (variant === "warning") {
      window.setTimeout(() => {
        set((s) => ({
          toasts: s.toasts.filter((t) => t.id !== id),
        }));
      }, 6000);
    }
    return id;
  },
  dismiss(id) {
    set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) }));
  },
}));

export function toastSuccess(message: string) {
  useToastStore.getState().show("success", message);
}

export function toastError(message: string) {
  useToastStore.getState().show("error", message);
}

export function toastWarning(message: string) {
  useToastStore.getState().show("warning", message);
}
