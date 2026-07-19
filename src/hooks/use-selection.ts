import { useCallback } from "react";
import { useSelectionStore } from "@/stores/selection-store";

interface UseSelectionOptions {
  itemId: number;
  index: number;
}

interface UseSelectionReturn {
  isSelected: boolean;
  onClick: (e: React.MouseEvent) => void;
  onKeyDown: (e: React.KeyboardEvent) => void;
}

export function useSelection({ itemId, index }: UseSelectionOptions): UseSelectionReturn {
  const isSelected = useSelectionStore((s) => s.selectedIds.includes(itemId));

  const onClick = useCallback(
    (e: React.MouseEvent) => {
      const toggle = useSelectionStore.getState().toggle;
      toggle(itemId, index, {
        shift: e.shiftKey,
        ctrl: e.ctrlKey || e.metaKey,
      });
    },
    [itemId, index],
  );

  const onKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === " " && useSelectionStore.getState().mode === "checkbox") {
        e.preventDefault();
        useSelectionStore.getState().toggle(itemId, index);
      }
    },
    [itemId, index],
  );

  return { isSelected, onClick, onKeyDown };
}
