export const HELP_TRACK_IDS = [
  "mulai-cepat",
  "database",
  "costing",
  "quotation",
  "dashboard",
  "pengaturan",
] as const;

export type HelpTrackId = (typeof HELP_TRACK_IDS)[number];

export const HELP_DEMO_IDS = [
  "create-project",
  "folder-file",
  "edit-cell",
  "export-quotation",
] as const;

export type HelpDemoId = (typeof HELP_DEMO_IDS)[number];

export type HelpStep = {
  title: string;
  body: string;
  uiHint?: string;
  deepLink?: string;
  demoId?: HelpDemoId;
};

export type HelpLesson = {
  track: HelpTrackId;
  slug: string;
  title: string;
  summary: string;
  durationMin: number;
  relatedRoutes: string[];
  steps: HelpStep[];
  tips?: string[];
  commonMistakes?: string[];
};

export type HelpTrack = {
  id: HelpTrackId;
  title: string;
  summary: string;
  order: number;
};

export function lessonKey(track: HelpTrackId, slug: string): string {
  return `${track}/${slug}`;
}

export function parseLessonKey(
  key: string
): { track: HelpTrackId; slug: string } | null {
  const slash = key.indexOf("/");
  if (slash <= 0 || slash === key.length - 1) return null;
  const track = key.slice(0, slash);
  const slug = key.slice(slash + 1);
  if (!(HELP_TRACK_IDS as readonly string[]).includes(track)) return null;
  if (!slug || slug.includes("/")) return null;
  return { track: track as HelpTrackId, slug };
}
