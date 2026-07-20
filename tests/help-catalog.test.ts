import {
  getAdjacentLessons,
  getAllLessons,
  getLesson,
  getLessonKey,
  getStarterLesson,
  getTracks,
  lessonsForRoute,
  searchLessons,
  trackProgressCounts,
} from "@/lib/help/catalog";
import { lessonKey, parseLessonKey } from "@/content/help/types";

describe("help-catalog", () => {
  it("exposes six ordered tracks", () => {
    const tracks = getTracks();
    expect(tracks.map((t) => t.id)).toEqual([
      "mulai-cepat",
      "database",
      "costing",
      "quotation",
      "dashboard",
      "pengaturan",
    ]);
  });

  it("ships MVP lessons with unique track/slug keys", () => {
    const lessons = getAllLessons();
    expect(lessons.length).toBeGreaterThanOrEqual(8);
    const keys = lessons.map(getLessonKey);
    expect(new Set(keys).size).toBe(keys.length);
    for (const key of keys) {
      expect(parseLessonKey(key)).not.toBeNull();
    }
  });

  it("resolves lessons by track and slug", () => {
    const starter = getStarterLesson();
    expect(starter.slug).toBe("orientasi-aplikasi");
    expect(getLesson(starter.track, starter.slug)?.title).toBe(starter.title);
    expect(getLesson("missing", "nope")).toBeUndefined();
  });

  it("builds lesson keys as track/slug", () => {
    expect(lessonKey("costing", "edit-sel-costing")).toBe(
      "costing/edit-sel-costing"
    );
  });

  it("searches lessons by title and body text", () => {
    expect(searchLessons("").length).toBe(0);
    const exportHits = searchLessons("ekspor");
    expect(exportHits.some((l) => l.slug === "export-quotation")).toBe(true);
    const folderHits = searchLessons("folder");
    expect(folderHits.some((l) => l.slug === "folder-dan-file")).toBe(true);
  });

  it("maps routes to related lessons", () => {
    expect(lessonsForRoute("/costing").length).toBeGreaterThan(0);
    expect(
      lessonsForRoute("/documentation/quotation/abc").some(
        (l) => l.track === "quotation"
      )
    ).toBe(true);
    expect(lessonsForRoute("/settings").some((l) => l.track === "pengaturan")).toBe(
      true
    );
  });

  it("returns adjacent lessons in curriculum order", () => {
    const starter = getStarterLesson();
    const { prev, next } = getAdjacentLessons(starter);
    expect(prev).toBeNull();
    expect(next?.slug).toBe("setup-organisasi");
  });

  it("counts track progress from completed keys", () => {
    const counts = trackProgressCounts("mulai-cepat", [
      "mulai-cepat/orientasi-aplikasi",
    ]);
    expect(counts.total).toBe(2);
    expect(counts.completed).toBe(1);
  });
});
