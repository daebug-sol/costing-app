"use client";

import { useCallback, useEffect, useState } from "react";
import {
  markComplete,
  markOpened,
  readProgress,
  type HelpProgress,
} from "@/lib/help/progress";

export function useHelpProgress() {
  const [progress, setProgress] = useState<HelpProgress>(() =>
    readProgress()
  );
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setProgress(readProgress());
    setHydrated(true);
  }, []);

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
