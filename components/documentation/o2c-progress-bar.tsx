"use client";

import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import {
  type O2CStage,
  type O2CStageProgress,
  type ProjectProgress,
} from "@/lib/o2c/project-progress";
import { cn } from "@/lib/utils";

const STAGE_SHORT: Record<O2CStage, string> = {
  quotation: "Penawaran",
  "sales-order": "Sales Order",
  delivery: "Surat Jalan",
  invoice: "Invoice",
  payment: "Pembayaran",
};

type Props = {
  progress: ProjectProgress;
  className?: string;
};

function stageAriaLabel(stage: O2CStageProgress): string {
  const short = STAGE_SHORT[stage.stage];
  if (stage.href) return `Buka ${stage.label}`;
  return `${short} belum tersedia`;
}

function summaryParts(label: string, stage: O2CStage): { doc: string; status?: string } {
  // Labels from computeProjectProgress: "Stage · doc · status" or fewer parts.
  const parts = label.split(" · ").map((p) => p.trim()).filter(Boolean);
  const short = STAGE_SHORT[stage];
  if (parts[0] === short) parts.shift();
  if (parts.length === 0) return { doc: "—" };
  if (parts.length === 1) return { doc: parts[0]! };
  return { doc: parts[0]!, status: parts.slice(1).join(" · ") };
}

export function O2cProgressBar({ progress, className }: Props) {
  const router = useRouter();

  return (
    <div className={cn("flex flex-col gap-3", className)}>
      <div
        className="flex gap-1"
        role="group"
        aria-label="Progres order-to-cash"
      >
        {progress.stages.map((stage) => {
          const disabled = !stage.href;
          return (
            <button
              key={stage.stage}
              type="button"
              disabled={disabled}
              aria-label={stageAriaLabel(stage)}
              aria-current={stage.state === "current" ? "step" : undefined}
              onClick={() => {
                if (stage.href) router.push(stage.href);
              }}
              className={cn(
                "flex min-w-0 flex-1 flex-col items-center gap-1 rounded-md px-1.5 py-2 text-center transition-colors",
                "focus-visible:ring-ring focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2",
                stage.state === "todo" && "bg-muted text-muted-foreground",
                stage.state === "done" &&
                  "bg-primary/15 text-foreground hover:bg-primary/25",
                stage.state === "current" &&
                  "bg-primary/15 text-foreground ring-2 ring-primary/40 ring-offset-1 ring-offset-background",
                disabled && "cursor-not-allowed opacity-60"
              )}
            >
              <span className="truncate text-[0.65rem] font-semibold leading-tight sm:text-xs">
                {STAGE_SHORT[stage.stage]}
              </span>
            </button>
          );
        })}
      </div>

      <ul className="flex flex-col gap-1.5">
        {progress.stages.map((stage) => {
          const { doc, status } = summaryParts(stage.label, stage.stage);
          return (
            <li
              key={`summary-${stage.stage}`}
              className="text-muted-foreground flex min-w-0 flex-wrap items-center gap-x-2 gap-y-0.5 text-xs"
            >
              <span className="text-foreground font-medium">
                {STAGE_SHORT[stage.stage]}
              </span>
              <span className="truncate tabular-nums">{doc}</span>
              {status ? (
                <Badge variant="secondary" className="normal-case tracking-normal">
                  {status}
                </Badge>
              ) : null}
              {stage.state === "current" ? (
                <Badge variant="outline" className="normal-case tracking-normal">
                  Berjalan
                </Badge>
              ) : null}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
