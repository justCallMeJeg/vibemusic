import { useRef, useCallback } from "react";
import { useSelectionStore } from "@/stores/selection-store";

export function useDragSelect() {
  const dragState = useRef<{
    active: boolean;
    startIndex: number;
    lastIndex: number;
  }>({ active: false, startIndex: -1, lastIndex: -1 });

  const handlePointerDown = useCallback(
    (e: React.PointerEvent, index: number) => {
      const target = e.target as HTMLElement;
      if (target.closest('[data-checkbox-column="true"]')) return;
      if (target.closest("button, a, input, [role='button']")) return;

      const mode = useSelectionStore.getState().mode;
      if (mode !== "checkbox") return;

      const el = e.currentTarget as HTMLElement;
      el.setPointerCapture?.(e.pointerId);
      dragState.current = { active: true, startIndex: index, lastIndex: index };

      if (!e.shiftKey) {
        useSelectionStore.getState().toggle(-index, index);
      }
    },
    [],
  );

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (!dragState.current.active) return;

    const el = e.currentTarget as HTMLElement;
    const indexAttr = el.getAttribute("data-item-index");
    if (indexAttr === null) return;

    const index = parseInt(indexAttr, 10);
    const prev = dragState.current.lastIndex;
    if (index === prev) return;

    dragState.current.lastIndex = index;
    useSelectionStore
      .getState()
      .selectRange(dragState.current.startIndex, index);
  }, []);

  const handlePointerUp = useCallback((e: React.PointerEvent) => {
    if (!dragState.current.active) return;

    const el = e.currentTarget as HTMLElement;
    el.releasePointerCapture?.(e.pointerId);
    dragState.current.active = false;
  }, []);

  return { handlePointerDown, handlePointerMove, handlePointerUp };
}
