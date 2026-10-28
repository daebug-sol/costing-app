"use client";

import { ClerkProvider } from "@clerk/nextjs";
import { dark, shadcn } from "@clerk/ui/themes";
import { I18nProvider, useI18n } from "@/components/i18n-provider";
import { BottomNav } from "@/components/bottom-nav";
import { Navbar } from "@/components/Navbar";
import { Toaster } from "@/components/Toast";
import { TrialBanner } from "@/components/trial-banner";
import { ThemeProvider, useTheme } from "@/components/theme-provider";
import { TooltipProvider } from "@/components/ui/tooltip";
import { TourProvider } from "@/components/tour/tour-provider";

function AppShell({ children }: { children: React.ReactNode }) {
  const { resolvedAppearance } = useTheme();
  const { t } = useI18n();

  const shell = (
    <TooltipProvider>
      <TourProvider>
        <Navbar />
        <main className="min-h-screen bg-background pt-14 pb-16 lg:pb-0">
          <TrialBanner />
          {children}
        </main>
        <BottomNav />
        <Toaster />
      </TourProvider>
    </TooltipProvider>
  );

  const useClerk = Boolean(process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY);

  if (useClerk) {
    return (
      <ClerkProvider
        localization={{
          userButton: {
            action__manageAccount: t("nav.account"),
            action__signOut: t("nav.signOut"),
          },
        }}
        appearance={{
          // Clerk Variables has no colorScheme; stack dark theme when app is dark.
          theme:
            resolvedAppearance === "dark" ? [shadcn, dark] : shadcn,
        }}
      >
        {shell}
      </ClerkProvider>
    );
  }

  return shell;
}

export function AppProviders({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider>
      <I18nProvider>
        <AppShell>{children}</AppShell>
      </I18nProvider>
    </ThemeProvider>
  );
}
