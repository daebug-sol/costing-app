import { HELP_LESSONS } from "@/content/help/lessons";
import { HELP_TRACKS } from "@/content/help/tracks";
import {
  lessonKey,
  type HelpLesson,
  type HelpTrack,
  type HelpTrackId,
} from "@/content/help/types";

export function getTracks(): HelpTrack[] {
  return [...HELP_TRACKS].sort((a, b) => a.order - b.order);
}

export function getTrack(trackId: string): HelpTrack | undefined {
  return HELP_TRACKS.find((t) => t.id === trackId);
}

export function getAllLessons(): HelpLesson[] {
  return HELP_LESSONS;
}

export function getLessonsForTrack(trackId: HelpTrackId | string): HelpLesson[] {
  return HELP_LESSONS.filter((lesson) => lesson.track === trackId);
}

export function getLesson(
  trackId: string,
  slug: string
): HelpLesson | undefined {
  return HELP_LESSONS.find(
    (lesson) => lesson.track === trackId && lesson.slug === slug
  );
}

export function getLessonByKey(key: string): HelpLesson | undefined {
  const slash = key.indexOf("/");
  if (slash <= 0) return undefined;
  return getLesson(key.slice(0, slash), key.slice(slash + 1));
}

export function getLessonKey(lesson: HelpLesson): string {
  return lessonKey(lesson.track, lesson.slug);
}

/** First lesson in curriculum order — “Mulai dari sini”. */
export function getStarterLesson(): HelpLesson {
  return HELP_LESSONS[0]!;
}

export function getAdjacentLessons(lesson: HelpLesson): {
  prev: HelpLesson | null;
  next: HelpLesson | null;
} {
  const index = HELP_LESSONS.findIndex(
    (l) => l.track === lesson.track && l.slug === lesson.slug
  );
  if (index < 0) return { prev: null, next: null };
  return {
    prev: index > 0 ? HELP_LESSONS[index - 1]! : null,
    next: index < HELP_LESSONS.length - 1 ? HELP_LESSONS[index + 1]! : null,
  };
}

function normalizeQuery(q: string): string {
  return q.trim().toLowerCase();
}

function lessonSearchBlob(lesson: HelpLesson): string {
  const stepText = lesson.steps
    .map((s) => `${s.title} ${s.body} ${s.uiHint ?? ""}`)
    .join(" ");
  const tips = (lesson.tips ?? []).join(" ");
  const mistakes = (lesson.commonMistakes ?? []).join(" ");
  return `${lesson.title} ${lesson.summary} ${stepText} ${tips} ${mistakes}`.toLowerCase();
}

export function searchLessons(q: string): HelpLesson[] {
  const query = normalizeQuery(q);
  if (!query) return [];

  return HELP_LESSONS.filter((lesson) => lessonSearchBlob(lesson).includes(query));
}

/**
 * Lessons whose `relatedRoutes` match the current pathname.
 * Exact match preferred; then prefix match for nested routes
 * (e.g. `/documentation/quotation/123` → `/documentation`).
 */
export function lessonsForRoute(pathname: string): HelpLesson[] {
  const path = pathname.split("?")[0] || "/";

  const exact = HELP_LESSONS.filter((lesson) =>
    lesson.relatedRoutes.includes(path)
  );
  if (exact.length > 0) return exact;

  return HELP_LESSONS.filter((lesson) =>
    lesson.relatedRoutes.some((route) => {
      if (route === "/") return path === "/";
      return path === route || path.startsWith(`${route}/`);
    })
  );
}

export function trackProgressCounts(
  trackId: HelpTrackId | string,
  completedLessonKeys: string[]
): { total: number; completed: number } {
  const lessons = getLessonsForTrack(trackId);
  const completed = lessons.filter((lesson) =>
    completedLessonKeys.includes(getLessonKey(lesson))
  ).length;
  return { total: lessons.length, completed };
}
