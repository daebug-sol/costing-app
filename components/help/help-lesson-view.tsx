"use client";

import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  ExternalLink,
  Lightbulb,
  TriangleAlert,
} from "lucide-react";
import Link from "next/link";
import { useEffect } from "react";
import { HelpDemo } from "@/components/help/help-demo-registry";
import { useHelpProgress } from "@/components/help/use-help-progress";
import { PageShell } from "@/components/page-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  getAdjacentLessons,
  getLesson,
  getLessonKey,
  getTrack,
} from "@/lib/help/catalog";
import { isLessonComplete } from "@/lib/help/progress";
import { cn } from "@/lib/utils";

export function HelpLessonView({
  trackId,
  slug,
}: {
  trackId: string;
  slug: string;
}) {
  const lesson = getLesson(trackId, slug);
  const track = lesson ? getTrack(lesson.track) : undefined;
  const { progress, hydrated, openLesson, completeLesson } = useHelpProgress();

  useEffect(() => {
    if (!lesson) return;
    openLesson(getLessonKey(lesson));
  }, [lesson, openLesson]);

  if (!lesson) return null;

  const key = getLessonKey(lesson);
  const { prev, next } = getAdjacentLessons(lesson);
  const done = hydrated && isLessonComplete(progress, key);
  const activeDemoId =
    lesson.steps.map((s) => s.demoId).find(Boolean) ?? undefined;

  return (
    <PageShell
      width="wide"
      eyebrow={track?.title ?? "Help"}
      title={lesson.title}
      description={lesson.summary}
      actions={
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="secondary">{lesson.durationMin} mnt</Badge>
          <Button variant="outline" size="sm" asChild>
            <Link href={`/help/${lesson.track}`}>
              <ArrowLeft data-icon="inline-start" />
              Track
            </Link>
          </Button>
        </div>
      }
    >
      <div
        className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(240px,320px)]"
        data-testid="help-lesson-view"
      >
        <div className="flex flex-col gap-6">
          <nav aria-label="Daftar langkah">
            <ol className="flex flex-col gap-2">
              {lesson.steps.map((step, index) => (
                <li key={`${step.title}-${index}`}>
                  <a
                    href={`#help-step-${index + 1}`}
                    className="text-muted-foreground hover:text-foreground text-sm transition-colors"
                  >
                    {index + 1}. {step.title}
                  </a>
                </li>
              ))}
            </ol>
          </nav>

          <ol className="flex flex-col gap-4">
            {lesson.steps.map((step, index) => (
              <li key={`${step.title}-${index}`} id={`help-step-${index + 1}`}>
                <Card size="sm" className="shadow-sm">
                  <CardHeader>
                    <CardTitle className="text-base">
                      <span className="text-muted-foreground mr-2 font-normal">
                        Langkah {index + 1}
                      </span>
                      {step.title}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="flex flex-col gap-3">
                    <p className="text-sm text-foreground leading-relaxed">
                      {step.body}
                    </p>
                    {step.uiHint ? (
                      <p className="text-muted-foreground text-xs">
                        Petunjuk UI: {step.uiHint}
                      </p>
                    ) : null}
                    {step.deepLink ? (
                      <Button variant="outline" size="sm" className="w-fit" asChild>
                        <Link href={step.deepLink}>
                          Buka di aplikasi
                          <ExternalLink data-icon="inline-end" />
                        </Link>
                      </Button>
                    ) : null}
                  </CardContent>
                </Card>
              </li>
            ))}
          </ol>

          {lesson.tips && lesson.tips.length > 0 ? (
            <Card size="sm" className="shadow-sm">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Lightbulb className="size-4" aria-hidden />
                  Tips
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="text-muted-foreground flex list-disc flex-col gap-1 pl-5 text-sm">
                  {lesson.tips.map((tip) => (
                    <li key={tip}>{tip}</li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          ) : null}

          {lesson.commonMistakes && lesson.commonMistakes.length > 0 ? (
            <Card size="sm" className="shadow-sm">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <TriangleAlert className="size-4" aria-hidden />
                  Kesalahan umum
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="text-muted-foreground flex list-disc flex-col gap-1 pl-5 text-sm">
                  {lesson.commonMistakes.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          ) : null}

          <div className="flex flex-col gap-3 border-t border-border pt-4 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
            <Button
              type="button"
              onClick={() => completeLesson(key)}
              disabled={done}
              data-testid="help-mark-complete"
              className={cn(done && "opacity-80")}
            >
              <CheckCircle2 data-icon="inline-start" />
              {done ? "Sudah selesai" : "Tandai selesai"}
            </Button>

            <div className="flex flex-wrap gap-2">
              {prev ? (
                <Button variant="outline" size="sm" asChild>
                  <Link href={`/help/${prev.track}/${prev.slug}`}>
                    <ArrowLeft data-icon="inline-start" />
                    Sebelumnya
                  </Link>
                </Button>
              ) : null}
              {next ? (
                <Button variant="outline" size="sm" asChild>
                  <Link href={`/help/${next.track}/${next.slug}`}>
                    Berikutnya
                    <ArrowRight data-icon="inline-end" />
                  </Link>
                </Button>
              ) : (
                <Button variant="outline" size="sm" asChild>
                  <Link href="/help">Kembali ke hub</Link>
                </Button>
              )}
            </div>
          </div>
        </div>

        <aside className="flex flex-col gap-4 lg:sticky lg:top-20 lg:self-start">
          {activeDemoId ? <HelpDemo demoId={activeDemoId} /> : null}
          {lesson.relatedRoutes[0] ? (
            <Button asChild>
              <Link href={lesson.relatedRoutes[0]}>
                Buka di aplikasi
                <ExternalLink data-icon="inline-end" />
              </Link>
            </Button>
          ) : null}
        </aside>
      </div>
    </PageShell>
  );
}
