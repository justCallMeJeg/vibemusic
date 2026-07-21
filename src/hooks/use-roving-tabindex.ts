import { useCallback, useEffect, useRef, useState } from "react";

interface RovingTabindexOptions {
  containerRef: React.RefObject<HTMLElement | null>;
  itemCount: number;
  enabled?: boolean;
  direction?: "vertical" | "grid";
  columns?: number;
  onActivate?: (index: number) => void;
  onActivateSecondary?: (index: number) => void;
  onIndexChange?: (index: number) => void;
}

const DATA_INDEX_ATTR = "data-item-index";

function getItemElement(container: HTMLElement, index: number): HTMLElement | null {
  return container.querySelector<HTMLElement>(`[${DATA_INDEX_ATTR}="${index}"]`);
}

function focusItem(container: HTMLElement, index: number): void {
  const el = getItemElement(container, index);
  el?.focus();
}

export function useRovingTabindex({
  containerRef,
  itemCount,
  enabled = true,
  direction = "vertical",
  columns = 1,
  onActivate,
  onActivateSecondary,
  onIndexChange,
}: RovingTabindexOptions) {
  const [activeIndex, setActiveIndex] = useState<number>(-1);
  const activeIndexRef = useRef(activeIndex);
  activeIndexRef.current = activeIndex;

  const enabledRef = useRef(enabled);
  enabledRef.current = enabled;
  const itemCountRef = useRef(itemCount);
  itemCountRef.current = itemCount;
  const directionRef = useRef(direction);
  directionRef.current = direction;
  const columnsRef = useRef(columns);
  columnsRef.current = columns;

  const onActivateRef = useRef(onActivate);
  onActivateRef.current = onActivate;
  const onActivateSecondaryRef = useRef(onActivateSecondary);
  onActivateSecondaryRef.current = onActivateSecondary;
  const onIndexChangeRef = useRef(onIndexChange);
  onIndexChangeRef.current = onIndexChange;

  const activate = useCallback(
    (index: number) => {
      if (index < 0 || index >= itemCount) return;
      setActiveIndex(index);
      onIndexChangeRef.current?.(index);
      requestAnimationFrame(() => {
        if (containerRef.current) {
          focusItem(containerRef.current, index);
        }
      });
    },
    [itemCount, containerRef],
  );

  // Capture-phase keydown: attached ONCE, reads refs at handler call time
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (!enabledRef.current) return;
      const container = containerRef.current;
      if (!container) return;
      if (!container.contains(e.target as Node)) return;
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      if (e.defaultPrevented) return;

      const current = activeIndexRef.current;
      let newIndex = current;

      switch (e.key) {
        case "ArrowDown": {
          e.preventDefault();
          e.stopPropagation();
          newIndex = current < 0 ? 0 : Math.min(current + 1, itemCountRef.current - 1);
          break;
        }
        case "ArrowUp": {
          e.preventDefault();
          e.stopPropagation();
          newIndex = current < 0 ? 0 : Math.max(current - 1, 0);
          break;
        }
        case "ArrowRight": {
          if (directionRef.current !== "grid") return;
          e.preventDefault();
          e.stopPropagation();
          const c = columnsRef.current;
          if (current < 0) {
            newIndex = 0;
          } else if (current % c < c - 1 && current + 1 < itemCountRef.current) {
            newIndex = current + 1;
          }
          break;
        }
        case "ArrowLeft": {
          if (directionRef.current !== "grid") return;
          e.preventDefault();
          e.stopPropagation();
          const c = columnsRef.current;
          if (current < 0) {
            newIndex = 0;
          } else if (current % c > 0 && current - 1 >= 0) {
            newIndex = current - 1;
          }
          break;
        }
        case "Home": {
          e.preventDefault();
          e.stopPropagation();
          newIndex = 0;
          break;
        }
        case "End": {
          e.preventDefault();
          e.stopPropagation();
          newIndex = itemCountRef.current - 1;
          break;
        }
        case "Enter": {
          if (current >= 0) {
            e.preventDefault();
            e.stopPropagation();
            if (e.shiftKey) {
              onActivateSecondaryRef.current?.(current);
            } else {
              onActivateRef.current?.(current);
            }
          }
          return;
        }
        default:
          return;
      }

      if (newIndex !== current) {
        activate(newIndex);
      }
    };

    document.addEventListener("keydown", handler, { capture: true });
    return () => document.removeEventListener("keydown", handler, { capture: true });
  }, []);

  // Capture-phase focusin: attached ONCE, reads containerRef at handler call time
  useEffect(() => {
    const handler = (e: FocusEvent) => {
      const container = containerRef.current;
      if (!container) return;
      const target = e.target as HTMLElement;
      let el: HTMLElement | null = target;
      while (el && el !== container) {
        const index = el.getAttribute(DATA_INDEX_ATTR);
        if (index !== null) {
          const parsed = parseInt(index, 10);
          if (parsed !== activeIndexRef.current) {
            setActiveIndex(parsed);
            onIndexChangeRef.current?.(parsed);
          }
          return;
        }
        el = el.parentElement;
      }
    };

    document.addEventListener("focusin", handler, { capture: true });
    return () => document.removeEventListener("focusin", handler, { capture: true });
  }, []);

  useEffect(() => {
    if (itemCount === 0) {
      setActiveIndex(-1);
    }
  }, [itemCount]);

  const getTabIndex = useCallback(
    (index: number): 0 | -1 | undefined => {
      if (!enabled) return undefined;
      return index === activeIndex ? 0 : -1;
    },
    [enabled, activeIndex],
  );

  return {
    activeIndex,
    setActiveIndex: activate,
    getTabIndex,
  };
}
