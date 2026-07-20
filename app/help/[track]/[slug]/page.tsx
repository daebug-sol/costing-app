import { HelpLessonView } from "@/components/help/help-lesson-view";
import { getLesson } from "@/lib/help/catalog";
import { notFound } from "next/navigation";

type Props = {
  params: Promise<{ track: string; slug: string }>;
};

export default async function HelpLessonPage({ params }: Props) {
  const { track, slug } = await params;
  if (!getLesson(track, slug)) notFound();
  return <HelpLessonView trackId={track} slug={slug} />;
}
