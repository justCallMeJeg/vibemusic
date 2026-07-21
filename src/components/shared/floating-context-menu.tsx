import { useEffect, useRef, useCallback } from "react";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
} from "@/components/ui/dropdown-menu";
import type { ContextMenuItemDef } from "./context-menu-types";

interface FloatingContextMenuProps {
  items: ContextMenuItemDef[];
  position: { x: number; y: number } | null;
  onClose: () => void;
}

function renderItems(items: ContextMenuItemDef[]) {
  return items.map((item, index) => {
    switch (item.type) {
      case "separator":
        return <DropdownMenuSeparator key={`sep-${index}`} />;
      case "action":
        return (
          <DropdownMenuItem
            key={item.id}
            disabled={item.disabled}
            onSelect={item.onSelect}
            className={item.destructive ? "text-destructive focus:text-destructive focus:bg-destructive/10" : undefined}
          >
            {item.icon && <span className="mr-2 h-4 w-4">{item.icon}</span>}
            {item.label}
          </DropdownMenuItem>
        );
      case "submenu":
        return (
          <DropdownMenuSub key={item.id}>
            <DropdownMenuSubTrigger>
              {item.icon && <span className="mr-2 h-4 w-4">{item.icon}</span>}
              {item.label}
            </DropdownMenuSubTrigger>
            <DropdownMenuSubContent className="w-48">
              {renderItems(item.items)}
            </DropdownMenuSubContent>
          </DropdownMenuSub>
        );
    }
  });
}

export function FloatingContextMenu({ items, position, onClose }: FloatingContextMenuProps) {
  const open = position !== null;
  const restoreFocusRef = useRef<HTMLElement | null>(null);

  // Save focus ref when opening
  useEffect(() => {
    if (position) {
      restoreFocusRef.current = document.activeElement as HTMLElement;
    }
  }, [position]);

  const handleOpenChange = useCallback((open: boolean) => {
    if (!open) {
      requestAnimationFrame(() => {
        restoreFocusRef.current?.focus();
      });
      onClose();
    }
  }, [onClose]);

  return (
    <DropdownMenu open={open} onOpenChange={handleOpenChange}>
      <div
        style={{
          position: "fixed",
          left: position?.x ?? -9999,
          top: position?.y ?? -9999,
          width: 0,
          height: 0,
        }}
      >
        <DropdownMenuTrigger asChild>
          <button
            className="opacity-0 w-0 h-0 p-0 m-0 border-0"
            tabIndex={-1}
            aria-hidden="true"
          />
        </DropdownMenuTrigger>
      </div>
      <DropdownMenuContent
        side="bottom"
        align="start"
        sideOffset={2}
        onCloseAutoFocus={(e) => e.preventDefault()}
      >
        {renderItems(items)}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
