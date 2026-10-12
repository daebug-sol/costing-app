"use client";

import { useI18n } from "@/components/i18n-provider";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { FollowUp } from "@/lib/dashboard-personal";
import type { MessageKey } from "@/lib/i18n/messages";
import { cn } from "@/lib/utils";

const TITLE_KEYS: Record<FollowUp["kind"], MessageKey> = {
  "quotation-expiring": "dashboard.personal.followUps.quotation",
  "invoice-overdue": "dashboard.personal.followUps.invoice",
  "order-waiting": "dashboard.personal.followUps.order",
};

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
        {items.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            {t("dashboard.personal.followUps.empty")}
          </p>
        ) : (
          <ul className="divide-y divide-border">
            {items.map((item) => {
              const due =
                item.dueLabel === "overdue"
                  ? t("dashboard.personal.due.overdue", { days: item.overdueDays })
                  : t(`dashboard.personal.due.${item.dueLabel}` as MessageKey);
              return (
                <li key={item.id} className="flex items-start justify-between gap-4 py-3 first:pt-0 last:pb-0">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{t(TITLE_KEYS[item.kind], { ref: item.ref })}</p>
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
                </li>
              );
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
