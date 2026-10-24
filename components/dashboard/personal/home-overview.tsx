"use client";

import type { ReactNode } from "react";
import { useI18n } from "@/components/i18n-provider";
import { FollowUpItems } from "@/components/dashboard/personal/follow-up-list";
import { GreetingCard } from "@/components/dashboard/personal/greeting-card";
import { PersonalKpis, type PersonalKpi } from "@/components/dashboard/personal/personal-kpis";
import { TargetBody, useTargetTitle } from "@/components/dashboard/personal/target-card";
import { CardTitle } from "@/components/ui/card";
import type { DashboardPersonal } from "@/lib/dashboard-personal";

/**
 * The dashboard's first card: greeting band, then the figures a salesperson
 * checks every day (KPIs, revenue trend, target, follow-ups) in one place.
 */
export function HomeOverview({
  name,
  personal,
  now,
  kpis,
  trend,
  showTarget,
  onTargetSaved,
}: {
  name: string;
  personal: DashboardPersonal;
  now: Date;
  kpis: PersonalKpi[];
  /** The revenue trend chart (loaded lazily by the page). */
  trend: ReactNode;
  /** Only when the dashboard is about the signed-in member. */
  showTarget: boolean;
  onTargetSaved: () => void;
}) {
  const { t } = useI18n();
  const targetTitle = useTargetTitle(now);

  return (
    <section
      className="min-w-0 overflow-hidden rounded-xl bg-card ring-1 ring-border"
      data-testid="dashboard-personal-home"
    >
      <GreetingCard name={name} personal={personal} now={now} />
      <div className="grid min-w-0 gap-6 p-4 sm:p-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <div className="flex min-w-0 flex-col gap-6">
          <PersonalKpis items={kpis} variant="strip" />
          <div className="flex min-w-0 flex-col gap-3">
            <CardTitle>{t("dashboard.revenueTrend.title")}</CardTitle>
            {trend}
          </div>
        </div>
        <div className="flex min-w-0 flex-col gap-6 border-border lg:border-l lg:pl-6">
          {showTarget ? (
            <div className="flex flex-col gap-3" data-testid="dashboard-target" data-tour="dashboard.target">
              <CardTitle>{targetTitle}</CardTitle>
              <TargetBody personal={personal} canEditTarget onSaved={onTargetSaved} />
            </div>
          ) : null}
          <div className="flex flex-col gap-3" data-testid="dashboard-follow-ups">
            <CardTitle>
              {t("dashboard.personal.followUps.title")}
              {personal.followUpTotal > 0 ? ` · ${personal.followUpTotal}` : ""}
            </CardTitle>
            <FollowUpItems items={personal.followUps} total={personal.followUpTotal} limit={4} />
          </div>
        </div>
      </div>
    </section>
  );
}
