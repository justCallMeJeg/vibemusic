import { useRef, useCallback, useEffect } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { useScrollMask } from "@/hooks/use-scroll-mask";
import { PLAYER_BAR_HEIGHT } from "@/lib/constants";
import { useIsPlayerVisible } from "@/stores/audio-store";
import { EmptyPanel } from "@/components/shared/empty-panel";
import { useRovingTabindex } from "@/hooks/use-roving-tabindex";
import { cn } from "@/lib/utils";
import { ListMusic } from "lucide-react";

interface VirtualizedListProps<T> {
  items: T[];
  renderItem: (item: T, index: number) => React.ReactNode;
  itemHeight?: number;
  emptyState?: React.ReactNode;
  paddingBottom?: string;
  className?: string;
  header?: React.ReactNode;
  headerHeight?: number;
  onScroll?: (e: React.UIEvent<HTMLDivElement>) => void;
  /** Enable keyboard navigation (arrow keys, Enter, Shift+F10) */
  keyboardNav?: boolean;
  /** Called when Enter is pressed on focused item */
  onItemActivate?: (index: number) => void;
  /** Called when Shift+Enter is pressed on focused item */
  onItemActivateSecondary?: (index: number) => void;
  /** Called when Shift+F10 or ContextMenu key on focused item */
  onItemContextMenu?: (index: number) => void;
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
  keyboardNav = false,
  onItemActivate,
  onItemActivateSecondary,
  onItemContextMenu,
}: VirtualizedListProps<T>) {
  const parentRef = useRef<HTMLDivElement>(null);

  // Dynamic padding based on player visibility
  const isPlayerVisible = useIsPlayerVisible();
  const bottomPadding = paddingBottom
    ? parseInt(paddingBottom, 10)
    : isPlayerVisible
      ? PLAYER_BAR_HEIGHT
      : 24;

  // Apply visual scroll mask
  useScrollMask(24, parentRef);

  // Virtualizer
  const hasHeader = !!header;
  const totalItems = items.length + (hasHeader ? 1 : 0);

  // Custom header height or default to 300
  const headerHeightPx = headerHeight;

  // Memoize callbacks to prevent virtualizer from recalculating unnecessarily
  const getScrollElement = useCallback(() => parentRef.current, []);
  const estimateSize = useCallback(
    (index: number) => {
      if (hasHeader && index === 0) return headerHeightPx;
      return itemHeight;
    },
    [hasHeader, headerHeightPx, itemHeight],
  );

  const virtualizer = useVirtualizer({
    count: totalItems,
    getScrollElement,
    estimateSize,
    overscan: 5,
  });

  // Roving tabindex keyboard navigation
  const roving = useRovingTabindex({
    containerRef: parentRef,
    itemCount: keyboardNav ? items.length : 0,
    enabled: !!keyboardNav,
    direction: "vertical",
    onActivate: onItemActivate,
    onActivateSecondary: onItemActivateSecondary,
    onContextMenu: onItemContextMenu,
    onIndexChange: (index) => {
      if (keyboardNav && index >= 0) {
        const adjustedIndex = hasHeader ? index + 1 : index;
        virtualizer.scrollToIndex(adjustedIndex, { align: "center" });
      }
    },
  });

  // Re-focus after scroll to ensure the focused element is in the DOM
  useEffect(() => {
    if (!keyboardNav || roving.activeIndex < 0) return;
    const adjustedIndex = hasHeader ? roving.activeIndex + 1 : roving.activeIndex;
    virtualizer.scrollToIndex(adjustedIndex, { align: "center" });
  }, [roving.activeIndex, keyboardNav, virtualizer, hasHeader]);

  // Auto-focus first item when keyboard nav is enabled
  useEffect(() => {
    if (keyboardNav && items.length > 0 && roving.activeIndex < 0) {
      roving.setActiveIndex(0);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [keyboardNav, items.length]);

  return (
    <div
      ref={parentRef}
      onScroll={onScroll}
      role="list"
      className={`flex-1 overflow-y-auto ${className} scroll-mask-y ${
        items.length === 0 && !hasHeader && isPlayerVisible ? "pb-player-bar" : ""
      }`}
    >
      <div
        style={{
          height: `${virtualizer.getTotalSize() + bottomPadding}px`,
          width: "100%",
          position: "relative",
        }}
      >
        {items.length === 0 && !hasHeader
          ? emptyState || <EmptyPanel icon={ListMusic} title="No items found" />
          : virtualizer.getVirtualItems().map((virtualRow) => {
              const isHeaderRow = hasHeader && virtualRow.index === 0;
              const itemIndex = hasHeader
                ? virtualRow.index - 1
                : virtualRow.index;

              return (
                <div
                  role="listitem"
                  key={virtualRow.index}
                  data-index={virtualRow.index}
                  data-item-index={isHeaderRow ? undefined : itemIndex}
                  ref={virtualizer.measureElement}
                  tabIndex={isHeaderRow ? undefined : roving.getTabIndex(itemIndex)}
                  className={cn(
                    "absolute top-0 left-0 w-full",
                    keyboardNav && !isHeaderRow && "focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-ring rounded-md",
                    keyboardNav && !isHeaderRow && roving.activeIndex === itemIndex && "bg-accent/15 ring-1 ring-ring/30 rounded-md",
                  )}
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
                </div>
              );
            })}
      </div>
    </div>
  );
}
