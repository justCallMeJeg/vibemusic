import { useRef, useCallback, isValidElement } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { useScrollMask } from "@/hooks/use-scroll-mask";
import { PLAYER_BAR_HEIGHT } from "@/lib/constants";
import { useIsPlayerVisible } from "@/stores/audio-store";
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
  /** Override default auto-focus behavior */
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
  keyboardNav = false,
  onItemActivate,
  onItemActivateSecondary,
  autoFocus,
}: VirtualizedSortableListProps<T>) {
  const parentRef = useRef<HTMLDivElement>(null);
  const headerRef = useRef<HTMLDivElement>(null);

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

  const keyboardSensor = useSensor(KeyboardSensor, {
    coordinateGetter: sortableKeyboardCoordinates,
  });
  const sensors = useSensors(
    useSensor(PointerSensor),
    ...(keyboardNav ? [] : [keyboardSensor]),
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      onReorder(active.id, over.id);
    }
  };

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
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={itemIds}
              strategy={verticalListSortingStrategy}
            >
              <RovingTabindexProvider
                containerRef={parentRef}
                itemCount={keyboardNav ? items.length : 0}
                enabled={!!keyboardNav}
                autoFocus={autoFocus ?? (keyboardNav && useInteractionStore.getState().focusSource === "keyboard")}
                direction="vertical"
                onActivate={onItemActivate}
                onActivateSecondary={onItemActivateSecondary}
                onIndexChange={(index: number) => {
                  if (keyboardNav && index >= 0) {
                    const container = parentRef.current;
                    if (!container) return;
                    const headerHeight = headerRef.current?.offsetHeight ?? 0;
                    const itemOffset = index * itemHeight + headerHeight;
                    const viewportHeight = container.clientHeight;
                    container.scrollTop = Math.max(0, itemOffset - viewportHeight / 2 + itemHeight / 2);
                  }
                }}
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
              </RovingTabindexProvider>
            </SortableContext>
          </DndContext>
        )}
      </div>
    </div>
  );
}
