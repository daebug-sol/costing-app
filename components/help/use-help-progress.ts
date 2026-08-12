"use client";

import { useCallback, useState, useSyncExternalStore } from "react";
import {
  markComplete,
  markOpened,
  readProgress,
  type HelpProgress,
} from "@/lib/help/progress";

function subscribeNoop() {
  return () => {};
}

/** Client-only flag without setState-in-effect (SSR snapshot is false). */
function useIsClient() {
  return useSyncExternalStore(subscribeNoop, () => true, () => false);
}

export function useHelpProgress() {
  const hydrated = useIsClient();
  const [progress, setProgress] = useState<HelpProgress>(() =>
    readProgress()
  );

  const openLesson = useCallback((key: string) => {
    setProgress(markOpened(key));
  }, []);

  const completeLesson = useCallback((key: string) => {
    setProgress(markComplete(key));
  }, []);

  const refresh = useCallback(() => {
    setProgress(readProgress());
  }, []);

  return { progress, hydrated, openLesson, completeLesson, refresh };
}
