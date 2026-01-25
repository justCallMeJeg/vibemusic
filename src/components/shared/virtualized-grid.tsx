import { useRef, useState, useEffect, useMemo, useCallback } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { useScrollMask } from "@/hooks/use-scroll-mask";
import { debounce } from "@/lib/utils";
import { useIsPlayerVisible } from "@/stores/audio-store";

interface VirtualizedGridProps<T> {
  items: T[];
  renderItem: (item: T) => React.ReactNode;
  itemHeight?: number; // Approximate height of a row
  emptyState?: React.ReactNode;
  paddingBottom?: string; // Override dynamic padding if provided
  className?: string;
}

// Helper hook to calculate grid columns based on window width (matching Tailwind breakpoints)
function useGridColumns() {
  const [columns, setColumns] = useState(() => {
    // Initialize with correct value to avoid flash
    const width = typeof window !== "undefined" ? window.innerWidth : 1024;
    if (width >= 1280) return 5;
    if (width >= 1024) return 4;
    if (width >= 768) return 3;
    return 2;
  });

  // Create debounced handler with useMemo to maintain stable reference
  const debouncedUpdateColumns = useMemo(
    () =>
      debounce(() => {
        const width = window.innerWidth;
        if (width >= 1280)
          setColumns(5); // xl
        else if (width >= 1024)
          setColumns(4); // lg
        else if (width >= 768)
          setColumns(3); // md
        else setColumns(2); // default/sm
      }, 150),
    [],
  );

  useEffect(() => {
    window.addEventListener("resize", debouncedUpdateColumns);
    return () => window.removeEventListener("resize", debouncedUpdateColumns);
  }, [debouncedUpdateColumns]);

  return columns;
}

export function VirtualizedGrid<T>({
  items,
  renderItem,
  itemHeight = 220,
  emptyState,
  paddingBottom,
  className = "",
}: VirtualizedGridProps<T>) {
  const parentRef = useRef<HTMLDivElement>(null);

  // Dynamic padding based on player visibility
  const isPlayerVisible = useIsPlayerVisible();
  const bottomPadding = paddingBottom
    ? parseInt(paddingBottom, 10)
    : isPlayerVisible
      ? 156
      : 24;

  // Apply visual scroll mask
  useScrollMask(24, parentRef);

  // Determine number of columns
  const columns = useGridColumns();

  // Calculate rows
  const rowCount = Math.ceil(items.length / columns);

  // Memoize callbacks to prevent virtualizer from recalculating unnecessarily
  const getScrollElement = useCallback(() => parentRef.current, []);
  const estimateSize = useCallback(() => itemHeight, [itemHeight]);

  // Virtualizer
  const virtualizer = useVirtualizer({
    count: rowCount,
    getScrollElement,
    estimateSize,
    overscan: 3,
  });

  return (
    <div
      ref={parentRef}
      className={`flex-1 overflow-y-auto px-2 scroll-mask-y custom-scrollbar ${className} ${
        items.length === 0 ? "flex flex-col" : ""
      }`}
    >
      {items.length === 0 ? (
        emptyState || (
          <div className="flex items-center justify-center h-full text-muted-foreground">
            No items found
          </div>
        )
      ) : (
        <div
          style={{
            height: `${virtualizer.getTotalSize() + bottomPadding}px`,
            width: "100%",
            position: "relative",
            transition: "height 300ms ease-in-out",
          }}
        >
          {virtualizer.getVirtualItems().map((virtualRow) => {
            const startIndex = virtualRow.index * columns;
            const rowItems = items.slice(startIndex, startIndex + columns);

            return (
              <div
                key={virtualRow.index}
                data-index={virtualRow.index}
                ref={virtualizer.measureElement}
                style={{
                  position: "absolute",
                  top: 0,
                  left: 0,
                  width: "100%",
                  transform: `translateY(${virtualRow.start}px)`,
                  gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`,
                }}
                className="grid gap-4"
              >
                {rowItems.map((item) => renderItem(item))}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
