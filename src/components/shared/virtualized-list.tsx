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
}

export function VirtualizedList<T>({
  items,
  renderItem,
  itemHeight = 56,
  emptyState,
  paddingBottom,
  className = "",
  header,
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
  const virtualizer = useVirtualizer({
    count: items.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => itemHeight,
    overscan: 5,
  });

  return (
    <div
      ref={parentRef}
      className={`flex-1 overflow-y-auto ${className} scroll-mask-y custom-scrollbar`}
    >
      <div
        style={{
          // We wrap content in a relative div to handle scrolling correctly
          minHeight: "100%",
          display: "flex",
          flexDirection: "column",
        }}
      >
        {header}

        {items.length === 0 ? (
          emptyState || (
            <div className="flex items-center justify-center flex-1 text-muted-foreground p-8">
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
                  {renderItem(items[virtualRow.index], virtualRow.index)}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
