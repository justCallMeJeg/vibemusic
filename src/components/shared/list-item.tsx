import { memo } from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";
import { ArtworkImage } from "@/components/shared/artwork-image";
import { ScrollingText } from "@/components/shared/scrolling-text";
import { Play, Pause } from "lucide-react";
import { UnifiedContextMenu } from "@/components/shared/unified-context-menu";
import { useTrackContextMenu } from "@/hooks/use-track-context-menu";
import type { TrackMenuActions } from "@/components/shared/context-menu-types";
import { useRovingTabindexContext } from "@/hooks/use-roving-tabindex";

const rowVariants = cva(
  "mx-0.5 group flex items-center gap-3 rounded-md p-2 transition-colors cursor-default select-none relative debug-list-item",
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
  onPlay?: () => void;
}

const IndexedColumn = memo(function IndexedColumn({
  index,
  isActive = false,
  isPlaying = false,
}: IndexedColumnProps) {
  return (
    <div className="w-8 flex justify-center shrink-0 text-muted-foreground text-sm font-variant-numeric tabular-nums">
      {!isActive ? (
        <>
          <span className="group-hover:hidden">
            {index ?? null}
          </span>
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
  onPlay?: () => void;
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
          <PlayPauseIcon isPlaying={isPlaying} className="fill-white text-white" />
        </div>
      )}
    </div>
  );
});

interface ListItemProps
  extends
    Omit<React.HTMLAttributes<HTMLDivElement>, "title" | "onClick">,
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
  onClick?: () => void;
  menuActions?: TrackMenuActions;

  /**
   * Index within the parent list for arrow-key sibling navigation.
   */
  dataItemIndex?: number;
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
  dataItemIndex,
  ...props
}: ListItemProps) {
  const roving = useRovingTabindexContext();
  const rovingTabIndex = dataItemIndex !== undefined ? roving?.getTabIndex(dataItemIndex) : undefined;
  const isRovingActive = dataItemIndex !== undefined && roving?.activeIndex === dataItemIndex;
  const resolvedTabIndex = rovingTabIndex !== undefined
    ? rovingTabIndex
    : (dataItemIndex !== undefined && !!roving ? -1 : undefined);

  const row = (
    <div
      {...props}
      data-active={active}
      data-item-index={dataItemIndex}
      onClick={onClick}
      role={onClick ? "button" : undefined}
      className={cn(
        rowVariants({ variant, active }),
        isRovingActive && "bg-accent/15 ring-1 ring-ring/30 rounded-md",
        "focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring rounded-md",
        onClick && "cursor-pointer",
        className,
      )}
      {...(resolvedTabIndex !== undefined ? { tabIndex: resolvedTabIndex } : {})}
    >
      {variant === "indexed" && (
        <IndexedColumn
          index={index}
          isActive={!!active}
          isPlaying={isPlaying}
        />
      )}

      {showArtwork && (
        <div className={cn("relative shrink-0", variant !== "indexed" && "w-10 h-10")}>
          <ArtworkWithOverlay
            src={artworkSrc}
            alt={typeof title === "string" ? title : "Artwork"}
            isActive={!!active}
            isPlaying={isPlaying}
            onPlay={onClick}
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

      {trailing && (
        <div className="flex items-center gap-2 shrink-0 text-muted-foreground text-sm">
          {trailing}
        </div>
      )}
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
    playlists: menuActions?.playlists,
  });

  if (menuItems.length > 0) {
    return (
      <UnifiedContextMenu items={menuItems}>{row}</UnifiedContextMenu>
    );
  }

  return row;
});
