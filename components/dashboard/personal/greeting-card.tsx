"use client";

import Link from "next/link";
import { useI18n } from "@/components/i18n-provider";
import { RichLine } from "@/components/dashboard/personal/rich-line";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import type { DashboardPersonal } from "@/lib/dashboard-personal";
import { formatRpShort } from "@/lib/utils/format";

export type Greeting = "pagi" | "siang" | "sore" | "malam";

export function greetingForHour(hour: number): Greeting {
  if (hour < 11) return hour >= 4 ? "pagi" : "malam";
  if (hour < 15) return "siang";
  if (hour < 18) return "sore";
  return "malam";
}

export function GreetingCard({
  name,
  personal,
  now,
}: {
  name: string;
  personal: DashboardPersonal;
  now: Date;
}) {
  const { t } = useI18n();
  const greeting = t(`dashboard.personal.greeting.${greetingForHour(now.getHours())}`);
  const lines: Array<{ node: React.ReactNode; key: string }> = [];
  if (personal.followUpTotal > 0) {
    lines.push({
      key: "today",
      node: (
        <RichLine
          tones={["signal", "signal"]}
          text={t("dashboard.personal.lead.today", {
            followUps: personal.followUpTotal,
            expiring: personal.expiringQuotationCount,
          })}
        />
      ),
    });
  } else {
    lines.push({ key: "none", node: <span>{t("dashboard.personal.lead.none")}</span> });
  }
  if (personal.remaining !== null) {
    lines.push({
      key: "remaining",
      node: (
        <RichLine
          tones={["ink"]}
          text={t("dashboard.personal.lead.remaining", { remaining: formatRpShort(personal.remaining) })}
        />
      ),
    });
  }
  if (personal.newOrdersYesterday > 0) {
    lines.push({
      key: "orders",
      node: (
        <RichLine
          tones={["positive"]}
          text={t("dashboard.personal.lead.orders", { orders: personal.newOrdersYesterday })}
        />
      ),
    });
  }

  return (
    <Card tone="feature" data-testid="dashboard-greeting">
      <CardContent className="flex flex-col gap-6">
        <div className="flex flex-col gap-2">
          <h2 className="font-dot text-3xl font-black tracking-wide sm:text-4xl">
            {name ? `${greeting}, ${name}` : greeting}
          </h2>
          <p className="max-w-prose text-base leading-relaxed text-inverse-foreground/80">
            {lines.map((line, i) => (
              <span key={line.key}>
                {i > 0 ? " " : ""}
                {line.node}
              </span>
            ))}
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Button asChild className="bg-inverse-foreground text-inverse hover:bg-inverse-foreground/90">
            <Link href="/costing">{t("dashboard.personal.cta.newCosting")}</Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
