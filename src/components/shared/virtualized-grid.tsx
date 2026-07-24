import {
  useRef,
  useState,
  useEffect,
  useMemo,
  useCallback,
  isValidElement,
} from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { useScrollMask } from "@/hooks/use-scroll-mask";
import { debounce, cn } from "@/lib/utils";
import { PLAYER_BAR_HEIGHT } from "@/lib/constants";
import { useIsPlayerVisible } from "@/stores/audio-store";
import { EmptyPanel } from "@/components/shared/empty-panel";
import { RovingTabindexProvider } from "@/hooks/use-roving-tabindex";
import { useInteractionStore } from "@/stores/interaction-store";
import { useSettingsStore } from "@/stores/settings-store";
import { ListMusic } from "lucide-react";

interface VirtualizedGridProps<T> {
  items: T[];
  renderItem: (item: T, index: number) => React.ReactNode;
  itemHeight?: number;
  emptyState?: React.ReactNode;
  paddingBottom?: string;
  className?: string;
  /** Enable keyboard navigation (arrow keys, Enter) */
  keyboardNav?: boolean;
  /** Called when Enter is pressed on focused item */
  onItemActivate?: (index: number) => void;
  /** Called when Shift+Enter is pressed on focused item */
  onItemActivateSecondary?: (index: number) => void;
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
    window.addEventListener("resize", debouncedUpdateColumns, {
      passive: true,
    });
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
  keyboardNav = false,
  onItemActivate,
  onItemActivateSecondary,
}: VirtualizedGridProps<T>) {
  const parentRef = useRef<HTMLDivElement>(null);

  const keyboardNavSetting = useSettingsStore(
    (s) => s.experimentalFeatures.keyboardNav,
  );
  const effectiveKeyboardNav = keyboardNav && keyboardNavSetting;

  // Dynamic padding based on player visibility
  const isPlayerVisible = useIsPlayerVisible();
  const bottomPadding = paddingBottom
    ? parseInt(paddingBottom, 10)
    : isPlayerVisible
      ? PLAYER_BAR_HEIGHT
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
      role="list"
      className={cn(
        "flex-1 overflow-y-auto px-2 scroll-mask-y",
        className,
        items.length === 0 && "flex flex-col",
        items.length === 0 && isPlayerVisible && "pb-player-bar",
      )}
    >
      {items.length === 0 ? (
        emptyState || <EmptyPanel icon={ListMusic} title="No items found" />
      ) : (
        <RovingTabindexProvider
          containerRef={parentRef}
          itemCount={effectiveKeyboardNav ? items.length : 0}
          enabled={!!effectiveKeyboardNav}
          autoFocus={effectiveKeyboardNav && useInteractionStore.getState().focusSource === "keyboard"}
          direction="grid"
          columns={columns}
          onActivate={onItemActivate}
          onActivateSecondary={onItemActivateSecondary}
          onIndexChange={(index: number) => {
            if (effectiveKeyboardNav && index >= 0) {
              const rowIndex = Math.floor(index / columns);
              virtualizer.scrollToIndex(rowIndex, { align: "center" });
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
            {virtualizer.getVirtualItems().map((virtualRow) => {
              const startIndex = virtualRow.index * columns;
              const rowItems = items.slice(startIndex, startIndex + columns);

              return (
                <div
                  role="listitem"
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
                  {rowItems.map((item, colIdx) => {
                    const itemIndex = startIndex + colIdx;
                    const rendered = renderItem(item, itemIndex);
                    if (!isValidElement(rendered)) return rendered;
                    return rendered;
                  })}
                </div>
              );
            })}
          </div>
        </RovingTabindexProvider>
      )}
    </div>
  );
}
