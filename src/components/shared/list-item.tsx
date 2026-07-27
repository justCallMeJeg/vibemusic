import { memo, useRef, type ReactNode } from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";
import { ArtworkImage } from "@/components/shared/artwork-image";
import { ScrollingText } from "@/components/shared/scrolling-text";
import { Play, Pause, Heart } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { UnifiedContextMenu } from "@/components/shared/unified-context-menu";
import { useTrackContextMenu } from "@/hooks/use-track-context-menu";
import type { TrackMenuActions } from "@/components/shared/context-menu-types";
import { useRovingTabindexContext } from "@/hooks/use-roving-tabindex";
import { useSelection } from "@/hooks/use-selection";
import { useSelectionStore } from "@/stores/selection-store";

const rowVariants = cva(
  "mx-0.5 group flex items-center gap-3 rounded-md p-2 cursor-default select-none relative debug-list-item",
  {
    variants: {
      variant: {
        default: "hover:bg-accent/10",
        indexed: "hover:bg-accent/10",
        compact: "hover:bg-accent/10",
        detailed: "hover:bg-accent/10 p-2",
      },
      active: {
        true: "bg-accent/20 text-accent-foreground outline outline-1 outline-border",
        false: "",
      },
    },
    defaultVariants: {
      variant: "default",
      active: false,
    },
  },
);

const PlayPauseIcon = memo(function PlayPauseIcon({
  isPlaying = false,
  className = "",
}: {
  isPlaying?: boolean;
  className?: string;
}) {
  const Icon = isPlaying ? Pause : Play;
  return <Icon size={16} fill="currentColor" className={className} />;
});

interface IndexedColumnProps {
  index?: number;
  isActive?: boolean;
  isPlaying?: boolean;
  onPlay?: (e: React.MouseEvent) => void;
  /** When "checkbox", renders a Checkbox for batch selection mode */
  mode?: "index" | "checkbox";
  isChecked?: boolean;
  onToggleCheck?: () => void;
}

const IndexedColumn = memo(function IndexedColumn({
  index,
  isActive = false,
  isPlaying = false,
  mode = "index",
  isChecked = false,
  onToggleCheck,
}: IndexedColumnProps) {
  if (mode === "checkbox") {
    return (
      <div
        className="w-8 flex justify-center shrink-0"
        data-checkbox-column="true"
      >
        <Checkbox checked={isChecked} onCheckedChange={onToggleCheck} />
      </div>
    );
  }
  return (
    <div className="w-8 flex justify-center shrink-0 text-muted-foreground text-sm font-variant-numeric tabular-nums">
      {!isActive ? (
        <>
          <span className="group-hover:hidden">{index ?? null}</span>
          <span
            aria-label="Play"
            className="hidden group-hover:block text-foreground"
          >
            <Play size={16} fill="currentColor" />
          </span>
        </>
      ) : (
        <>
          <span className="group-hover:hidden text-primary">
            <Pause size={16} fill="currentColor" />
          </span>
          <span
            aria-label={isActive && isPlaying ? "Pause" : "Play"}
            className="hidden group-hover:block text-foreground"
          >
            <PlayPauseIcon isPlaying={isActive && isPlaying} />
          </span>
        </>
      )}
    </div>
  );
});

interface ArtworkWithOverlayProps {
  src?: string | null;
  alt?: string;
  isActive?: boolean;
  isPlaying?: boolean;
  onPlay?: (e: React.MouseEvent) => void;
  circular?: boolean;
  placeholderType?: "artist" | "playlist" | "track";
}

const ArtworkWithOverlay = memo(function ArtworkWithOverlay({
  src,
  alt,
  isActive = false,
  isPlaying = false,
  onPlay,
  circular = false,
  placeholderType = "track",
}: ArtworkWithOverlayProps) {
  const showOverlay = onPlay || isActive;
  return (
    <div className="relative shrink-0">
      <ArtworkImage
        src={src}
        alt={alt || "Artwork"}
        placeholderType={placeholderType}
        className={cn(
          "w-10 h-10 object-cover bg-secondary",
          circular ? "rounded-full" : "rounded shadow-sm",
        )}
      />
      {showOverlay && (
        <div
          className={cn(
            "absolute inset-0 bg-black/40 flex items-center justify-center rounded transition-opacity",
            circular && "rounded-full",
            isActive ? "opacity-100" : "opacity-0 group-hover:opacity-100",
          )}
        >
          <PlayPauseIcon
            isPlaying={isPlaying}
            className="fill-white text-white"
          />
        </div>
      )}
    </div>
  );
});

interface ListItemProps
  extends
    Omit<
      React.HTMLAttributes<HTMLDivElement>,
      "title" | "onClick" | "onPointerDown" | "prefix" | "suffix" | "itemId"
    >,
    VariantProps<typeof rowVariants> {
  title: string | React.ReactNode;
  subtitle?: string | React.ReactNode;
  artworkSrc?: string;
  index?: number;
  trailing?: React.ReactNode;
  showArtwork?: boolean;
  isPlaying?: boolean;
  artworkCircular?: boolean;

  placeholderType?: "artist" | "track";
  onClick?: (e: React.MouseEvent) => void;
  menuActions?: TrackMenuActions;
  onToggleLike?: () => void;
  isLiked?: boolean;

  /**
   * Index within the parent list for arrow-key sibling navigation.
   */
  dataItemIndex?: number;

  selectable?: boolean;
  itemId?: number;
  /** When true, hides the internal IndexedColumn checkbox even during checkbox mode. Use when parent renders its own checkbox externally. */
  hideCheckboxColumn?: boolean;
  /** When provided, overrides the internal checkboxMode subscription. Use to avoid mass re-renders. */
  checkboxMode?: boolean;
  isSelected?: boolean;
  prefix?: ReactNode;
  suffix?: ReactNode;
}

export const ListItem = memo(function ListItem({
  title,
  subtitle,
  artworkSrc,
  index,
  trailing,
  variant,
  active,
  className,
  showArtwork = true,
  isPlaying = false,
  artworkCircular,

  placeholderType,
  onClick,
  menuActions,
  onToggleLike,
  isLiked,
  dataItemIndex,
  selectable,
  itemId,
  checkboxMode: checkboxModeProp,
  hideCheckboxColumn,
  isSelected: isSelectedProp,
  prefix,
  suffix,
  ...props
}: ListItemProps) {
  const roving = useRovingTabindexContext();
  const rovingTabIndex =
    dataItemIndex !== undefined
      ? roving?.getTabIndex(dataItemIndex)
      : undefined;
  const isRovingActive =
    dataItemIndex !== undefined && roving?.activeIndex === dataItemIndex;
  const resolvedTabIndex =
    rovingTabIndex !== undefined
      ? rovingTabIndex
      : dataItemIndex !== undefined && !!roving
        ? -1
        : undefined;

  const internal = useSelection({
    itemId: itemId ?? dataItemIndex ?? 0,
    index: dataItemIndex ?? 0,
  });

  const { isSelected: selIsSelected, onClick: selectionOnClick } = internal;

  const isSelected = isSelectedProp ?? selIsSelected;
  const subscribedCheckboxMode = useSelectionStore(
    (s) => s.mode === "checkbox",
  );
  const checkboxMode = checkboxModeProp ?? subscribedCheckboxMode;
  const resolvedToggleLike = menuActions?.onToggleLike ?? onToggleLike;
  const resolvedIsLiked = menuActions?.isLiked ?? isLiked;

  const pointerDownHandled = useRef(false);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if ((e.key === "l" || e.key === "L") && resolvedToggleLike) {
      e.stopPropagation();
      resolvedToggleLike();
    }
  };

  const handleClick = (e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    if (target.closest('[data-checkbox-column="true"]')) return;
    if (pointerDownHandled.current) {
      pointerDownHandled.current = false;
      return;
    }
    if (selectable && (checkboxMode || e.ctrlKey || e.shiftKey || e.metaKey)) {
      selectionOnClick(e);
      return;
    }
    onClick?.(e);
  };

  const handlePointerDown = (e: React.PointerEvent) => {
    const target = e.target as HTMLElement;
    if (target.closest('[data-checkbox-column="true"]')) return;
    if (selectable && (checkboxMode || e.ctrlKey || e.shiftKey || e.metaKey)) {
      selectionOnClick(e as unknown as React.MouseEvent);
      pointerDownHandled.current = true;
    }
  };

  const row = (
    <div
      {...props}
      data-active={active}
      data-item-index={dataItemIndex}
      onPointerDown={handlePointerDown}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      role={onClick ? "button" : undefined}
      className={cn(
        rowVariants({ variant, active }),
        !checkboxMode && "transition-colors",
        isRovingActive && "bg-accent/15 ring-1 ring-ring/30 rounded-md",
        isSelected && "bg-accent/20",
        "focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring rounded-md",
        onClick && "cursor-pointer",
        className,
      )}
      {...(resolvedTabIndex !== undefined
        ? { tabIndex: resolvedTabIndex }
        : {})}
    >
      {(variant === "indexed" || (checkboxMode && !hideCheckboxColumn)) && (
        <IndexedColumn
          index={index}
          isActive={!!active}
          isPlaying={isPlaying}
          mode={checkboxMode ? "checkbox" : "index"}
          isChecked={isSelected}
          onToggleCheck={() =>
            useSelectionStore
              .getState()
              .toggle(itemId ?? dataItemIndex ?? 0, dataItemIndex ?? 0)
          }
        />
      )}

      {checkboxMode ? null : prefix}

      {showArtwork && (
        <div
          className={cn(
            "relative shrink-0",
            variant !== "indexed" && "w-10 h-10",
          )}
        >
          <ArtworkWithOverlay
            src={artworkSrc}
            alt={typeof title === "string" ? title : "Artwork"}
            isActive={!!active}
            isPlaying={isPlaying}
            onPlay={handleClick}
            circular={artworkCircular}
            placeholderType={placeholderType || "track"}
          />
        </div>
      )}

      <div className="flex-1 min-w-0 flex flex-col justify-center">
        <div
          className={cn(
            "text-sm font-medium truncate",
            active && "text-primary font-bold",
            "w-full",
          )}
        >
          {typeof title === "string" ? (
            <ScrollingText>{title}</ScrollingText>
          ) : (
            title
          )}
        </div>
        {subtitle && (
          <div className="text-xs text-muted-foreground truncate">
            {subtitle}
          </div>
        )}
      </div>

      {checkboxMode ? null : suffix}

      <div className="flex items-center gap-2 shrink-0 text-muted-foreground text-sm">
        {resolvedToggleLike && (
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); resolvedToggleLike(); }}
            className={cn(
              "flex items-center justify-center size-7 rounded-full border border-border/50 hover:bg-accent/20 transition-all",
              resolvedIsLiked || isRovingActive ? "opacity-100" : "opacity-0 group-hover:opacity-100",
              "focus-visible:outline-2 focus-visible:outline-ring",
            )}
            aria-label={resolvedIsLiked ? "Unlike" : "Like"}
          >
            <Heart
              size={14}
              className={cn(
                "transition-colors",
                resolvedIsLiked ? "fill-red-500 text-red-500" : "text-muted-foreground",
              )}
            />
          </button>
        )}
        {trailing}
      </div>
    </div>
  );

  const menuItems = useTrackContextMenu({
    onPlay: menuActions?.onPlay,
    onPause: menuActions?.onPause,
    onShuffle: menuActions?.onShuffle,
    onPlayNext: menuActions?.onPlayNext,
    onAddToQueue: menuActions?.onAddToQueue,
    onAddToPlaylist: menuActions?.onAddToPlaylist,
    onEdit: menuActions?.onEdit,
    onDelete: menuActions?.onDelete,
    onToggleLike: menuActions?.onToggleLike ?? onToggleLike,
    isLiked: menuActions?.isLiked ?? isLiked,
    playlists: menuActions?.playlists,
  });

  if (menuItems.length > 0) {
    return <UnifiedContextMenu items={menuItems}>{row}</UnifiedContextMenu>;
  }

  return row;
});
