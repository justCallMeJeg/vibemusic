import { useCallback, isValidElement } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { useVirtualizerSetup } from "@/hooks/use-virtualizer-setup";
import { EmptyPanel } from "@/components/shared/empty-panel";
import { RovingTabindexProvider } from "@/hooks/use-roving-tabindex";
import { useInteractionStore } from "@/stores/interaction-store";
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
  /** Toggle header visibility without removing the header element */
  showHeader?: boolean;
  onScroll?: (e: React.UIEvent<HTMLDivElement>) => void;
  /** Enable keyboard navigation (arrow keys, Enter) */
  keyboardNav?: boolean;
  /** Called when Enter is pressed on focused item */
  onItemActivate?: (index: number) => void;
  /** Called when Shift+Enter is pressed on focused item */
  onItemActivateSecondary?: (index: number) => void;
  /** Override default auto-focus behavior */
  autoFocus?: boolean;
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
  showHeader = true,
  onScroll,
  keyboardNav = false,
  onItemActivate,
  onItemActivateSecondary,
  autoFocus,
}: VirtualizedListProps<T>) {
  const { parentRef, effectiveKeyboardNav, bottomPadding, getScrollElement, isPlayerVisible } = useVirtualizerSetup(
    itemHeight,
    paddingBottom,
    keyboardNav,
  );

  // Virtualizer
  const hasHeader = showHeader && !!header;
  const totalItems = items.length + (hasHeader ? 1 : 0);

  // Custom header height or default to 300
  const headerHeightPx = headerHeight;

  // Memoize callbacks to prevent virtualizer from recalculating unnecessarily
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

  return (
    <div
      ref={parentRef}
      onScroll={onScroll}
      role="list"
      className={`flex-1 overflow-y-auto ${className} scroll-mask-y ${
        items.length === 0 && !hasHeader && isPlayerVisible
          ? "pb-player-bar"
          : ""
      }`}
    >
      <RovingTabindexProvider
        containerRef={parentRef}
        itemCount={effectiveKeyboardNav ? items.length : 0}
        enabled={!!effectiveKeyboardNav}
        autoFocus={autoFocus ?? (effectiveKeyboardNav && useInteractionStore.getState().focusSource === "keyboard")}
        direction="vertical"
        onActivate={onItemActivate}
        onActivateSecondary={onItemActivateSecondary}
        onIndexChange={(index: number) => {
          if (effectiveKeyboardNav && index >= 0) {
            const adjustedIndex = hasHeader ? index + 1 : index;
            virtualizer.scrollToIndex(adjustedIndex, { align: "center" });
          }
        }}
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
                <EmptyPanel icon={ListMusic} title="No items found" />
              )
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
                    ref={virtualizer.measureElement}
                    className={cn("absolute top-0 left-0 w-full")}
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
                        (() => {
                          const rendered = renderItem(
                            items[itemIndex],
                            itemIndex,
                          );
                          if (!isValidElement(rendered)) return rendered;
                          return rendered;
                        })()}
                  </div>
                );
              })}
        </div>
      </RovingTabindexProvider>
    </div>
  );
}
