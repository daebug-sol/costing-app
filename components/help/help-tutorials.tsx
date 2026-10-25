"use client";

import { MousePointerClick } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { useMemo } from "react";
import { ExplorerBadge, ExplorerRow, ExplorerRows } from "@/components/file-explorer";
import { useI18n } from "@/components/i18n-provider";
import { useTour } from "@/components/tour/tour-provider";
import { useIsDesktop } from "@/components/tour/use-tour-target";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { TUTORIALS } from "@/content/tutorials";
import { helpTutorialsCopy as copy } from "@/content/tutorials/help";
import { routeMatches, visibleSteps } from "@/lib/tour/machine";
import { TOUR_KEYS, type TourContext, type TourDefinition } from "@/lib/tour/types";
import { useCostingStore } from "@/store/costingStore";

/** Help hub list of every tutorial the user may run, with its status and a Mulai / Ulangi button. */
export function HelpTutorials() {
  const { locale } = useI18n();
  const { progress, start } = useTour();
  const router = useRouter();
  const pathname = usePathname() ?? "/help";
  const permissions = useCostingStore((s) => s.permissions);
  const ahu = useCostingStore((s) => s.modules.ahu);
  const isDesktop = useIsDesktop();

  const tutorials = useMemo(() => {
    const ctx: TourContext = { permissions, modules: { ahu }, isDesktop };
    return TOUR_KEYS.map((key) => TUTORIALS[key]).filter(
      (def) =>
        (!def.permission || permissions.includes(def.permission)) &&
        visibleSteps(def, ctx).length > 0
    );
  }, [permissions, ahu, isDesktop]);

  if (tutorials.length === 0) return null;

  // A tutorial for this page (or the welcome tour, which runs anywhere) starts
  // in place; the others open their page, which starts them without an invite.
  const run = (def: TourDefinition) => {
    if (!def.route || routeMatches(def.route, pathname)) start(def.key);
    else router.push(`${def.route}?tour=${def.key}`);
  };

  return (
    <Card
      size="sm"
      data-testid="help-tutorials"
      aria-labelledby="help-tutorials-heading"
      className="gap-0 pb-0 shadow-sm"
      role="region"
    >
      <CardHeader data-tour="help.tutorials" className="border-b">
        <CardTitle id="help-tutorials-heading" className="text-base">
          {copy.heading[locale]}
        </CardTitle>
        <CardDescription>{copy.description[locale]}</CardDescription>
      </CardHeader>
      <ExplorerRows>
        {tutorials.map((def, i) => {
          const title =
            def.key === "welcome"
              ? copy.welcomeTitle[locale]
              : (def.invite?.title[locale] ?? def.key);
          const minutes = def.key === "welcome" ? 1 : def.invite?.minutes;
          const status = progress[def.key];
          const replay = status !== undefined;
          return (
            <ExplorerRow
              key={def.key}
              icon={<MousePointerClick className="size-5" aria-hidden />}
              title={title}
              meta={
                <>
                  {minutes ? (
                    <span>{copy.minutes[locale].replace("{minutes}", String(minutes))}</span>
                  ) : null}
                  <ExplorerBadge>{copy.status[status ?? "none"][locale]}</ExplorerBadge>
                </>
              }
              trailing={
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="shrink-0"
                  data-tour={i === 0 ? "help.tutorials.replay" : undefined}
                  aria-label={(replay ? copy.replayLabel : copy.startLabel)[
                    locale
                  ].replace("{title}", title)}
                  onClick={() => run(def)}
                >
                  {replay ? copy.replay[locale] : copy.start[locale]}
                </Button>
              }
            />
          );
        })}
      </ExplorerRows>
    </Card>
  );
}
