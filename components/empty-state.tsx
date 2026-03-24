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
        "flex flex-col items-center justify-center gap-3 px-6 py-12 text-center",
        className
      )}
    >
      <Icon className="text-muted-foreground/40 size-10" strokeWidth={1.25} />
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
