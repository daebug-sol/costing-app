import {
  EMPTY_HELP_PROGRESS,
  HELP_PROGRESS_STORAGE_KEY,
  isLessonComplete,
  markComplete,
  markOpened,
  parseHelpProgress,
  readProgress,
  readProgressFromStorage,
  serializeHelpProgress,
} from "@/lib/help/progress";

function installMemoryLocalStorage() {
  const store = new Map<string, string>();
  const localStorage = {
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, value: string) => {
      store.set(key, value);
    },
    removeItem: (key: string) => {
      store.delete(key);
    },
    clear: () => store.clear(),
  };
  Object.defineProperty(globalThis, "window", {
    value: { localStorage },
    configurable: true,
    writable: true,
  });
  return localStorage;
}

describe("help-progress", () => {
  const hadWindow = "window" in globalThis;
  const previousWindow = hadWindow ? globalThis.window : undefined;

  afterEach(() => {
    if (hadWindow) {
      Object.defineProperty(globalThis, "window", {
        value: previousWindow,
        configurable: true,
        writable: true,
      });
    } else {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      delete (globalThis as any).window;
    }
  });

  it("uses costing-help-progress storage key", () => {
    expect(HELP_PROGRESS_STORAGE_KEY).toBe("costing-help-progress");
  });

  it("parses valid progress and dedupes completed keys", () => {
    expect(
      parseHelpProgress({
        completedLessonKeys: [
          "mulai-cepat/orientasi-aplikasi",
          "mulai-cepat/orientasi-aplikasi",
          "",
        ],
        lastOpenedKey: "costing/proyek-dan-segment",
        updatedAt: "2026-01-01T00:00:00.000Z",
      })
    ).toEqual({
      completedLessonKeys: ["mulai-cepat/orientasi-aplikasi"],
      lastOpenedKey: "costing/proyek-dan-segment",
      updatedAt: "2026-01-01T00:00:00.000Z",
    });
  });

  it("falls back when stored values are invalid", () => {
    expect(parseHelpProgress(null).completedLessonKeys).toEqual([]);
    expect(readProgressFromStorage("{bad json").completedLessonKeys).toEqual(
      []
    );
    expect(readProgressFromStorage(null).completedLessonKeys).toEqual([]);
  });

  it("serializes and round-trips progress", () => {
    const raw = serializeHelpProgress({
      completedLessonKeys: ["database/folder-dan-file"],
      lastOpenedKey: "database/folder-dan-file",
      updatedAt: "2026-02-01T00:00:00.000Z",
    });
    expect(readProgressFromStorage(raw)).toEqual({
      completedLessonKeys: ["database/folder-dan-file"],
      lastOpenedKey: "database/folder-dan-file",
      updatedAt: "2026-02-01T00:00:00.000Z",
    });
  });

  it("is SSR-safe when window is unavailable", () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    delete (globalThis as any).window;
    expect(readProgress().completedLessonKeys).toEqual(
      EMPTY_HELP_PROGRESS.completedLessonKeys
    );
  });

  it("marks opened and complete in localStorage", () => {
    const localStorage = installMemoryLocalStorage();

    const opened = markOpened("mulai-cepat/orientasi-aplikasi");
    expect(opened.lastOpenedKey).toBe("mulai-cepat/orientasi-aplikasi");
    expect(opened.completedLessonKeys).toEqual([]);
    expect(localStorage.getItem(HELP_PROGRESS_STORAGE_KEY)).toContain(
      "mulai-cepat/orientasi-aplikasi"
    );

    const completed = markComplete("mulai-cepat/orientasi-aplikasi");
    expect(completed.completedLessonKeys).toEqual([
      "mulai-cepat/orientasi-aplikasi",
    ]);
    expect(
      isLessonComplete(completed, "mulai-cepat/orientasi-aplikasi")
    ).toBe(true);
    expect(isLessonComplete(completed, "costing/proyek-dan-segment")).toBe(
      false
    );

    const stored = readProgressFromStorage(
      localStorage.getItem(HELP_PROGRESS_STORAGE_KEY)
    );
    expect(stored.completedLessonKeys).toEqual([
      "mulai-cepat/orientasi-aplikasi",
    ]);
    expect(stored.lastOpenedKey).toBe("mulai-cepat/orientasi-aplikasi");
  });
});
