import { useRef } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { useScrollMask } from "@/hooks/use-scroll-mask";
import { useIsPlayerVisible } from "@/stores/audio-store";

interface VirtualizedListProps<T> {
  items: T[];
  renderItem: (item: T, index: number) => React.ReactNode;
  itemHeight?: number; // Approximate height of an item
  emptyState?: React.ReactNode;
  paddingBottom?: string; // Override dynamic padding if provided
  className?: string;
  header?: React.ReactNode;
  headerHeight?: number;
  onScroll?: (e: React.UIEvent<HTMLDivElement>) => void;
}

export function VirtualizedList<T>({
  items,
  renderItem,
  itemHeight = 56,
  emptyState,
  paddingBottom,
  className = "",
  header,
  headerHeight = 300,
  onScroll,
}: VirtualizedListProps<T>) {
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

  // Virtualizer
  const hasHeader = !!header;
  const totalItems = items.length + (hasHeader ? 1 : 0);

  // Custom header height or default to 300
  const headerHeightPx = headerHeight;

  const virtualizer = useVirtualizer({
    count: totalItems,
    getScrollElement: () => parentRef.current,
    estimateSize: (index) => {
      if (hasHeader && index === 0) return headerHeightPx;
      return itemHeight;
    },
    overscan: 5,
  });

  return (
    <div
      ref={parentRef}
      onScroll={onScroll}
      className={`flex-1 overflow-y-auto ${className} scroll-mask-y custom-scrollbar`}
    >
      <div
        style={{
          height: `${virtualizer.getTotalSize() + bottomPadding}px`,
          width: "100%",
          position: "relative",
        }}
      >
        {items.length === 0 && !hasHeader
          ? emptyState || (
              <div className="flex items-center justify-center flex-1 text-muted-foreground p-8">
                No items found
              </div>
            )
          : virtualizer.getVirtualItems().map((virtualRow) => {
              const isHeaderRow = hasHeader && virtualRow.index === 0;
              const itemIndex = hasHeader
                ? virtualRow.index - 1
                : virtualRow.index;

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
                  }}
                >
                  {isHeaderRow
                    ? header
                    : items[itemIndex] &&
                      renderItem(items[itemIndex], itemIndex)}
                  {/* Check items[itemIndex] existence to be safe, though virtualization logic should align */}
                </div>
              );
            })}
      </div>
    </div>
  );
}
