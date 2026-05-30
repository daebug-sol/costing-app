"use client";

import { ArrowDownRight, ArrowUpRight, Minus } from "lucide-react";
import { animate, motion, useReducedMotion } from "motion/react";
import { useEffect, useMemo, useRef, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

type DeltaTone = "positive" | "negative" | "neutral";

export type KpiStatCardProps = {
  title: string;
  value: number;
  formatter: (value: number) => string;
  deltaPct?: number | null;
  deltaLabel?: string;
  hint?: string;
  className?: string;
};

function CountUpValue({ value, formatter }: { value: number; formatter: (value: number) => string }) {
  const shouldReduceMotion = useReducedMotion();
  const [animatedValue, setAnimatedValue] = useState(value);
  const previousValueRef = useRef(value);

  useEffect(() => {
    if (shouldReduceMotion) {
      setAnimatedValue(value);
      previousValueRef.current = value;
      return;
    }
    const controls = animate(previousValueRef.current, value, {
      duration: 0.45,
      ease: "easeOut",
      onUpdate: (latest) => setAnimatedValue(latest),
    });
    previousValueRef.current = value;
    return () => controls.stop();
  }, [shouldReduceMotion, value]);

  return <span>{formatter(animatedValue)}</span>;
}

function getDeltaTone(deltaPct: number): DeltaTone {
  if (deltaPct > 0) return "positive";
  if (deltaPct < 0) return "negative";
  return "neutral";
}

export function KpiStatCard({
  title,
  value,
  formatter,
  deltaPct = null,
  deltaLabel = "vs previous period",
  hint,
  className,
}: KpiStatCardProps) {
  const shouldReduceMotion = useReducedMotion();
  const deltaTone = useMemo(
    () => (typeof deltaPct === "number" ? getDeltaTone(deltaPct) : "neutral"),
    [deltaPct]
  );

  const DeltaIcon = deltaTone === "positive" ? ArrowUpRight : deltaTone === "negative" ? ArrowDownRight : Minus;
  const deltaValue = typeof deltaPct === "number" ? `${deltaPct > 0 ? "+" : ""}${deltaPct.toFixed(1)}%` : null;

  return (
    <motion.div
      initial={shouldReduceMotion ? false : { opacity: 0, y: 8 }}
      animate={shouldReduceMotion ? undefined : { opacity: 1, y: 0 }}
      transition={shouldReduceMotion ? undefined : { duration: 0.2, ease: "easeOut" }}
      className={className}
    >
      <Card size="sm" className="h-full min-w-0 border-border/80">
        <CardHeader className="gap-2 pb-2">
          <CardTitle className="line-clamp-2 text-xs leading-snug text-muted-foreground">{title}</CardTitle>
        </CardHeader>
        <CardContent className="flex min-w-0 flex-col gap-2">
          <p className="tabular-money break-all text-xl font-semibold text-foreground sm:text-2xl">
            <CountUpValue value={value} formatter={formatter} />
          </p>
          {deltaValue ? (
            <p
              className={cn(
                "flex flex-wrap items-center gap-x-1 gap-y-0.5 text-xs font-medium",
                deltaTone === "positive" && "text-emerald-600",
                deltaTone === "negative" && "text-rose-600",
                deltaTone === "neutral" && "text-muted-foreground"
              )}
            >
              <DeltaIcon className="size-3.5 shrink-0" aria-hidden />
              <span className="tabular-money shrink-0">{deltaValue}</span>
              <span className="min-w-0 text-muted-foreground">{deltaLabel}</span>
            </p>
          ) : null}
          {hint ? <p className="line-clamp-2 text-xs text-muted-foreground">{hint}</p> : null}
        </CardContent>
      </Card>
    </motion.div>
  );
}
