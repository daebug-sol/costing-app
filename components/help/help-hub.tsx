"use client";

import {
  ArrowRight,
  BookOpen,
  CheckCircle2,
  Layers,
} from "lucide-react";
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
import { HelpSearch } from "@/components/help/help-search";
import { useHelpProgress } from "@/components/help/use-help-progress";
import { PageShell } from "@/components/page-shell";
import {
  getLessonByKey,
  getLessonKey,
  getStarterLesson,
  getTracks,
  trackProgressCounts,
} from "@/lib/help/catalog";
import { isLessonComplete } from "@/lib/help/progress";

export function HelpHub() {
  const { progress, hydrated } = useHelpProgress();
  const tracks = getTracks();
  const starter = getStarterLesson();
  const continueLesson = progress.lastOpenedKey
    ? getLessonByKey(progress.lastOpenedKey)
    : null;

  return (
    <PageShell
      width="wide"
      eyebrow="Panduan"
      title="Help"
      description="Pelajaran singkat untuk Database, Costing, quotation, Dashboard, dan Pengaturan."
    >
      <div className="flex flex-col gap-6" data-testid="help-hub">
        <HelpSearch />

        <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
          {hydrated && continueLesson ? (
            <Button asChild>
              <Link
                href={`/help/${continueLesson.track}/${continueLesson.slug}`}
              >
                Lanjutkan: {continueLesson.title}
                <ArrowRight data-icon="inline-end" />
              </Link>
            </Button>
          ) : null}
          <Button variant={continueLesson && hydrated ? "outline" : "default"} asChild>
            <Link href={`/help/${starter.track}/${starter.slug}`}>
              Mulai dari sini
              <BookOpen data-icon="inline-end" />
            </Link>
          </Button>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {tracks.map((track) => {
            const counts = trackProgressCounts(
              track.id,
              progress.completedLessonKeys
            );
            return (
              <Card key={track.id} size="sm" className="shadow-sm">
                <CardHeader>
                  <div className="flex items-start justify-between gap-2">
                    <CardTitle className="text-base">{track.title}</CardTitle>
                    <Layers
                      className="text-muted-foreground size-4 shrink-0"
                      aria-hidden
                    />
                  </div>
                  <CardDescription>{track.summary}</CardDescription>
                </CardHeader>
                <CardContent className="flex flex-col gap-3">
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary">
                      {hydrated
                        ? `${counts.completed}/${counts.total} selesai`
                        : `${counts.total} pelajaran`}
                    </Badge>
                    {hydrated &&
                    counts.completed > 0 &&
                    counts.completed === counts.total ? (
                      <CheckCircle2
                        className="size-4 text-emerald-600"
                        aria-label="Track selesai"
                      />
                    ) : null}
                  </div>
                  <Button variant="outline" size="sm" asChild>
                    <Link href={`/help/${track.id}`}>Buka track</Link>
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {hydrated && progress.completedLessonKeys.length > 0 ? (
          <p className="text-muted-foreground text-sm">
            {progress.completedLessonKeys.filter((key) => {
              const lesson = getLessonByKey(key);
              return lesson
                ? isLessonComplete(progress, getLessonKey(lesson))
                : false;
            }).length}{" "}
            pelajaran ditandai selesai di perangkat ini.
          </p>
        ) : null}
      </div>
    </PageShell>
  );
}
