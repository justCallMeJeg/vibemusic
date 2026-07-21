import { useDetailScroll } from "@/components/shared/scroll-context";
import { VirtualizedList } from "@/components/shared/virtualized-list";
import { VirtualizedSortableList } from "@/components/shared/virtualized-sortable-list";
import { TrackListHeader, type TrackListHeaderProps } from "@/components/shared/track-list-header";
import { AppBreadcrumb } from "@/components/shared/app-breadcrumb";

interface TrackListProps<T> {
  tracks: T[];
  renderItem: (item: T, index: number) => React.ReactNode;

  /** Content rendered between breadcrumb and TrackListHeader */
  headerContent?: React.ReactNode;
  /** Content rendered after headerContent but before TrackListHeader */
  headerExtras?: React.ReactNode;

  /** Enable sortable mode (renders VirtualizedSortableList) */
  sortable?: boolean;
  onReorder?: (activeId: string | number, overId: string | number) => void;
  getItemId?: (item: T) => string | number;

  /** TrackListHeader configuration */
  showTrackListHeader?: boolean;
  trackListHeaderProps?: Partial<TrackListHeaderProps>;

  /** Empty state shown when tracks is empty and no header is rendered */
  emptyState?: React.ReactNode;

  /** Header height for the virtualizer offset (non-sortable only) */
  headerHeight?: number;

  className?: string;

  /** Enable keyboard navigation (arrow keys, Enter, Shift+F10) */
  keyboardNav?: boolean;
  /** Called when Enter is pressed on focused item */
  onItemActivate?: (index: number) => void;
  /** Called when Shift+Enter is pressed on focused item */
  onItemActivateSecondary?: (index: number) => void;
  /** Called when Shift+F10 or ContextMenu key on focused item */
  onItemContextMenu?: (index: number) => void;
}

export function TrackList<T>({
  tracks,
  renderItem,
  headerContent,
  headerExtras,
  sortable = false,
  onReorder,
  getItemId,
  showTrackListHeader = true,
  trackListHeaderProps,
  emptyState,
  headerHeight = 320,
  className,
  keyboardNav = false,
  onItemActivate,
  onItemActivateSecondary,
  onItemContextMenu,
}: TrackListProps<T>) {
  const onScroll = useDetailScroll();

  const header = (
    <div className="w-full min-w-0 flex flex-col">
      <div className="flex items-center gap-2 mt-8 pb-4">
        <AppBreadcrumb />
      </div>
      {headerContent}
      {headerExtras}
      {showTrackListHeader && tracks.length > 0 && (
        <TrackListHeader {...(trackListHeaderProps as TrackListHeaderProps)} />
      )}
    </div>
  );

  if (sortable) {
    return (
      <VirtualizedSortableList
        items={tracks}
        onScroll={onScroll}
        header={header}
        onReorder={onReorder!}
        getItemId={getItemId!}
        renderItem={renderItem}
        emptyState={emptyState}
        className={className}
        keyboardNav={keyboardNav}
        onItemActivate={onItemActivate}
        onItemActivateSecondary={onItemActivateSecondary}
        onItemContextMenu={onItemContextMenu}
      />
    );
  }

  return (
    <VirtualizedList
      items={tracks}
      onScroll={onScroll}
      headerHeight={headerHeight}
      header={header}
      renderItem={renderItem}
      emptyState={emptyState}
      className={className}
      keyboardNav={keyboardNav}
      onItemActivate={onItemActivate}
      onItemActivateSecondary={onItemActivateSecondary}
      onItemContextMenu={onItemContextMenu}
    />
  );
}
