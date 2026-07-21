import { useState, useCallback } from "react";
import type { ContextMenuItemDef } from "@/components/shared/context-menu-types";

export interface FloatingMenuState {
  items: ContextMenuItemDef[];
  position: { x: number; y: number };
}

export function useFloatingContextMenu() {
  const [menuState, setMenuState] = useState<FloatingMenuState | null>(null);

  const showMenu = useCallback((element: HTMLElement, items: ContextMenuItemDef[]) => {
    const rect = element.getBoundingClientRect();
    setMenuState({ items, position: { x: rect.left, y: rect.bottom } });
  }, []);

  const showMenuForIndex = useCallback((index: number, items: ContextMenuItemDef[]) => {
    const el = document.querySelector<HTMLElement>(`[data-item-index="${index}"]`);
    if (!el) return;
    const rect = el.getBoundingClientRect();
    setMenuState({
      items,
      position: { x: rect.right - 8, y: rect.top + rect.height / 2 },
    });
  }, []);

  const hideMenu = useCallback(() => {
    setMenuState(null);
  }, []);

  return {
    menuState,
    showMenu,
    showMenuForIndex,
    hideMenu,
  };
}
