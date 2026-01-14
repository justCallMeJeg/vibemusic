import { useRef, useState, useEffect } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { useScrollMask } from "@/hooks/use-scroll-mask";

interface VirtualizedGridProps<T> {
  items: T[];
  renderItem: (item: T) => React.ReactNode;
  itemHeight?: number; // Approximate height of a row
  emptyState?: React.ReactNode;
  paddingBottom?: string;
  className?: string;
}

// Helper hook to calculate grid columns based on container width
function useGridColumns(containerRef: React.RefObject<HTMLElement | null>) {
  const [columns, setColumns] = useState(2);

  useEffect(() => {
    if (!containerRef.current) return;

    const updateColumns = () => {
      const width = containerRef.current?.offsetWidth || window.innerWidth;
      if (width >= 1280) setColumns(5); // xl
      else if (width >= 1024) setColumns(4); // lg
      else if (width >= 768) setColumns(3); // md
      else setColumns(2); // default/sm
    };

    updateColumns();

    const resizeObserver = new ResizeObserver(updateColumns);
    resizeObserver.observe(containerRef.current);

    return () => resizeObserver.disconnect();
  }, [containerRef]);

  return columns;
}

export function VirtualizedGrid<T>({
  items,
  renderItem,
  itemHeight = 220,
  emptyState,
  paddingBottom = "168px",
  className = "",
}: VirtualizedGridProps<T>) {
  const parentRef = useRef<HTMLDivElement>(null);

  // Apply visual scroll mask
  useScrollMask(24, parentRef);

  // Determine number of columns
  const columns = useGridColumns(parentRef);

  // Calculate rows
  const rowCount = Math.ceil(items.length / columns);

  // Virtualizer
  const virtualizer = useVirtualizer({
    count: rowCount,
    getScrollElement: () => parentRef.current,
    estimateSize: () => itemHeight,
    overscan: 3,
  });

  return (
    <div
      ref={parentRef}
      className={`flex-1 overflow-y-auto px-2 scroll-mask-y custom-scrollbar ${className}`}
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
            height: `${virtualizer.getTotalSize()}px`,
            width: "100%",
            position: "relative",
            paddingBottom,
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
