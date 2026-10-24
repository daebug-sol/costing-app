"use client";

import { Button } from "@/components/ui/button";
import { useI18n } from "@/components/i18n-provider";
import type { TourDefinition } from "@/lib/tour/types";

/** Small, non-blocking offer to start a module tutorial. */
export function TourInvite({
  def,
  onStart,
  onSkip,
}: {
  def: TourDefinition;
  onStart: () => void;
  onSkip: () => void;
}) {
  const { t, locale } = useI18n();
  if (!def.invite) return null;
  return (
    <div
      role="region"
      aria-label={def.invite.title[locale]}
      data-tour-invite={def.key}
      className="pointer-events-auto fixed inset-x-4 bottom-[calc(4rem+env(safe-area-inset-bottom))] z-[101] rounded-xl border border-border bg-popover p-4 text-popover-foreground lg:inset-x-auto lg:right-6 lg:bottom-6 lg:w-80"
    >
      <p className="text-base font-semibold">{def.invite.title[locale]}</p>
      <p className="mt-1 text-sm text-muted-foreground">
        {t("tour.inviteMinutes", { minutes: def.invite.minutes })}
      </p>
      <div className="mt-4 flex gap-2 lg:justify-end">
        <Button variant="ghost" size="lg" className="flex-1 lg:flex-none" onClick={onSkip}>
          {t("tour.skip")}
        </Button>
        <Button size="lg" className="flex-1 lg:flex-none" onClick={onStart}>
          {t("tour.start")}
        </Button>
      </div>
    </div>
  );
}
