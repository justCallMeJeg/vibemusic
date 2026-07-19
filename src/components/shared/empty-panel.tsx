import { ElementType, ReactNode } from "react";
import { cn } from "@/lib/utils";

interface EmptyPanelProps {
  icon: ElementType;
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}

export function EmptyPanel({
  icon: Icon,
  title,
  description,
  action,
  className,
}: EmptyPanelProps) {
  return (
    <div
      role="status"
      className={cn(
        "flex flex-col items-center justify-center h-full text-muted-foreground gap-3 p-6",
        className,
      )}
    >
      <Icon className="size-5 shrink-0" aria-hidden="true" />
      <div className="flex flex-col items-center gap-1">
        <p className="text-sm font-medium text-foreground">{title}</p>
        {description && <p className="text-xs">{description}</p>}
      </div>
      {action && <div>{action}</div>}
    </div>
  );
}
