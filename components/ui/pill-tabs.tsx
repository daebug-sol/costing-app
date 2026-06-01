"use client";

import * as React from "react";
import { motion, useReducedMotion } from "motion/react";
import { TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";

export const pillTabsListClass =
  "relative inline-grid h-auto w-full grid-cols-3 gap-0 rounded-full border border-primary/20 bg-muted/70 p-1 sm:inline-flex sm:w-auto sm:grid-cols-none";

export function PillTabsList({
  className,
  ...props
}: React.ComponentProps<typeof TabsList>) {
  return <TabsList className={cn(pillTabsListClass, className)} {...props} />;
}

export function PillTabsTrigger({
  layoutId = "segment-pill",
  className,
  children,
  ...props
}: React.ComponentProps<typeof TabsTrigger> & { layoutId?: string }) {
  const shouldReduceMotion = useReducedMotion();
  const ref = React.useRef<HTMLButtonElement>(null);
  const [isActive, setIsActive] = React.useState(false);

  React.useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const sync = () => setIsActive(el.getAttribute("data-state") === "active");
    sync();
    const observer = new MutationObserver(sync);
    observer.observe(el, { attributes: true, attributeFilter: ["data-state"] });
    return () => observer.disconnect();
  }, []);

  return (
    <TabsTrigger
      ref={ref}
      className={cn(
        "relative z-10 min-h-9 flex-1 rounded-full border-0 bg-transparent px-4 py-2 text-xs font-semibold tracking-wider whitespace-nowrap uppercase shadow-none",
        "text-muted-foreground transition-colors duration-150",
        "hover:text-foreground",
        "data-[state=active]:bg-transparent data-[state=active]:text-primary-foreground",
        "data-[state=active]:hover:bg-transparent data-[state=active]:hover:text-primary-foreground",
        "focus-visible:ring-2 focus-visible:ring-primary/25",
        className
      )}
      {...props}
    >
      {isActive ? (
        shouldReduceMotion ? (
          <span className="absolute inset-0 rounded-full bg-primary" aria-hidden />
        ) : (
          <motion.span
            layoutId={layoutId}
            layout="position"
            className="absolute inset-0 rounded-full bg-primary"
            transition={{ type: "spring", stiffness: 520, damping: 36, mass: 0.85 }}
            aria-hidden
          />
        )
      ) : null}
      <span className="relative z-10">{children}</span>
    </TabsTrigger>
  );
}
