"use client";

import { CircleHelp } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { getLessonKey, lessonsForRoute } from "@/lib/help/catalog";
import { cn } from "@/lib/utils";

type ContextualHelpLinkProps = {
  /** Override pathname when rendering outside the current route context. */
  pathname?: string;
  className?: string;
  label?: string;
};

export function ContextualHelpLink({
  pathname: pathnameProp,
  className,
  label = "Bantuan",
}: ContextualHelpLinkProps) {
  const routePath = usePathname();
  const pathname = pathnameProp ?? routePath ?? "/";
  const lessons = lessonsForRoute(pathname);
  const lesson = lessons[0];
  const href = lesson
    ? `/help/${lesson.track}/${lesson.slug}`
    : "/help";

  return (
    <Link
      href={href}
      className={cn(
        "text-muted-foreground hover:text-foreground inline-flex items-center gap-1.5 text-sm transition-colors",
        className
      )}
      data-testid="contextual-help-link"
      title={
        lesson
          ? `Bantuan: ${lesson.title}`
          : "Buka Help"
      }
    >
      <CircleHelp className="size-3.5 shrink-0" aria-hidden />
      <span>{label}</span>
      {lesson ? (
        <span className="sr-only">
          {getLessonKey(lesson)}
        </span>
      ) : null}
    </Link>
  );
}
