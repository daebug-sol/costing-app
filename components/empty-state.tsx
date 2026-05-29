import type { LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type EmptyStateProps = {
  icon: LucideIcon;
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
  className?: string;
};

export function EmptyState({
  icon: Icon,
  title,
  description,
  actionLabel,
  onAction,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-border bg-card/50 px-6 py-12 text-center",
        className
      )}
    >
      <span className="bg-muted text-muted-foreground flex size-12 items-center justify-center rounded-full">
        <Icon className="size-6" strokeWidth={1.5} aria-hidden />
      </span>
      <div>
        <p className="text-foreground font-medium">{title}</p>
        {description && (
          <p className="text-muted-foreground mt-1 max-w-sm text-sm">
            {description}
          </p>
        )}
      </div>
      {actionLabel && onAction && (
        <Button type="button" onClick={onAction}>
          {actionLabel}
        </Button>
      )}
    </div>
  );
}
