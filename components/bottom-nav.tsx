"use client";

import {
  BookOpen,
  Calculator,
  Database,
  LayoutDashboard,
  ShieldCheck,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useI18n } from "@/components/i18n-provider";
import { getMainNav, type MainNavItem } from "@/lib/nav-items";
import { cn } from "@/lib/utils";
import { useCostingStore } from "@/store/costingStore";

const ICONS: Record<MainNavItem["icon"], LucideIcon> = {
  dashboard: LayoutDashboard,
  database: Database,
  costing: Calculator,
  documentation: BookOpen,
  operator: ShieldCheck,
};

/** Phone/small-tablet main navigation. Same items as the top bar. */
export function BottomNav() {
  const { t } = useI18n();
  const pathname = usePathname();
  const role = useCostingStore((s) => s.role);
  const permissions = useCostingStore((s) => s.permissions);
  const isOperator = useCostingStore((s) => s.isOperator);

  const items = getMainNav(role, permissions, isOperator);

  return (
    <nav
      aria-label={t("nav.bottomLabel")}
      className="fixed inset-x-0 bottom-0 z-50 border-t border-border bg-card pb-[env(safe-area-inset-bottom)] lg:hidden"
    >
      <ul className="mx-auto flex max-w-xl items-stretch">
        {items.map(({ href, labelKey, icon }) => {
          const Icon = ICONS[icon];
          const active =
            href === "/"
              ? pathname === "/"
              : pathname === href || pathname.startsWith(`${href}/`);
          return (
            <li key={href} className="min-w-0 flex-1">
              <Link
                href={href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex h-14 flex-col items-center justify-center gap-0.5 px-1 text-xs font-medium transition-colors",
                  active
                    ? "text-foreground"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <Icon className="size-5" aria-hidden />
                <span className="w-full truncate text-center">{t(labelKey)}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
