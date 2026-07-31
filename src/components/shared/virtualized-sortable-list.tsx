import { useRef, useCallback, isValidElement } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { useVirtualizerSetup } from "@/hooks/use-virtualizer-setup";
import { EmptyPanel } from "@/components/shared/empty-panel";
import { RovingTabindexProvider } from "@/hooks/use-roving-tabindex";
import { useInteractionStore } from "@/stores/interaction-store";
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

function useSortableSensors(effectiveKeyboardNav: boolean | undefined, disabled = false) {
  const pointerSensor = useSensor(PointerSensor);
  const keyboardSensor = useSensor(KeyboardSensor, {
    coordinateGetter: sortableKeyboardCoordinates,
  });
  return useSensors(
    ...(disabled ? [] : [pointerSensor]),
    ...(disabled || effectiveKeyboardNav ? [] : [keyboardSensor]),
  );
}

interface VirtualizedSortableListProps<T> {
  items: T[];
  renderItem: (item: T, index: number) => React.ReactNode;
  onReorder?: (activeId: string | number, overId: string | number) => void;
  getItemId: (item: T) => string | number;
  itemHeight?: number;
  emptyState?: React.ReactNode;
  paddingBottom?: string;
  className?: string;
  header?: React.ReactNode;
  onScroll?: (e: React.UIEvent<HTMLDivElement>) => void;
  /** Disable DnD interaction without unmounting items (e.g. during multi-select) */
  disabled?: boolean;
  keyboardNav?: boolean;
  onItemActivate?: (index: number) => void;
  onItemActivateSecondary?: (index: number) => void;
  autoFocus?: boolean;
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
  disabled = false,
  keyboardNav = false,
  onItemActivate,
  onItemActivateSecondary,
  autoFocus,
}: VirtualizedSortableListProps<T>) {
  const headerRef = useRef<HTMLDivElement>(null);

  const { parentRef, effectiveKeyboardNav, bottomPadding, getScrollElement, estimateSize, isPlayerVisible } = useVirtualizerSetup(
    itemHeight,
    paddingBottom,
    keyboardNav,
  );

  // Virtualizer
  const virtualizer = useVirtualizer({
    count: items.length,
    getScrollElement,
    estimateSize,
    overscan: 5,
  });

  const sensors = useSortableSensors(effectiveKeyboardNav, disabled);

  const onReorderRef = useRef(onReorder);
  onReorderRef.current = onReorder;

  const handleReorderKey = useCallback((fromIndex: number, toIndex: number) => {
    const currentItems = items;
    const fromId = getItemId(currentItems[fromIndex]);
    const toId = getItemId(currentItems[toIndex]);
    onReorderRef.current?.(fromId, toId);
  }, [items, getItemId]);

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      onReorderRef.current?.(active.id, over.id);
    }
  }, []);

  const handleIndexChange = useCallback((index: number) => {
    if (effectiveKeyboardNav && index >= 0) {
      const container = parentRef.current;
      if (!container) return;
      const headerHeight = headerRef.current?.offsetHeight ?? 0;
      const itemOffset = index * itemHeight + headerHeight;
      const viewportHeight = container.clientHeight;
      container.scrollTop = Math.max(0, itemOffset - viewportHeight / 2 + itemHeight / 2);
    }
  }, [effectiveKeyboardNav, parentRef, headerRef, itemHeight]);

  const virtualItems = virtualizer.getVirtualItems();

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
        {header && <div ref={headerRef}>{header}</div>}

        {items.length === 0 ? (
          emptyState || <EmptyPanel icon={ListMusic} title="No items" />
        ) : (
          <RovingTabindexProvider
            containerRef={parentRef}
            itemCount={effectiveKeyboardNav ? items.length : 0}
            enabled={!!effectiveKeyboardNav}
            autoFocus={autoFocus ?? (effectiveKeyboardNav && useInteractionStore.getState().focusSource === "keyboard")}
            direction="vertical"
            onActivate={onItemActivate}
            onActivateSecondary={onItemActivateSecondary}
            onIndexChange={handleIndexChange}
            onReorderKey={handleReorderKey}
          >
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
                          if (!isValidElement(rendered)) return rendered;
                          return rendered;
                        })()}
                      </div>
                    );
                  })}
                </div>
            </SortableContext>
          </DndContext>
          </RovingTabindexProvider>
        )}
      </div>
    </div>
  );
}
