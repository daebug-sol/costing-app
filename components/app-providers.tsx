"use client";

import { ClerkProvider } from "@clerk/nextjs";
import { Navbar } from "@/components/Navbar";
import { Toaster } from "@/components/Toast";
import { TooltipProvider } from "@/components/ui/tooltip";

export function AppProviders({ children }: { children: React.ReactNode }) {
  const useClerk = Boolean(process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY);

  const shell = (
    <TooltipProvider>
      <Navbar />
      <main className="min-h-screen bg-background pt-14">{children}</main>
      <Toaster />
    </TooltipProvider>
  );

  if (useClerk) {
    return <ClerkProvider>{shell}</ClerkProvider>;
  }

  return shell;
}
