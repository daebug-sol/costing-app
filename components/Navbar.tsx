"use client";

import {
  Show,
  SignInButton,
  SignUpButton,
  UserButton,
  useOrganization,
} from "@clerk/nextjs";
import { Building2, CircleHelp, RotateCcw, Settings } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { useI18n } from "@/components/i18n-provider";
import { OrgSwitchDialog } from "@/components/org-switch-dialog";
import { useTour } from "@/components/tour/tour-provider";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { lessonsForRoute } from "@/lib/help/catalog";
import { getMainNav } from "@/lib/nav-items";
import { cn } from "@/lib/utils";
import { useCostingStore } from "@/store/costingStore";

function NavLinks() {
  const { t } = useI18n();
  const pathname = usePathname();
  const role = useCostingStore((s) => s.role);
  const permissions = useCostingStore((s) => s.permissions);
  const isOperator = useCostingStore((s) => s.isOperator);

  const visible = getMainNav(role, permissions, isOperator);

  const linkClass = (href: string) => {
    const active =
      href === "/"
        ? pathname === "/"
        : pathname === href || pathname.startsWith(`${href}/`);
    return cn(
      "rounded-full px-4 py-2 text-sm font-medium transition-colors",
      active
        ? "bg-primary text-primary-foreground"
        : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
    );
  };

  return (
    <nav
      className="flex items-center gap-0.5"
      aria-label={t("nav.mainLabel")}
    >
      {visible.map(({ href, labelKey, icon }) => (
        <Link key={href} href={href} className={linkClass(href)} data-tour={`nav.${icon}`}>
          {t(labelKey)}
        </Link>
      ))}
    </nav>
  );
}

const HAS_CLERK = Boolean(process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY);

/** Help lesson for the current route, or the Help hub when none matches. */
function useHelpHref() {
  const pathname = usePathname() ?? "/";
  const lesson = lessonsForRoute(pathname)[0];
  return lesson ? `/help/${lesson.track}/${lesson.slug}` : "/help";
}

/** Header Help icon; only without Clerk (dev), where there is no account menu to hold Help. */
function HelpLink() {
  const { t } = useI18n();
  const href = useHelpHref();
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          asChild
          aria-label={t("nav.helpAria")}
        >
          <Link href={href} data-testid="header-help-link">
            <CircleHelp aria-hidden />
          </Link>
        </Button>
      </TooltipTrigger>
      <TooltipContent>{t("nav.helpAria")}</TooltipContent>
    </Tooltip>
  );
}

/** Avatar menu: active organization on top (switch), then org settings, Help, tour, own account, sign out. */
function AccountMenu() {
  const { t } = useI18n();
  const helpHref = useHelpHref();
  const { start } = useTour();
  const { organization } = useOrganization();
  const [switchOpen, setSwitchOpen] = useState(false);

  return (
    <>
      <span data-tour="account.menu" className="inline-flex">
        <UserButton>
          <UserButton.MenuItems>
            {organization ? (
              <UserButton.Action
                label={t("nav.orgItem", { name: organization.name })}
                labelIcon={<Building2 className="size-4" aria-hidden />}
                onClick={() => setSwitchOpen(true)}
              />
            ) : null}
            <UserButton.Link
              label={t("nav.orgSettings")}
              labelIcon={<Settings className="size-4" aria-hidden />}
              href="/settings"
            />
            <UserButton.Link
              label={t("nav.help")}
              labelIcon={<CircleHelp className="size-4" aria-hidden />}
              href={helpHref}
            />
            <UserButton.Action
              label={t("tour.replayWelcome")}
              labelIcon={<RotateCcw className="size-4" aria-hidden />}
              onClick={() => start("welcome")}
            />
            <UserButton.Action label="manageAccount" />
            <UserButton.Action label="signOut" />
          </UserButton.MenuItems>
        </UserButton>
      </span>
      <OrgSwitchDialog open={switchOpen} onOpenChange={setSwitchOpen} />
    </>
  );
}

function AuthControls() {
  const { t } = useI18n();
  if (!process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY) {
    return (
      <Button variant="ghost" size="sm" asChild>
        <Link href="/settings" data-tour="account.menu">
          {t("nav.settings")}
        </Link>
      </Button>
    );
  }

  return (
    <>
      <Show when="signed-in">
        <AccountMenu />
      </Show>
      <Show when="signed-out">
        <SignInButton mode="modal">
          <Button variant="outline" size="sm">
            {t("nav.signIn")}
          </Button>
        </SignInButton>
        <SignUpButton mode="modal">
          <Button size="sm">{t("nav.signUp")}</Button>
        </SignUpButton>
      </Show>
    </>
  );
}

export function Navbar() {
  const loadOrgModules = useCostingStore((s) => s.loadOrgModules);

  useEffect(() => {
    void loadOrgModules().catch(() => undefined);
  }, [loadOrgModules]);

  return (
    <header className="fixed top-0 z-50 w-full border-b border-border bg-card">
      <div className="flex h-14 w-full items-center gap-3 px-4 sm:px-6">
        <div className="flex min-w-0 flex-1 items-center lg:min-w-[200px] lg:flex-none">
          <Link
            href="/"
            className="text-foreground min-w-0 shrink-0 font-dot text-lg leading-none sm:text-2xl font-black tracking-wide uppercase"
          >
            Costing
          </Link>
        </div>

        <div className="hidden min-w-0 flex-1 justify-center lg:flex">
          <NavLinks />
        </div>

        <div className="flex shrink-0 items-center justify-end gap-2 lg:min-w-[200px]">
          {HAS_CLERK ? null : <HelpLink />}
          <AuthControls />
        </div>
      </div>
    </header>
  );
}
