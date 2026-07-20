"use client";

import { ArrowLeft, CheckCircle2, Circle } from "lucide-react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useHelpProgress } from "@/components/help/use-help-progress";
import { PageShell } from "@/components/page-shell";
import {
  getLessonKey,
  getLessonsForTrack,
  getTrack,
  trackProgressCounts,
} from "@/lib/help/catalog";
import { isLessonComplete } from "@/lib/help/progress";

export function HelpTrackList({ trackId }: { trackId: string }) {
  const track = getTrack(trackId);
  if (!track) return null;

  const lessons = getLessonsForTrack(track.id);
  const { progress, hydrated } = useHelpProgress();
  const counts = trackProgressCounts(track.id, progress.completedLessonKeys);

  return (
    <PageShell
      width="wide"
      eyebrow="Help"
      title={track.title}
      description={track.summary}
      actions={
        <Button variant="outline" size="sm" asChild>
          <Link href="/help">
            <ArrowLeft data-icon="inline-start" />
            Semua track
          </Link>
        </Button>
      }
    >
      <div className="flex flex-col gap-4" data-testid="help-track-list">
        <Badge variant="secondary">
          {hydrated
            ? `${counts.completed} dari ${counts.total} selesai`
            : `${counts.total} pelajaran`}
        </Badge>

        <ul className="flex flex-col gap-3">
          {lessons.map((lesson) => {
            const key = getLessonKey(lesson);
            const done = hydrated && isLessonComplete(progress, key);
            return (
              <li key={key}>
                <Card size="sm" className="shadow-sm">
                  <CardHeader className="flex flex-row items-start gap-3">
                    {done ? (
                      <CheckCircle2
                        className="mt-0.5 size-5 shrink-0 text-emerald-600"
                        aria-label="Selesai"
                      />
                    ) : (
                      <Circle
                        className="text-muted-foreground mt-0.5 size-5 shrink-0"
                        aria-hidden
                      />
                    )}
                    <div className="min-w-0 flex-1">
                      <CardTitle className="text-base">
                        <Link
                          href={`/help/${lesson.track}/${lesson.slug}`}
                          className="hover:underline"
                        >
                          {lesson.title}
                        </Link>
                      </CardTitle>
                      <CardDescription className="mt-1">
                        {lesson.summary}
                      </CardDescription>
                    </div>
                    <Badge variant="outline">{lesson.durationMin} mnt</Badge>
                  </CardHeader>
                  <CardContent>
                    <Button variant="outline" size="sm" asChild>
                      <Link href={`/help/${lesson.track}/${lesson.slug}`}>
                        Buka pelajaran
                      </Link>
                    </Button>
                  </CardContent>
                </Card>
              </li>
            );
          })}
        </ul>
      </div>
    </PageShell>
  );
}
