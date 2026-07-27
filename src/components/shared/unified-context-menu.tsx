import type { ReactNode } from "react";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuSub,
  ContextMenuSubContent,
  ContextMenuSubTrigger,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import type { ContextMenuItemDef } from "./context-menu-types";
import { logger } from "@/lib/logger";

interface UnifiedContextMenuProps {
  children: ReactNode;
  items: ContextMenuItemDef[];
  onOpenChange?: (open: boolean) => void;
}

function renderItems(items: ContextMenuItemDef[]) {
  return items.map((item, index) => {
    switch (item.type) {
      case "separator":
        return <ContextMenuSeparator key={`sep-${index}`} />;
      case "action":
        return (
          <ContextMenuItem
            key={item.id}
            disabled={item.disabled}
            onSelect={() => {
              logger.debug(`[context-menu] action: ${item.id}`);
              item.onSelect();
            }}
            className={item.destructive ? "text-destructive focus:text-destructive focus:bg-destructive/10" : undefined}
          >
            {item.icon && <span className="mr-2 h-4 w-4">{item.icon}</span>}
            {item.label}
          </ContextMenuItem>
        );
      case "submenu":
        return (
          <ContextMenuSub key={item.id}>
            <ContextMenuSubTrigger>
              {item.icon && <span className="mr-2 h-4 w-4">{item.icon}</span>}
              {item.label}
            </ContextMenuSubTrigger>
            <ContextMenuSubContent className="w-48">
              {renderItems(item.items)}
            </ContextMenuSubContent>
          </ContextMenuSub>
        );
    }
  });
}

export function UnifiedContextMenu({ children, items, onOpenChange }: UnifiedContextMenuProps) {
  if (items.length === 0) return <>{children}</>;

  return (
    <ContextMenu onOpenChange={onOpenChange}>
      <ContextMenuTrigger asChild>{children}</ContextMenuTrigger>
      <ContextMenuContent>
        {renderItems(items)}
      </ContextMenuContent>
    </ContextMenu>
  );
}
