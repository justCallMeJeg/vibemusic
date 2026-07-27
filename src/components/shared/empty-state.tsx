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
import { UnifiedContextMenu } from "@/components/shared/unified-context-menu";
import type { ContextMenuItemDef } from "@/components/shared/context-menu-types";

interface EmptyStateProps {
  icon: ElementType;
  title: string;
  description: string;
  action?: ReactNode;
  className?: string;
  emptyClassName?: string;
  menuItems?: ContextMenuItemDef[];
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
  emptyClassName,
  menuItems,
}: EmptyStateProps) {
  const content = (
    <div
      className={cn(
        "flex-1 w-full flex flex-col items-center justify-center min-h-0",
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

  if (menuItems && menuItems.length > 0) {
    return <UnifiedContextMenu items={menuItems}>{content}</UnifiedContextMenu>;
  }

  return content;
}
