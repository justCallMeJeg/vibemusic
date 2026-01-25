import { useRef, useMemo, useCallback } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { useScrollMask } from "@/hooks/use-scroll-mask";
import { useIsPlayerVisible } from "@/stores/audio-store";
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
}: VirtualizedSortableListProps<T>) {
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
  const itemIds = useMemo(() => items.map(getItemId), [items, getItemId]);

  return (
    <div
      ref={parentRef}
      onScroll={onScroll}
      className={`flex-1 overflow-y-auto ${className} scroll-mask-y custom-scrollbar`}
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
          emptyState || (
            <div className="flex items-center justify-center flex-1 text-muted-foreground p-8">
              No items
            </div>
          )
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
                style={{
                  height: `${virtualizer.getTotalSize() + bottomPadding}px`,
                  width: "100%",
                  position: "relative",
                  transition: "height 300ms ease-in-out",
                }}
              >
                {virtualItems.map((virtualRow) => {
                  const item = items[virtualRow.index];
                  // We must ensure the item rendered uses useSortable hook
                  return (
                    <div
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
                      {renderItem(item, virtualRow.index)}
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
