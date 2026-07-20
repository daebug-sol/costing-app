export const HELP_PROGRESS_STORAGE_KEY = "costing-help-progress";

export type HelpProgress = {
  completedLessonKeys: string[];
  lastOpenedKey?: string;
  updatedAt: string;
};

export const EMPTY_HELP_PROGRESS: HelpProgress = {
  completedLessonKeys: [],
  updatedAt: new Date(0).toISOString(),
};

function uniqueKeys(keys: string[]): string[] {
  return Array.from(new Set(keys.filter((k) => typeof k === "string" && k.length > 0)));
}

export function parseHelpProgress(raw: unknown): HelpProgress {
  if (!raw || typeof raw !== "object") {
    return { ...EMPTY_HELP_PROGRESS, completedLessonKeys: [] };
  }

  const record = raw as Record<string, unknown>;
  const completed = Array.isArray(record.completedLessonKeys)
    ? uniqueKeys(record.completedLessonKeys.filter((k): k is string => typeof k === "string"))
    : [];

  const lastOpenedKey =
    typeof record.lastOpenedKey === "string" && record.lastOpenedKey.length > 0
      ? record.lastOpenedKey
      : undefined;

  const updatedAt =
    typeof record.updatedAt === "string" && record.updatedAt.length > 0
      ? record.updatedAt
      : new Date(0).toISOString();

  return {
    completedLessonKeys: completed,
    lastOpenedKey,
    updatedAt,
  };
}

export function serializeHelpProgress(progress: HelpProgress): string {
  return JSON.stringify({
    completedLessonKeys: uniqueKeys(progress.completedLessonKeys),
    lastOpenedKey: progress.lastOpenedKey,
    updatedAt: progress.updatedAt,
  });
}

export function readProgressFromStorage(raw: string | null): HelpProgress {
  if (!raw) {
    return { ...EMPTY_HELP_PROGRESS, completedLessonKeys: [] };
  }

  try {
    return parseHelpProgress(JSON.parse(raw));
  } catch {
    return { ...EMPTY_HELP_PROGRESS, completedLessonKeys: [] };
  }
}

/** SSR-safe: returns empty progress when `window` is unavailable. */
export function readProgress(): HelpProgress {
  if (typeof window === "undefined") {
    return { ...EMPTY_HELP_PROGRESS, completedLessonKeys: [] };
  }

  try {
    return readProgressFromStorage(
      window.localStorage.getItem(HELP_PROGRESS_STORAGE_KEY)
    );
  } catch {
    return { ...EMPTY_HELP_PROGRESS, completedLessonKeys: [] };
  }
}

function writeProgress(progress: HelpProgress): HelpProgress {
  const next: HelpProgress = {
    completedLessonKeys: uniqueKeys(progress.completedLessonKeys),
    lastOpenedKey: progress.lastOpenedKey,
    updatedAt: new Date().toISOString(),
  };

  if (typeof window !== "undefined") {
    try {
      window.localStorage.setItem(
        HELP_PROGRESS_STORAGE_KEY,
        serializeHelpProgress(next)
      );
    } catch {
      /* quota / private mode — keep in-memory result */
    }
  }

  return next;
}

export function markOpened(lessonKey: string): HelpProgress {
  const current = readProgress();
  return writeProgress({
    ...current,
    lastOpenedKey: lessonKey,
  });
}

export function markComplete(lessonKey: string): HelpProgress {
  const current = readProgress();
  return writeProgress({
    ...current,
    lastOpenedKey: lessonKey,
    completedLessonKeys: uniqueKeys([
      ...current.completedLessonKeys,
      lessonKey,
    ]),
  });
}

export function isLessonComplete(
  progress: HelpProgress,
  lessonKey: string
): boolean {
  return progress.completedLessonKeys.includes(lessonKey);
}
