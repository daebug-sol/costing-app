"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export type SaveState = "idle" | "saving" | "saved" | "error";
type SaveEvent = "start" | "ok" | "fail" | "reset";

export function nextSaveState(current: SaveState, event: SaveEvent): SaveState {
  switch (event) {
    case "start":
      return "saving";
    case "ok":
      return current === "saving" ? "saved" : current;
    case "fail":
      return current === "saving" ? "error" : current;
    case "reset":
      return "idle";
  }
}

const SAVED_VISIBLE_MS = 2500;

/** Tracks an async save so the UI can show Menyimpan / Tersimpan / Gagal. */
export function useSaveState() {
  const [state, setState] = useState<SaveState>("idle");
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    []
  );

  const reset = useCallback(() => setState((s) => nextSaveState(s, "reset")), []);

  const run = useCallback(async (fn: () => Promise<void>) => {
    if (timer.current) clearTimeout(timer.current);
    setState((s) => nextSaveState(s, "start"));
    try {
      await fn();
      setState((s) => nextSaveState(s, "ok"));
      timer.current = setTimeout(
        () => setState((s) => (s === "saved" ? nextSaveState(s, "reset") : s)),
        SAVED_VISIBLE_MS
      );
      return true;
    } catch {
      setState((s) => nextSaveState(s, "fail"));
      return false;
    }
  }, []);

  return { state, run, reset };
}
