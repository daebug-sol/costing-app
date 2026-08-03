"use client";

import { ClerkProvider } from "@clerk/nextjs";
import { dark, shadcn } from "@clerk/ui/themes";
import { Navbar } from "@/components/Navbar";
import { Toaster } from "@/components/Toast";
import { ThemeProvider, useTheme } from "@/components/theme-provider";
import { TooltipProvider } from "@/components/ui/tooltip";

function AppShell({ children }: { children: React.ReactNode }) {
  const { resolvedAppearance } = useTheme();

  const shell = (
    <TooltipProvider>
      <Navbar />
      <main className="min-h-screen bg-background pt-14">{children}</main>
      <Toaster />
    </TooltipProvider>
  );

  const useClerk = Boolean(process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY);

  if (useClerk) {
    return (
      <ClerkProvider
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
      <AppShell>{children}</AppShell>
    </ThemeProvider>
  );
}
