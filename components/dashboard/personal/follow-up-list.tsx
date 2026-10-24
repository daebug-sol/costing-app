"use client";

import Link from "next/link";
import { useI18n } from "@/components/i18n-provider";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { FollowUp } from "@/lib/dashboard-personal";
import type { MessageKey } from "@/lib/i18n/messages";
import { tourEvent } from "@/lib/tour/events";
import { cn } from "@/lib/utils";

const TITLE_KEYS: Record<FollowUp["kind"], MessageKey> = {
  "quotation-expiring": "dashboard.personal.followUps.quotation",
  "invoice-overdue": "dashboard.personal.followUps.invoice",
  "order-waiting": "dashboard.personal.followUps.order",
};

const BASE_PATHS: Record<FollowUp["kind"], string> = {
  "quotation-expiring": "/documentation",
  "invoice-overdue": "/invoices",
  "order-waiting": "/sales-orders",
};

/** Where a follow-up row opens: the document's own detail page. */
export function followUpHref(item: Pick<FollowUp, "kind" | "id">): string {
  return `${BASE_PATHS[item.kind]}?id=${encodeURIComponent(item.id)}`;
}

/** Follow-up rows without a card. `limit` shows the first n and says how many more there are. */
export function FollowUpItems({ items, total, limit }: { items: FollowUp[]; total: number; limit?: number }) {
  const { t } = useI18n();
  if (items.length === 0) {
    return <p className="text-sm text-muted-foreground">{t("dashboard.personal.followUps.empty")}</p>;
  }
  const shown = limit ? items.slice(0, limit) : items;
  const more = total - shown.length;
  return (
    <div className="flex flex-col gap-2">
      <ul className="divide-y divide-border" data-tour="dashboard.follow-up">
        {shown.map((item) => {
          const due =
            item.dueLabel === "overdue"
              ? t("dashboard.personal.due.overdue", { days: item.overdueDays })
              : t(`dashboard.personal.due.${item.dueLabel}` as MessageKey);
          return (
            <li key={item.id} className="py-3 first:pt-0 last:pb-0">
              <Link
                href={followUpHref(item)}
                onClick={() => tourEvent("dashboard.follow-up-opened")}
                className="group flex items-start justify-between gap-4 rounded-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium group-hover:underline">
                    {t(TITLE_KEYS[item.kind], { ref: item.ref })}
                  </p>
                  <p className="truncate text-sm text-muted-foreground">{item.party}</p>
                </div>
                <span
                  className={cn(
                    "shrink-0 text-xs font-medium",
                    item.dueLabel === "overdue" ? "text-signal" : "text-muted-foreground"
                  )}
                >
                  {due}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
      {more > 0 ? (
        <p className="text-xs text-muted-foreground">{t("dashboard.personal.followUps.more", { count: more })}</p>
      ) : null}
    </div>
  );
}

export function FollowUpList({ items, total }: { items: FollowUp[]; total: number }) {
  const { t } = useI18n();
  return (
    <Card data-testid="dashboard-follow-ups">
      <CardHeader>
        <CardTitle>{t("dashboard.personal.followUps.title")}</CardTitle>
        <p className="text-sm text-muted-foreground">
          {t("dashboard.personal.followUps.count", { count: total })}
        </p>
      </CardHeader>
      <CardContent>
        <FollowUpItems items={items} total={total} />
      </CardContent>
    </Card>
  );
}
