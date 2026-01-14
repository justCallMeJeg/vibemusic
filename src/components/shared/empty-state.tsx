import { ElementType, ReactNode } from "react";
import {
  Empty,
  EmptyHeader,
  EmptyTitle,
  EmptyDescription,
  EmptyMedia,
  EmptyContent,
} from "@/components/ui/empty";
import { cn } from "@/lib/utils";

interface EmptyStateProps {
  icon: ElementType;
  title: string;
  description: string;
  action?: ReactNode;
  className?: string; // Class for the outer wrapper
  emptyClassName?: string; // Class for the Empty primitives wrapper if needed
  variant?: "default" | "page"; // 'page' includes the -mt-20 offset for full page center
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
  emptyClassName,
  variant = "page",
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex-1 w-full flex flex-col items-center justify-center",
        variant === "page" && "-mt-20",
        className
      )}
    >
      <Empty className={cn(emptyClassName)}>
        <EmptyMedia variant="icon">
          <Icon className="h-6 w-6" />
        </EmptyMedia>
        <EmptyHeader>
          <EmptyTitle>{title}</EmptyTitle>
          <EmptyDescription>{description}</EmptyDescription>
        </EmptyHeader>
        {action && <EmptyContent>{action}</EmptyContent>}
      </Empty>
    </div>
  );
}
