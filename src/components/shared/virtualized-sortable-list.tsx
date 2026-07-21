import { useRef, useCallback, useEffect, cloneElement, isValidElement } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { useScrollMask } from "@/hooks/use-scroll-mask";
import { PLAYER_BAR_HEIGHT } from "@/lib/constants";
import { useIsPlayerVisible } from "@/stores/audio-store";
import { EmptyPanel } from "@/components/shared/empty-panel";
import { useRovingTabindex } from "@/hooks/use-roving-tabindex";
import { cn } from "@/lib/utils";
import { ListMusic } from "lucide-react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";

interface VirtualizedSortableListProps<T> {
  items: T[];
  renderItem: (item: T, index: number) => React.ReactNode;
  onReorder: (activeId: string | number, overId: string | number) => void;
  getItemId: (item: T) => string | number;
  itemHeight?: number;
  emptyState?: React.ReactNode;
  paddingBottom?: string; // Override dynamic padding if provided
  className?: string;
  header?: React.ReactNode;
  onScroll?: (e: React.UIEvent<HTMLDivElement>) => void;
  /** Enable keyboard navigation (arrow keys, Enter, Shift+F10) */
  keyboardNav?: boolean;
  /** Called when Enter is pressed on focused item */
  onItemActivate?: (index: number) => void;
  /** Called when Shift+Enter is pressed on focused item */
  onItemActivateSecondary?: (index: number) => void;
}

export function VirtualizedSortableList<T>({
  items,
  renderItem,
  onReorder,
  getItemId,
  itemHeight = 56,
  emptyState,
  paddingBottom,
  className = "",
  header,
  onScroll,
  keyboardNav = false,
  onItemActivate,
  onItemActivateSecondary,
}: VirtualizedSortableListProps<T>) {
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

  // Memoize callbacks to prevent virtualizer from recalculating unnecessarily
  const getScrollElement = useCallback(() => parentRef.current, []);
  const estimateSize = useCallback(() => itemHeight, [itemHeight]);

  // Virtualizer
  const virtualizer = useVirtualizer({
    count: items.length,
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
    onIndexChange: (index) => {
      if (keyboardNav && index >= 0) {
        virtualizer.scrollToIndex(index, { align: "center" });
      }
    },
  });

  // Re-focus after scroll to ensure the focused element is in the DOM
  useEffect(() => {
    if (!keyboardNav || roving.activeIndex < 0) return;
    virtualizer.scrollToIndex(roving.activeIndex, { align: "center" });
  }, [roving.activeIndex, keyboardNav, virtualizer]);

  // Auto-focus first item when keyboard nav is enabled
  useEffect(() => {
    if (keyboardNav && items.length > 0 && roving.activeIndex < 0) {
      roving.setActiveIndex(0);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [keyboardNav, items.length]);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      onReorder(active.id, over.id);
    }
  };

  const virtualItems = virtualizer.getVirtualItems();

  // Create a list of IDs for SortableContext
  // Ideally we should pass ALL items to SortableContext so it knows about everything?
  // But for performance with 1000+ items, we might need a strategy.
  // However, dnd-kit SortableContext primarily needs IDs for the current view.
  // Actually, for virtualization to work with DnD, we typically need to render the *virtual* items wrapped in SortableContext.
  const itemIds = items.map(getItemId);

  return (
    <div
      ref={parentRef}
      onScroll={onScroll}
      className={`flex-1 overflow-y-auto overflow-x-hidden ${className} scroll-mask-y ${
        items.length === 0 && isPlayerVisible ? "pb-player-bar" : ""
      }`}
    >
      <div
        style={{
          minHeight: "100%",
          display: "flex",
          flexDirection: "column",
        }}
      >
        {header && <div>{header}</div>}

        {items.length === 0 ? (
          emptyState || <EmptyPanel icon={ListMusic} title="No items" />
        ) : (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={itemIds}
              strategy={verticalListSortingStrategy}
            >
              <div
                role="list"
                style={{
                  height: `${virtualizer.getTotalSize() + bottomPadding}px`,
                  width: "100%",
                  position: "relative",
                }}
              >
                {virtualItems.map((virtualRow) => {
                  const item = items[virtualRow.index];
                  // We must ensure the item rendered uses useSortable hook
                  return (
                    <div
                      role="listitem"
                      key={getItemId(item)}
                      data-index={virtualRow.index}
                      ref={virtualizer.measureElement}
                      style={{
                        position: "absolute",
                        top: 0,
                        left: 0,
                        width: "100%",
                        height: `${virtualRow.size}px`,
                        transform: `translateY(${virtualRow.start}px)`,
                      }}
                    >
                      {(() => {
                        const rendered = renderItem(item, virtualRow.index);
                        if (!keyboardNav || !isValidElement(rendered)) return rendered;
                        return cloneElement(rendered, {
                          'data-item-index': virtualRow.index,
                          tabIndex: roving.getTabIndex(virtualRow.index),
                          className: cn(
                            (rendered.props as any)?.className,
                            "focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-ring rounded-md",
                            roving.activeIndex === virtualRow.index && "bg-accent/15 ring-1 ring-ring/30 rounded-md",
                          ),
                        } as any);
                      })()}
                    </div>
                  );
                })}
              </div>
            </SortableContext>
          </DndContext>
        )}
      </div>
    </div>
  );
}
