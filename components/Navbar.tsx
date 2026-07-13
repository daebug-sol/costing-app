"use client";

import {
  OrganizationSwitcher,
  Show,
  SignInButton,
  SignUpButton,
  UserButton,
} from "@clerk/nextjs";
import { Factory, Menu, X } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/", label: "Dashboard" },
  { href: "/database", label: "Database" },
  { href: "/costing", label: "Costing" },
  { href: "/documentation", label: "Documentation" },
  { href: "/settings", label: "Settings" },
] as const;

function NavLinks({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();

  return (
    <nav
      className="flex flex-col gap-1 md:flex-row md:items-center md:gap-0.5"
      aria-label="Main"
    >
      {navItems.map(({ href, label }) => {
        const active =
          href === "/"
            ? pathname === "/"
            : pathname === href || pathname.startsWith(`${href}/`);

        return (
          <Link
            key={href}
            href={href}
            onClick={onNavigate}
            className={cn(
              "rounded-md px-3 py-2 text-sm font-medium transition-colors",
              active
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
            )}
          >
            {label}
          </Link>
        );
      })}
    </nav>
  );
}

function AuthControls() {
  if (!process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY) {
    return (
      <Badge variant="secondary" className="hidden font-normal sm:inline-flex">
        Dev mode
      </Badge>
    );
  }

  return (
    <>
      <Show when="signed-in">
        <OrganizationSwitcher
          hidePersonal
          appearance={{
            elements: { rootBox: "hidden sm:flex" },
          }}
        />
        <UserButton />
      </Show>
      <Show when="signed-out">
        <SignInButton mode="modal">
          <Button variant="outline" size="sm">
            Masuk
          </Button>
        </SignInButton>
        <SignUpButton mode="modal">
          <Button size="sm">Daftar</Button>
        </SignUpButton>
      </Show>
    </>
  );
}

export function Navbar() {
  const [open, setOpen] = useState(false);

  return (
    <header className="fixed top-0 z-50 w-full border-b border-border bg-card/95 backdrop-blur-md supports-[backdrop-filter]:bg-card/80">
      <div className="mx-auto flex h-14 max-w-[1600px] items-center gap-3 px-4 sm:px-6">
        <div className="flex min-w-0 flex-1 items-center md:min-w-[200px] md:flex-none">
          <Link
            href="/"
            className="text-foreground flex min-w-0 items-center gap-2"
          >
            <span className="bg-primary text-primary-foreground flex size-8 shrink-0 items-center justify-center rounded-lg">
              <Factory className="size-4" aria-hidden />
            </span>
            <span className="truncate font-semibold tracking-tight">
              Costing App
            </span>
          </Link>
        </div>

        <div className="hidden min-w-0 flex-1 justify-center md:flex">
          <NavLinks />
        </div>

        <div className="flex shrink-0 items-center justify-end gap-2 md:min-w-[200px]">
          <AuthControls />

          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="md:hidden"
            aria-expanded={open}
            aria-label={open ? "Close menu" : "Open menu"}
            onClick={() => setOpen((v) => !v)}
          >
            {open ? <X data-icon="inline-start" /> : <Menu data-icon="inline-start" />}
          </Button>
        </div>
      </div>

      <div
        className={cn(
          "border-b border-border bg-card md:hidden",
          open ? "block" : "hidden"
        )}
      >
        <div className="mx-auto flex max-w-[1600px] flex-col gap-3 px-4 py-3 sm:px-6">
          <NavLinks onNavigate={() => setOpen(false)} />
        </div>
      </div>

      <div className="border-t border-border bg-card/80">
        <div className="mx-auto flex max-w-[1600px] flex-wrap items-center justify-center gap-x-4 gap-y-1 px-4 py-2 text-xs text-muted-foreground sm:px-6">
          <Link href="/legal/privacy" className="hover:text-foreground transition-colors">
            Kebijakan Privasi
          </Link>
          <span aria-hidden className="text-border">
            ·
          </span>
          <Link href="/legal/terms" className="hover:text-foreground transition-colors">
            Syarat & Ketentuan
          </Link>
        </div>
      </div>
    </header>
  );
}
