"use client";

import { Factory, Menu, X } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
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
      className="flex flex-col gap-0.5 md:flex-row md:items-stretch md:gap-0"
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
              "flex items-center px-3 py-2 text-sm font-medium transition-colors md:h-14 md:border-b-2",
              active
                ? "text-primary md:border-primary"
                : "text-muted-foreground hover:text-foreground md:border-transparent"
            )}
          >
            {label}
          </Link>
        );
      })}
    </nav>
  );
}

export function Navbar() {
  const [open, setOpen] = useState(false);

  return (
    <header className="bg-card fixed top-0 z-50 w-full border-b border-border">
      <div className="mx-auto flex h-14 max-w-[1600px] items-center gap-3 px-4 sm:px-6">
        <div className="flex min-w-0 flex-1 items-center md:min-w-[200px] md:flex-none">
          <Link
            href="/"
            className="text-foreground flex min-w-0 items-center gap-2"
          >
            <Factory className="size-6 shrink-0" aria-hidden />
            <span className="truncate font-semibold">Costing App</span>
          </Link>
        </div>

        <div className="hidden min-w-0 flex-1 justify-center md:flex">
          <NavLinks />
        </div>

        <div className="flex shrink-0 items-center justify-end gap-2 md:min-w-[200px]">
          <Badge
            variant="secondary"
            className="border-border bg-muted font-normal text-muted-foreground"
          >
            PT Thermal True
          </Badge>

          <button
            type="button"
            className="text-muted-foreground hover:bg-muted hover:text-foreground inline-flex items-center justify-center rounded-md p-2 md:hidden"
            aria-expanded={open}
            aria-label={open ? "Close menu" : "Open menu"}
            onClick={() => setOpen((v) => !v)}
          >
            {open ? <X className="size-5" /> : <Menu className="size-5" />}
          </button>
        </div>
      </div>

      <div
        className={cn(
          "bg-card border-border border-b md:hidden",
          open ? "block" : "hidden"
        )}
      >
        <div className="mx-auto max-w-[1600px] px-4 py-3 sm:px-6">
          <NavLinks onNavigate={() => setOpen(false)} />
        </div>
      </div>
    </header>
  );
}
