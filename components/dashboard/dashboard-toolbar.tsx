"use client";

import { RefreshCw } from "lucide-react";
import { motion, useReducedMotion } from "motion/react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { DashboardProjectScopeOption, DashboardRange } from "@/lib/dashboard-contract";
import { cn } from "@/lib/utils";

const RANGE_OPTIONS: Array<{ value: DashboardRange; label: string }> = [
  { value: "mtd", label: "Bulan ini" },
  { value: "ytd", label: "Tahun berjalan" },
  { value: "12m", label: "12 bulan" },
  { value: "all", label: "Semua waktu" },
];

function asDashboardRange(value: string): DashboardRange {
  return value === "mtd" || value === "ytd" || value === "12m" || value === "all" ? value : "all";
}

export type DashboardToolbarProps = {
  scopeOptions: DashboardProjectScopeOption[];
  selectedProjectId: string | null;
  range: DashboardRange;
  loading?: boolean;
  onProjectChange: (projectId: string | null) => void;
  onRangeChange: (range: DashboardRange) => void;
  onRefresh: () => void;
  /** center = under page title; start = sticky bar (left-aligned); end = right-aligned. */
  align?: "center" | "start" | "end";
  /** panel = brown header strip with white control chips; bar = sticky strip below navbar. */
  surface?: "panel" | "bar";
};

export function DashboardToolbar({
  scopeOptions,
  selectedProjectId,
  range,
  loading = false,
  onProjectChange,
  onRangeChange,
  onRefresh,
  align = "center",
  surface = "bar",
}: DashboardToolbarProps) {
  const shouldReduceMotion = useReducedMotion();
  const onPanel = surface === "panel";

  return (
    <motion.div
      initial={shouldReduceMotion ? false : { opacity: 0, y: 8 }}
      animate={shouldReduceMotion ? undefined : { opacity: 1, y: 0 }}
      transition={shouldReduceMotion ? undefined : { duration: 0.2, ease: "easeOut" }}
      className={cn(
        "flex min-w-0 flex-wrap items-center gap-3 sm:gap-4",
        align === "center"
          ? "justify-center"
          : align === "start"
            ? "justify-start"
            : "justify-end"
      )}
    >
      <Select
        value={selectedProjectId ?? "__all__"}
        onValueChange={(value) => onProjectChange(value === "__all__" ? null : value)}
      >
        <SelectTrigger size="sm" className="min-w-0 w-full max-w-48 sm:w-auto">
          <SelectValue placeholder="Semua proyek" />
        </SelectTrigger>
        <SelectContent>
          <SelectGroup>
            <SelectItem value="__all__">Semua proyek</SelectItem>
            {scopeOptions.map((option) => (
              <SelectItem key={option.id} value={option.id}>
                {option.name}
              </SelectItem>
            ))}
          </SelectGroup>
        </SelectContent>
      </Select>

      <Select value={range} onValueChange={(value) => onRangeChange(asDashboardRange(value))}>
        <SelectTrigger size="sm" className="min-w-28">
          <SelectValue placeholder="Periode" />
        </SelectTrigger>
        <SelectContent>
          <SelectGroup>
            {RANGE_OPTIONS.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectGroup>
        </SelectContent>
      </Select>

      <Button
        type="button"
        variant={onPanel ? "outline" : "default"}
        size="sm"
        className={cn(onPanel && "tracking-normal normal-case")}
        onClick={onRefresh}
        disabled={loading}
      >
        <RefreshCw data-icon="inline-start" className={loading ? "animate-spin" : undefined} />
        Refresh data
      </Button>
    </motion.div>
  );
}
