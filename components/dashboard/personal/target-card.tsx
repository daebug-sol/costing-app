"use client";

import { useI18n } from "@/components/i18n-provider";
import { DotMeter } from "@/components/dot/dot-meter";
import { DotNumber } from "@/components/dot/dot-number";
import { DotRing } from "@/components/dot/dot-ring";
import { RichLine } from "@/components/dashboard/personal/rich-line";
import { TargetDialog } from "@/components/dashboard/personal/target-dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { DashboardPersonal } from "@/lib/dashboard-personal";
import { formatRpShort } from "@/lib/utils/format";

function monthName(month: string, locale: string): string {
  const [year, m] = month.split("-").map(Number);
  return new Intl.DateTimeFormat(locale === "en" ? "en-US" : "id-ID", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(Date.UTC(year, (m ?? 1) - 1, 1)));
}

export function TargetCard({
  personal,
  canEditTarget,
  onSaved,
  now,
}: {
  personal: DashboardPersonal;
  /** Only true when the dashboard is about the signed-in member. */
  canEditTarget: boolean;
  onSaved: () => void;
  now: Date;
}) {
  const { t, locale } = useI18n();
  const target = personal.monthlyTarget;
  const title = t("dashboard.personal.target.title", {
    month: new Intl.DateTimeFormat(locale === "en" ? "en-US" : "id-ID", {
      month: "long",
      timeZone: "UTC",
    }).format(now),
  });

  if (target === null) {
    return (
      <Card data-testid="dashboard-target">
        <CardHeader>
          <CardTitle>{title}</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col items-start gap-4">
          <p className="text-sm text-muted-foreground">{t("dashboard.personal.target.empty")}</p>
          {canEditTarget ? (
            <TargetDialog
              current={null}
              triggerLabel={t("dashboard.personal.target.set")}
              onSaved={onSaved}
            />
          ) : null}
        </CardContent>
      </Card>
    );
  }

  const pct = Math.round(personal.progressPct ?? 0);
  const delta = personal.paceDeltaValue ?? 0;
  const ringLabel = t("dashboard.personal.target.ringLabel", { pct });
  return (
    <Card data-testid="dashboard-target">
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-5">
        <div className="flex items-center gap-6">
          <DotRing value={Math.min(pct, 100)} label={ringLabel} pointer className="w-32 shrink-0 sm:w-40">
            <DotNumber className="text-2xl sm:text-3xl">{pct}%</DotNumber>
          </DotRing>
          <div className="flex min-w-0 flex-col gap-1">
            <p className="tabular-nums">
              <span className="text-xl font-semibold">{formatRpShort(personal.bookedThisMonth)}</span>{" "}
              <span className="text-sm text-muted-foreground">
                {t("dashboard.personal.target.of", { target: formatRpShort(target) })}
              </span>
            </p>
            <p className="text-sm">
              <RichLine
                tones={["ink"]}
                text={t("dashboard.personal.target.remaining", {
                  remaining: formatRpShort(personal.remaining ?? 0),
                  days: personal.daysLeftInMonth,
                })}
              />
            </p>
            <p className="text-sm text-muted-foreground">
              <RichLine
                tones={[delta >= 0 ? "positive" : "signal"]}
                text={t(
                  delta >= 0 ? "dashboard.personal.target.ahead" : "dashboard.personal.target.behind",
                  { delta: formatRpShort(Math.abs(delta)) }
                )}
              />
            </p>
          </div>
        </div>
        <DotMeter
          value={Math.min(pct, 100)}
          pace={personal.idealPct}
          label={ringLabel}
          tone={delta >= 0 ? "positive" : "ink"}
        />
        <div className="flex flex-wrap items-center justify-between gap-3">
          {personal.bestMonth ? (
            <p className="text-sm text-muted-foreground">
              {t("dashboard.personal.target.best", {
                value: formatRpShort(personal.bestMonth.booked),
                month: monthName(personal.bestMonth.month, locale),
              })}
            </p>
          ) : (
            <span />
          )}
          {canEditTarget ? (
            <TargetDialog
              current={target}
              triggerLabel={t("dashboard.personal.target.edit")}
              onSaved={onSaved}
            />
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
}
