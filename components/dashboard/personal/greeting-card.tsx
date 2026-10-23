"use client";

import Link from "next/link";
import { useI18n } from "@/components/i18n-provider";
import { RichLine } from "@/components/dashboard/personal/rich-line";
import { Button } from "@/components/ui/button";
import type { DashboardPersonal } from "@/lib/dashboard-personal";
import { formatRpShort } from "@/lib/utils/format";

export type Greeting = "pagi" | "siang" | "sore" | "malam";

export function greetingForHour(hour: number): Greeting {
  if (hour < 11) return hour >= 4 ? "pagi" : "malam";
  if (hour < 15) return "siang";
  if (hour < 18) return "sore";
  return "malam";
}

/** The inverse greeting band at the top of the dashboard overview. */
export function GreetingCard({
  name,
  personal,
  now,
}: {
  name: string;
  personal: DashboardPersonal;
  now: Date;
}) {
  const { t, locale } = useI18n();
  const today = new Intl.DateTimeFormat(locale === "en" ? "en-US" : "id-ID", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(now);
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
    <div
      className="flex flex-col gap-6 bg-inverse px-6 py-6 text-inverse-foreground sm:flex-row sm:items-end sm:justify-between sm:px-8 sm:py-8"
      data-testid="dashboard-greeting"
    >
      <div className="flex min-w-0 flex-col gap-2">
        <p className="text-sm text-inverse-foreground/70" data-volatile>
          {today}
        </p>
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
      <div className="flex shrink-0 flex-wrap gap-3">
        <Button asChild className="bg-inverse-foreground text-inverse hover:bg-inverse-foreground/90">
          <Link href="/costing">{t("dashboard.personal.cta.newCosting")}</Link>
        </Button>
      </div>
    </div>
  );
}
