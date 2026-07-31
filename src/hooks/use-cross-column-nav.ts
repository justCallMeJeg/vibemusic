import { useEffect, type RefObject } from "react";

export function useCrossColumnNav(
  containerRef: RefObject<HTMLElement | null>,
  columnCount: number,
  enabled = true,
) {
  useEffect(() => {
    if (!enabled) return;

    const handler = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
      const active = document.activeElement;
      if (!active) return;

      const container = containerRef.current;
      if (!container) return;

      const columns = container.querySelectorAll<HTMLElement>("[data-column-index]");
      let currentCol = -1;
      for (let i = 0; i < columns.length; i++) {
        if (columns[i].contains(active)) {
          currentCol = i;
          break;
        }
      }
      if (currentCol === -1) return;

      const direction = e.key === "ArrowRight" ? 1 : -1;
      const nextCol = currentCol + direction;
      if (nextCol < 0 || nextCol >= columnCount) return;

      e.preventDefault();
      e.stopPropagation();

      const targetCol = columns[nextCol];
      const lastIndex = targetCol.querySelectorAll("[data-item-index]").length - 1;
      const targetIndex = direction === 1 ? 0 : lastIndex;
      const target = targetCol.querySelector<HTMLElement>(`[data-item-index="${targetIndex}"]`);
      target?.focus({ preventScroll: true });
      target?.scrollIntoView({ block: "center" });
    };

    document.addEventListener("keydown", handler, { capture: true });
    return () => document.removeEventListener("keydown", handler, { capture: true });
  }, [containerRef, columnCount, enabled]);
}
